import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WON_STATUSES } from '@/lib/constants'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

// Profitability analysis grouped by client and by category — helps Direksi
// identify which clients/event types are most profitable.
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Cross-division strategic view: Owner, Finance, and all Directors (division
  // directors included) see profitability/revenue across the whole company.
  const where = { status: { in: WON_STATUSES }, projectValue: { not: null } }

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true, code: true, name: true, category: true, projectValue: true,
      client: { select: { id: true, name: true } },
      budgetItems: { select: { quotedAmount: true, actualAmount: true } },
    },
  })

  const rows = projects.map(p => {
    const actualCost = p.budgetItems.reduce((sum, b) => sum + (b.actualAmount ?? b.quotedAmount ?? 0), 0)
    const margin = (p.projectValue || 0) - actualCost
    const marginPct = p.projectValue ? (margin / p.projectValue) * 100 : 0
    return {
      projectId: p.id,
      projectCode: p.code,
      projectName: p.name,
      clientId: p.client?.id || 'unknown',
      clientName: p.client?.name || 'Tanpa Klien',
      category: p.category,
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
  const byCategory = groupBy(r => ({ id: r.category, label: r.category }))

  const byProject = [...rows].sort((a, b) => b.margin - a.margin)

  return NextResponse.json({ byClient, byCategory, byProject })
}
