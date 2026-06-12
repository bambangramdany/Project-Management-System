import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { WON_STATUSES } from '@/lib/constants'
import { NextResponse } from 'next/server'

// High-level company-wide financial overview for Direksi/Management — shown
// only to Owner, Finance, and Directors (incl. Finance Director).
const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role) && !isFinanceDirector(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const fromParam = searchParams.get('from') || `${now.getFullYear()}-01`
  const toParam = searchParams.get('to') || `${now.getFullYear()}-12`

  const [fromY, fromM] = fromParam.split('-').map(Number)
  const [toY, toM] = toParam.split('-').map(Number)
  const rangeStart = new Date(fromY, (fromM || 1) - 1, 1)
  const rangeEnd = new Date(toY, (toM || 12), 1) // exclusive

  // Projects whose execution date (startDate, fallback briefDate) falls in range.
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

  // Opex within the same date range (by YYYY-MM period string)
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

  // Assets — company-wide, not date-ranged
  const assets = await prisma.asset.findMany({ select: { currentValue: true } })
  const totalNilaiAset = assets.reduce((sum, a) => sum + a.currentValue, 0)

  // Active debts — company-wide
  const activeDebts = await prisma.debt.findMany({
    where: { status: 'ACTIVE' },
    include: { payments: { where: { status: 'PENDING' } } },
  })
  const totalHutangAktif = activeDebts.reduce(
    (sum, d) => sum + d.payments.reduce((s, p) => s + p.principalAmount, 0), 0
  )
  const totalBungaPerBulan = activeDebts.reduce((sum, d) => sum + (d.monthlyInterest || 0), 0)

  return NextResponse.json({
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
  })
}
