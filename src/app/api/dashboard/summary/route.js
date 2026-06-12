import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewAllProjects, isFinanceDirector } from '@/lib/rbac'
import { computeProjectHealth } from '@/lib/health'
import { getCashPosition, getCashSummary, getDebtSummary, getFinanceOverview } from '@/lib/dashboardData'
import { NextResponse } from 'next/server'

// Combined dashboard payload: projects (with health) + the role-gated finance
// widgets (cash position/summary, debt summary, finance overview). Replaces
// 4-5 separate fetches with a single request + Promise.all on the server.
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const finDirector = isFinanceDirector(session.user)
  const { searchParams } = new URL(req.url)

  const where = {}
  if (!canViewAllProjects(role)) {
    where.OR = [
      { picId: session.user.id },
      { members: { some: { userId: session.user.id } } },
    ]
  }

  const tasks = {
    projects: prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, industry: true } },
        pic: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true, dueDate: true } },
        budgetItems: { select: { quotedAmount: true, actualAmount: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  }

  if (role === 'OWNER' || role === 'FINANCE' || finDirector) {
    tasks.cashPosition = getCashPosition()
  } else if (role === 'DIRECTOR') {
    tasks.cashSummary = getCashSummary()
  }

  if (role === 'OWNER' || role === 'FINANCE' || role === 'DIRECTOR' || finDirector) {
    tasks.debtSummary = getDebtSummary()
    const now = new Date()
    const from = searchParams.get('from') || `${now.getFullYear()}-01`
    const to = searchParams.get('to') || `${now.getFullYear()}-12`
    tasks.overview = getFinanceOverview(from, to)
  }

  const keys = Object.keys(tasks)
  const results = await Promise.all(keys.map(k => tasks[k]))
  const out = {}
  keys.forEach((k, i) => { out[k] = results[i] })

  out.projects = out.projects.map(p => {
    const { tasks: _t, budgetItems: _b, ...rest } = p
    return { ...rest, health: computeProjectHealth(p) }
  })

  return NextResponse.json(out)
}
