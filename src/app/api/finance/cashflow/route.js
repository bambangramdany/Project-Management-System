import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

// Aggregated vendor-payment cashflow forecast across projects, grouped by month —
// gives Finance/Direksi a forward view of fund needs (Project.budgetItems.neededDate).
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where = {}
  if (session.user.role === 'DIRECTOR') {
    where.project = { division: session.user.divisi }
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

  // Group by YYYY-MM
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

  return NextResponse.json({ months: result, grandTotal })
}
