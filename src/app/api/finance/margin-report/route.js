import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WON_STATUSES } from '@/lib/constants'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

// Margin summary across won/active projects, grouped by division — gives Direksi/Owner
// a forward view of expected margin (project value vs. forecast/actual cost).
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where = { status: { in: WON_STATUSES }, projectValue: { not: null } }
  if (session.user.role === 'DIRECTOR') where.division = session.user.divisi

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true, code: true, name: true, division: true, status: true, projectValue: true,
      budgetItems: { select: { quotedAmount: true, actualAmount: true } },
    },
    orderBy: { code: 'asc' },
  })

  const rows = projects.map(p => {
    const forecastCost = p.budgetItems.reduce((sum, b) => sum + (b.quotedAmount || 0), 0)
    const actualCost = p.budgetItems.reduce((sum, b) => sum + (b.actualAmount ?? b.quotedAmount ?? 0), 0)
    return {
      id: p.id, code: p.code, name: p.name, division: p.division, status: p.status,
      projectValue: p.projectValue,
      forecastCost,
      actualCost,
      marginForecast: p.projectValue - forecastCost,
      marginActual: p.projectValue - actualCost,
    }
  })

  // Group by division
  const divisions = {}
  for (const r of rows) {
    if (!divisions[r.division]) divisions[r.division] = { division: r.division, projects: [], totalValue: 0, totalForecastCost: 0, totalActualCost: 0, totalMarginForecast: 0, totalMarginActual: 0 }
    const d = divisions[r.division]
    d.projects.push(r)
    d.totalValue += r.projectValue
    d.totalForecastCost += r.forecastCost
    d.totalActualCost += r.actualCost
    d.totalMarginForecast += r.marginForecast
    d.totalMarginActual += r.marginActual
  }

  return NextResponse.json({ divisions: Object.values(divisions) })
}
