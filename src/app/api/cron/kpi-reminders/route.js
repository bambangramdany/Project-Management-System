import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { canScoreKpi } from '@/lib/rbac'
import { KPI_BY_ROLE, KPI_DEADLINE_DAY, resolveKpiPeriod } from '@/lib/constants'
import { NextResponse } from 'next/server'

// Daily job: reminds evaluators (superiors / task givers) who haven't filled in
// KPI scores for their team members before the monthly deadline.
// Fires reminders at H-3 and on the deadline day itself.
// Triggered by Vercel Cron (see vercel.json) — protect with CRON_SECRET if set.
export async function GET(req) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const dayOfMonth = now.getDate()
  const isH3 = dayOfMonth === KPI_DEADLINE_DAY - 3
  const isDeadline = dayOfMonth === KPI_DEADLINE_DAY

  if (!isH3 && !isDeadline) {
    return NextResponse.json({ skipped: true, reason: 'not a reminder day' })
  }

  const period = resolveKpiPeriod(now)

  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true, divisi: true, jobTitle: true },
  })

  const existing = await prisma.kpiAssessment.findMany({
    where: { period },
    select: { userId: true, evaluatorId: true, kpiKey: true },
  })
  const filledSet = new Set(existing.map(a => `${a.evaluatorId}:${a.userId}:${a.kpiKey}`))

  const when = isDeadline ? 'HARI INI (deadline)' : `${KPI_DEADLINE_DAY - 3} hari lagi (H-3)`
  let notified = 0

  for (const evaluator of users) {
    const pendingTargets = []
    for (const target of users) {
      const items = KPI_BY_ROLE[target.role]
      if (!items || items.length === 0) continue
      if (!canScoreKpi(evaluator, target)) continue
      const allFilled = items.every(it => filledSet.has(`${evaluator.id}:${target.id}:${it.key}`))
      if (!allFilled) pendingTargets.push(target.name)
    }
    if (pendingTargets.length > 0) {
      await notifyUser({
        userId: evaluator.id,
        type: 'KPI_REMINDER',
        title: `Pengisian KPI ${when}`,
        message: `Anda belum mengisi KPI periode ${period} untuk: ${pendingTargets.join(', ')}. Batas waktu tanggal ${KPI_DEADLINE_DAY}.`,
        link: '/workload',
      })
      notified++
    }
  }

  return NextResponse.json({ notified, period, when })
}
