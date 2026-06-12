import { prisma } from '@/lib/prisma'
import { WON_STATUSES } from '@/lib/constants'

// Shared data-fetching helpers used by both the individual API routes
// (/api/cashflow/position, /api/cashflow/summary, /api/debts/summary,
// /api/finance/overview) and the combined /api/dashboard/summary endpoint,
// so the dashboard can load everything in one request instead of several.

// Cash position summary: how much is pending approval, ready to pay, paid this
// month, and what's coming up in the next 14 days based on budget item due dates.
export async function getCashPosition() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [pendingOwner, pendingFinanceDirector, readyToPay, paidThisMonthAgg, cashAgg] = await Promise.all([
    prisma.paymentRequest.aggregate({ where: { status: 'PENDING_OWNER' }, _sum: { amount: true }, _count: true }),
    prisma.paymentRequest.aggregate({ where: { status: 'PENDING_FINANCE_DIRECTOR' }, _sum: { amount: true }, _count: true }),
    prisma.paymentRequest.aggregate({ where: { status: 'APPROVED_BY_DIRECTOR' }, _sum: { amount: true }, _count: true }),
    prisma.paymentRequest.aggregate({
      where: { status: 'PAID', paidAt: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.cashTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
  ])

  const totalIn = cashAgg.find(a => a.type === 'IN')?._sum.amount || 0
  const totalOut = cashAgg.find(a => a.type === 'OUT')?._sum.amount || 0
  const cashBalance = totalIn - totalOut

  // Upcoming budget items due within 14 days that haven't been paid yet
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const upcomingItems = await prisma.projectBudgetItem.findMany({
    where: {
      neededDate: { gte: now, lte: horizon },
    },
    include: {
      project: { select: { id: true, code: true, name: true, division: true } },
      payments: { select: { status: true } },
    },
    orderBy: { neededDate: 'asc' },
  })

  const upcoming = upcomingItems
    .filter(it => !it.payments.some(p => p.status === 'PAID'))
    .map(it => ({
      id: it.id,
      label: it.label,
      amount: it.actualAmount ?? it.quotedAmount,
      neededDate: it.neededDate,
      project: it.project,
      hasPendingPayment: it.payments.some(p => ['PENDING_OWNER', 'PENDING_FINANCE_DIRECTOR', 'APPROVED_BY_DIRECTOR'].includes(p.status)),
    }))

  return {
    cashBalance,
    pendingApproval: {
      amount: (pendingOwner._sum.amount || 0) + (pendingFinanceDirector._sum.amount || 0),
      count: pendingOwner._count + pendingFinanceDirector._count,
    },
    readyToPay: {
      amount: readyToPay._sum.amount || 0,
      count: readyToPay._count,
    },
    paidThisMonth: {
      amount: paidThisMonthAgg._sum.amount || 0,
      count: paidThisMonthAgg._count,
    },
    upcoming,
  }
}

// Lightweight, read-only cash condition summary for division directors —
// just the actual cash balance and total funds requested but not yet paid out.
export async function getCashSummary() {
  const [cashAgg, outstandingAgg] = await Promise.all([
    prisma.cashTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
    prisma.paymentRequest.aggregate({
      where: { status: { in: ['PENDING_OWNER', 'PENDING_FINANCE_DIRECTOR', 'APPROVED_BY_DIRECTOR'] } },
      _sum: { amount: true },
    }),
  ])

  const totalIn = cashAgg.find(a => a.type === 'IN')?._sum.amount || 0
  const totalOut = cashAgg.find(a => a.type === 'OUT')?._sum.amount || 0

  return {
    cashBalance: totalIn - totalOut,
    pendingDisbursement: outstandingAgg._sum.amount || 0,
  }
}

export async function getDebtSummary() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const activeDebts = await prisma.debt.findMany({
    where: { status: 'ACTIVE' },
    include: { payments: { where: { status: 'PENDING' } } },
  })

  const outstandingPrincipal = activeDebts.reduce(
    (sum, d) => sum + d.payments.reduce((s, p) => s + p.principalAmount, 0), 0
  )

  const dueThisMonth = await prisma.debtPayment.findMany({
    where: { status: 'PENDING', dueDate: { gte: startOfMonth, lt: endOfMonth } },
    include: { debt: { select: { lenderName: true } } },
    orderBy: { dueDate: 'asc' },
  })

  const overdue = await prisma.debtPayment.findMany({
    where: { status: 'PENDING', dueDate: { lt: startOfMonth } },
    include: { debt: { select: { lenderName: true } } },
    orderBy: { dueDate: 'asc' },
  })

  const monthlyObligation = dueThisMonth.reduce((s, p) => s + p.principalAmount + p.interestAmount, 0)
    + overdue.reduce((s, p) => s + p.principalAmount + p.interestAmount, 0)

  return {
    outstandingPrincipal,
    activeDebtCount: activeDebts.length,
    monthlyObligation,
    dueThisMonth: dueThisMonth.map(p => ({
      id: p.id, debtId: p.debtId, lenderName: p.debt.lenderName, installmentNo: p.installmentNo,
      dueDate: p.dueDate, principalAmount: p.principalAmount, interestAmount: p.interestAmount,
    })),
    overdue: overdue.map(p => ({
      id: p.id, debtId: p.debtId, lenderName: p.debt.lenderName, installmentNo: p.installmentNo,
      dueDate: p.dueDate, principalAmount: p.principalAmount, interestAmount: p.interestAmount,
    })),
  }
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// High-level company-wide financial overview for Direksi/Management.
export async function getFinanceOverview(fromParam, toParam) {
  const now = new Date()
  fromParam = fromParam || `${now.getFullYear()}-01`
  toParam = toParam || `${now.getFullYear()}-12`

  const [fromY, fromM] = fromParam.split('-').map(Number)
  const [toY, toM] = toParam.split('-').map(Number)
  const rangeStart = new Date(fromY, (fromM || 1) - 1, 1)
  const rangeEnd = new Date(toY, (toM || 12), 1) // exclusive

  const allProjects = await prisma.project.findMany({
    where: { projectValue: { not: null } },
    select: {
      id: true, projectValue: true, status: true, pitchResult: true,
      startDate: true, briefDate: true,
      budgetItems: { select: { quotedAmount: true, actualAmount: true } },
    },
  })

  const inRange = (p) => {
    const d = p.startDate || p.briefDate
    if (!d) return false
    const dd = new Date(d)
    return dd >= rangeStart && dd < rangeEnd
  }

  const rangeProjects = allProjects.filter(inRange)
  const wonProjects = rangeProjects.filter(p => WON_STATUSES.includes(p.status))
  const loseProjects = rangeProjects.filter(p => p.pitchResult === 'LOSE')

  const totalOmset = wonProjects.reduce((sum, p) => sum + (p.projectValue || 0), 0)

  const ekspektasiProfit = wonProjects.reduce((sum, p) => {
    const forecastCost = p.budgetItems.reduce((s, b) => s + (b.quotedAmount || 0), 0)
    return sum + (p.projectValue || 0) - forecastCost
  }, 0)

  const aktualCostTotal = wonProjects.reduce((sum, p) => {
    return sum + p.budgetItems.reduce((s, b) => s + (b.actualAmount ?? b.quotedAmount ?? 0), 0)
  }, 0)

  const periods = []
  const cursor = new Date(rangeStart)
  while (cursor < rangeEnd) {
    periods.push(monthKey(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const opexEntries = await prisma.opexEntry.findMany({ where: { period: { in: periods } }, select: { amount: true } })
  const totalOpex = opexEntries.reduce((sum, e) => sum + e.amount, 0)

  const aktualNettProfit = (totalOmset - aktualCostTotal) - totalOpex

  const unpaidReceivables = await prisma.receivable.findMany({ where: { status: 'UNPAID' }, select: { amount: true } })
  const piutang = unpaidReceivables.reduce((sum, r) => sum + r.amount, 0)

  const pitchGagalValue = loseProjects.reduce((sum, p) => sum + (p.projectValue || 0), 0)
  const pitchGagalLostProfit = loseProjects.reduce((sum, p) => {
    const forecastCost = p.budgetItems.reduce((s, b) => s + (b.quotedAmount || 0), 0)
    return sum + (p.projectValue || 0) - forecastCost
  }, 0)

  const assets = await prisma.asset.findMany({ select: { currentValue: true } })
  const totalNilaiAset = assets.reduce((sum, a) => sum + a.currentValue, 0)

  const activeDebts = await prisma.debt.findMany({
    where: { status: 'ACTIVE' },
    include: { payments: { where: { status: 'PENDING' } } },
  })
  const totalHutangAktif = activeDebts.reduce(
    (sum, d) => sum + d.payments.reduce((s, p) => s + p.principalAmount, 0), 0
  )
  const totalBungaPerBulan = activeDebts.reduce((sum, d) => sum + (d.monthlyInterest || 0), 0)

  return {
    from: fromParam,
    to: toParam,
    totalOmset,
    ekspektasiProfit,
    aktualNettProfit,
    totalOpex,
    piutang: { amount: piutang, count: unpaidReceivables.length },
    pitchGagal: { value: pitchGagalValue, lostProfit: pitchGagalLostProfit, count: loseProjects.length },
    totalNilaiAset: { value: totalNilaiAset, count: assets.length },
    totalHutangAktif: { value: totalHutangAktif, monthlyInterest: totalBungaPerBulan, count: activeDebts.length },
  }
}
