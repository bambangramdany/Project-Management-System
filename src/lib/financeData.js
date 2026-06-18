import { prisma } from '@/lib/prisma'
import { WON_STATUSES } from '@/lib/constants'
import { isFinanceDirector } from '@/lib/rbac'

// Shared data-fetching helpers used by both the individual Finance API routes
// (/api/finance/cashflow, /api/finance/margin-report, /api/finance/profitability,
// /api/receivables) and the combined /api/finance/summary endpoint, so the
// Finance page can load everything in one request instead of several.

// Aggregated vendor-payment cashflow forecast across projects, grouped by month.
export async function getCashflowForecast(user) {
  const where = {}
  if (user.role === 'DIRECTOR') {
    where.project = { division: user.divisi }
  }

  const items = await prisma.projectBudgetItem.findMany({
    where: {
      ...where,
      neededDate: { not: null },
    },
    select: {
      id: true, label: true, quotedAmount: true, actualAmount: true, neededDate: true,
      project: { select: { id: true, code: true, name: true, division: true, status: true } },
    },
    orderBy: { neededDate: 'asc' },
  })

  const months = {}
  for (const item of items) {
    const d = new Date(item.neededDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!months[key]) months[key] = { month: key, total: 0, items: [] }
    const amount = item.actualAmount ?? item.quotedAmount
    months[key].total += amount
    months[key].items.push({
      id: item.id,
      label: item.label,
      amount,
      isActual: item.actualAmount !== null,
      neededDate: item.neededDate,
      project: item.project,
    })
  }

  const result = Object.values(months).sort((a, b) => a.month.localeCompare(b.month))
  const grandTotal = result.reduce((sum, m) => sum + m.total, 0)

  return { months: result, grandTotal }
}

// Margin summary across won/active projects, grouped by division.
export async function getMarginReport(user) {
  const where = { status: { in: WON_STATUSES }, projectValue: { not: null }, pitchResult: { not: 'LOSE' } }
  if (user.role === 'DIRECTOR' && !isFinanceDirector(user)) where.division = user.divisi

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true, code: true, name: true, division: true, status: true, projectValue: true,
      budgetItems: { select: { quotedAmount: true, actualAmount: true, isTitipan: true } },
    },
    orderBy: { code: 'asc' },
  })

  const rows = projects.map(p => {
    // Pisahkan budget murni vs titipan klien (pass-through)
    const murni = p.budgetItems.filter(b => !b.isTitipan)
    const titipan = p.budgetItems.filter(b => b.isTitipan)
    const titipanTotal = titipan.reduce((sum, b) => sum + (b.quotedAmount || 0), 0)
    // Revenue riil = project value - dana titipan klien
    const revenueRiil = (p.projectValue || 0) - titipanTotal
    const forecastCost = murni.reduce((sum, b) => sum + (b.quotedAmount || 0), 0)
    const actualCost = murni.reduce((sum, b) => sum + (b.actualAmount ?? b.quotedAmount ?? 0), 0)
    return {
      id: p.id, code: p.code, name: p.name, division: p.division, status: p.status,
      projectValue: p.projectValue,
      revenueRiil,
      titipanTotal,
      forecastCost,
      actualCost,
      marginForecast: revenueRiil - forecastCost,
      marginActual: revenueRiil - actualCost,
    }
  })

  const divisions = {}
  for (const r of rows) {
    if (!divisions[r.division]) divisions[r.division] = { division: r.division, projects: [], totalValue: 0, totalForecastCost: 0, totalActualCost: 0, totalMarginForecast: 0, totalMarginActual: 0 }
    const d = divisions[r.division]
    d.projects.push(r)
    d.totalValue += r.projectValue
    d.totalRevenueRiil = (d.totalRevenueRiil || 0) + r.revenueRiil
    d.totalTitipan = (d.totalTitipan || 0) + r.titipanTotal
    d.totalForecastCost += r.forecastCost
    d.totalActualCost += r.actualCost
    d.totalMarginForecast += r.marginForecast
    d.totalMarginActual += r.marginActual
  }

  return { divisions: Object.values(divisions) }
}

// Profitability analysis grouped by client and by category.
export async function getProfitability() {
  const where = { status: { in: WON_STATUSES }, projectValue: { not: null }, pitchResult: { not: 'LOSE' } }

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true, code: true, name: true, category: true, projectValue: true, division: true,
      client: { select: { id: true, name: true } },
      budgetItems: { select: { quotedAmount: true, actualAmount: true, isTitipan: true } },
    },
  })

  const rows = projects.map(p => {
    const murni = p.budgetItems.filter(b => !b.isTitipan)
    const titipanTotal = p.budgetItems.filter(b => b.isTitipan).reduce((sum, b) => sum + (b.quotedAmount || 0), 0)
    const revenueRiil = (p.projectValue || 0) - titipanTotal
    const actualCost = murni.reduce((sum, b) => sum + (b.actualAmount ?? b.quotedAmount ?? 0), 0)
    const margin = revenueRiil - actualCost
    const marginPct = revenueRiil ? (margin / revenueRiil) * 100 : 0
    return {
      projectId: p.id,
      projectCode: p.code,
      projectName: p.name,
      clientId: p.client?.id || 'unknown',
      clientName: p.client?.name || 'Tanpa Klien',
      category: p.category,
      division: p.division,
      projectValue: p.projectValue || 0,
      actualCost,
      margin,
      marginPct,
    }
  })

  function groupBy(keyFn) {
    const groups = {}
    for (const r of rows) {
      const key = keyFn(r)
      if (!groups[key.id]) groups[key.id] = { ...key, count: 0, totalValue: 0, totalCost: 0, totalMargin: 0 }
      const g = groups[key.id]
      g.count += 1
      g.totalValue += r.projectValue
      g.totalCost += r.actualCost
      g.totalMargin += r.margin
    }
    return Object.values(groups)
      .map(g => ({ ...g, marginPct: g.totalValue ? (g.totalMargin / g.totalValue) * 100 : 0 }))
      .sort((a, b) => b.totalMargin - a.totalMargin)
  }

  const byClient = groupBy(r => ({ id: r.clientId, label: r.clientName }))
  const byClientDivision = groupBy(r => ({ id: `${r.division}|${r.clientId}`, label: r.clientName, division: r.division }))
  const byCategory = groupBy(r => ({ id: r.category, label: r.category }))
  const byProject = [...rows].sort((a, b) => b.margin - a.margin)

  return { byClient, byClientDivision, byCategory, byProject }
}

// Receivables (piutang) list + totals.
export async function getReceivables(status) {
  const where = status && ['UNPAID', 'PAID'].includes(status) ? { status } : {}

  const receivables = await prisma.receivable.findMany({
    where,
    include: { project: { select: { id: true, code: true, name: true } } },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })

  const totalUnpaid = receivables.filter(r => r.status === 'UNPAID').reduce((s, r) => s + r.amount, 0)
  const totalPaid = receivables.filter(r => r.status === 'PAID').reduce((s, r) => s + r.amount, 0)

  return { receivables, totalUnpaid, totalPaid }
}
