/**
 * GET /api/finance/pnl?from=YYYY-MM&to=YYYY-MM
 *
 * P&L (Profit & Loss) per periode:
 *   Revenue         = Receivables (invoice) yang dibuat di periode ini
 *   HPP             = Paid PaymentRequests (paidAt) + DirectExpenses (date/createdAt)
 *   Gross Profit    = Revenue − HPP
 *   Opex            = OpexEntry entries dalam periode
 *   Net Profit      = Gross Profit − Opex
 *
 * Hanya untuk OWNER, FINANCE, DIRECTOR.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED = ['OWNER', 'FINANCE', 'DIRECTOR']

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-01`
  const defaultTo   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const from = searchParams.get('from') || defaultFrom
  const to   = searchParams.get('to')   || defaultTo

  const [fromYear, fromMonth] = from.split('-').map(Number)
  const [toYear,   toMonth]   = to.split('-').map(Number)
  const startDate = new Date(fromYear, fromMonth - 1, 1)
  const endDate   = new Date(toYear,   toMonth,       0, 23, 59, 59)

  const toPeriod = (date) => {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  // All data sources in parallel
  const [receivables, paidPRs, directExpenses, opexEntries] = await Promise.all([
    prisma.receivable.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { amount: true, status: true, createdAt: true },
    }),
    prisma.paymentRequest.findMany({
      where: { status: 'PAID', paidAt: { gte: startDate, lte: endDate } },
      select: { amount: true, paidAt: true, category: true },
    }),
    prisma.directExpense.findMany({
      where: {
        OR: [
          { date: { gte: startDate, lte: endDate } },
          { date: null, createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      select: { amount: true, date: true, createdAt: true, category: true },
    }),
    prisma.opexEntry.findMany({
      where: { period: { gte: from, lte: to } },
      select: { amount: true, period: true, category: true },
    }),
  ])

  // Build monthly buckets
  const months = {}
  const bucket = (period) => {
    if (!months[period]) months[period] = {
      period,
      revenue: 0, revenueCollected: 0,
      hpp: 0, hppPR: 0, hppDirect: 0,
      opex: 0,
      grossProfit: 0, grossMarginPct: 0,
      netProfit:   0, netMarginPct:   0,
    }
    return months[period]
  }

  for (const r of receivables) {
    const m = bucket(toPeriod(r.createdAt))
    m.revenue += r.amount
    if (r.status === 'PAID') m.revenueCollected += r.amount
  }
  for (const pr of paidPRs) {
    const m = bucket(toPeriod(pr.paidAt))
    m.hpp   += pr.amount
    m.hppPR += pr.amount
  }
  for (const de of directExpenses) {
    const m = bucket(toPeriod(de.date || de.createdAt))
    m.hpp       += de.amount
    m.hppDirect += de.amount
  }
  for (const op of opexEntries) {
    bucket(op.period).opex += op.amount
  }

  const rows = Object.values(months).sort((a, b) => a.period.localeCompare(b.period))
  for (const row of rows) {
    row.grossProfit    = row.revenue - row.hpp
    row.grossMarginPct = row.revenue > 0 ? (row.grossProfit / row.revenue) * 100 : 0
    row.netProfit      = row.grossProfit - row.opex
    row.netMarginPct   = row.revenue > 0 ? (row.netProfit / row.revenue) * 100 : 0
  }

  const totals = rows.reduce((acc, r) => ({
    revenue:          acc.revenue          + r.revenue,
    revenueCollected: acc.revenueCollected + r.revenueCollected,
    hpp:              acc.hpp              + r.hpp,
    hppPR:            acc.hppPR            + r.hppPR,
    hppDirect:        acc.hppDirect        + r.hppDirect,
    grossProfit:      acc.grossProfit      + r.grossProfit,
    opex:             acc.opex             + r.opex,
    netProfit:        acc.netProfit        + r.netProfit,
  }), { revenue: 0, revenueCollected: 0, hpp: 0, hppPR: 0, hppDirect: 0, grossProfit: 0, opex: 0, netProfit: 0 })

  totals.grossMarginPct = totals.revenue > 0 ? (totals.grossProfit / totals.revenue) * 100 : 0
  totals.netMarginPct   = totals.revenue > 0 ? (totals.netProfit   / totals.revenue) * 100 : 0

  // Opex category breakdown (full period)
  const opexByCategory = {}
  for (const op of opexEntries) {
    opexByCategory[op.category] = (opexByCategory[op.category] || 0) + op.amount
  }

  return NextResponse.json({ rows, totals, opexByCategory, from, to })
}
