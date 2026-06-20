import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewAllProjects, isFinanceDirector, CROSS_TEAM_PM_EMAIL } from '@/lib/rbac'
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

  // Full visibility on the dashboard is reserved for Owner/Direksi/Finance and
  // the cross-team PM (Wulan). Regular Project Managers only see projects
  // they're actually involved in (as PIC or member) — otherwise the dashboard
  // gets flooded with every project across both divisions, including ones
  // they have nothing to do with.
  const isCrossTeamPM = session.user.email === CROSS_TEAM_PM_EMAIL
  const where = {}
  if (!canViewAllProjects(role) || (role === 'PROJECT_MANAGER' && !isCrossTeamPM)) {
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

  // Hutang: OWNER, DIRECTOR, FINANCE (untuk keperluan PPh 21 dan laporan keuangan)
  if (role === 'OWNER' || role === 'DIRECTOR' || role === 'FINANCE' || finDirector) {
    tasks.debtSummary = getDebtSummary()
    const now = new Date()
    const from = searchParams.get('from') || `${now.getFullYear()}-01`
    const to = searchParams.get('to') || `${now.getFullYear()}-12`
    tasks.overview = getFinanceOverview(from, to)
    // Finance alerts: overdue receivables + pending payment requests
    tasks.piutangAlerts = prisma.receivable.aggregate({
      where: { status: 'UNPAID', dueDate: { lt: new Date() } },
      _count: { id: true },
      _sum: { amount: true },
    })
    tasks.pendingPRCount = prisma.paymentRequest.aggregate({
      where: { status: { startsWith: 'PENDING' } },
      _count: { id: true },
      _sum: { amount: true },
    })
  }

  const keys = Object.keys(tasks)
  const results = await Promise.all(keys.map(k => tasks[k]))
  const out = {}
  keys.forEach((k, i) => { out[k] = results[i] })

  out.projects = out.projects.map(p => {
    const { tasks: _t, budgetItems: _b, ...rest } = p
    return { ...rest, health: computeProjectHealth(p) }
  })

  if (out.piutangAlerts) {
    out.piutangAlerts = {
      count: out.piutangAlerts._count?.id   || 0,
      total: out.piutangAlerts._sum?.amount  || 0,
    }
  }
  if (out.pendingPRCount) {
    out.pendingPRCount = {
      count: out.pendingPRCount._count?.id   || 0,
      total: out.pendingPRCount._sum?.amount  || 0,
    }
  }

  return NextResponse.json(out)
}
