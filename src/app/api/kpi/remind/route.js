import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canScoreKpi, canViewKpiSummary } from '@/lib/rbac'
import { notifyUser } from '@/lib/notify'
import { resolveKpiPeriod } from '@/lib/constants'
import { NextResponse } from 'next/server'

// Reminds evaluators who have NOT YET submitted their monthly KPI
// assessments for the current period. People who already completed
// their evaluations receive nothing — only the laggards get pinged.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewKpiSummary(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const period = resolveKpiPeriod()
  const me = session.user

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, role: true, divisi: true },
  })

  // Evaluators in scope: Owner / Anung (Finance & HRGA Director) can remind
  // anyone; a division Director can only remind evaluators in their own division.
  const evaluators = (me.role === 'OWNER' || (me.role === 'DIRECTOR' && me.divisi === 'FINANCE_HRGA') || me.role === 'FINANCE')
    ? allUsers
    : allUsers.filter(u => u.divisi === me.divisi)

  const existing = await prisma.kpiAssessment.findMany({
    where: { period },
    select: { evaluatorId: true, userId: true },
  })
  const done = new Set(existing.map(a => `${a.evaluatorId}_${a.userId}`))

  const pendingByEvaluator = {}
  for (const evaluator of evaluators) {
    for (const target of allUsers) {
      if (!canScoreKpi(evaluator, target)) continue
      if (done.has(`${evaluator.id}_${target.id}`)) continue
      if (!pendingByEvaluator[evaluator.id]) pendingByEvaluator[evaluator.id] = { evaluator, targets: [] }
      pendingByEvaluator[evaluator.id].targets.push(target)
    }
  }

  const groups = Object.values(pendingByEvaluator)
  await Promise.all(groups.map(({ evaluator, targets }) => {
    const isOnlySelf = targets.length === 1 && targets[0].id === evaluator.id
    const names = targets.map(t => t.id === evaluator.id ? 'diri sendiri (self-assessment)' : t.name).join(', ')
    return notifyUser({
      userId: evaluator.id,
      type: 'KPI_REMINDER',
      title: 'Pengingat Penilaian KPI Bulanan',
      message: `Anda belum mengisi penilaian KPI periode ${period} untuk: ${names}.`,
      link: '/scores',
    })
  }))

  return NextResponse.json({ period, remindedCount: groups.length, pending: groups.map(g => ({ evaluator: g.evaluator.name, targets: g.targets.map(t => t.name) })) })
}
