import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { canScoreKpi } from '@/lib/rbac'
import { KPI_BY_ROLE, KPI_DEADLINE_DAY, resolveKpiPeriod } from '@/lib/constants'
import { NextResponse } from 'next/server'

// Daily job: reminds everyone about KPI deadlines before the 23rd cutoff.
// H-7 (day 16): early warning for both self-assessment and team scoring
// H-3 (day 20): urgent reminder for both
// Deadline day (day 23): final reminder — HR collects data on the 24th
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
  const isH7 = dayOfMonth === KPI_DEADLINE_DAY - 7
  const isH3 = dayOfMonth === KPI_DEADLINE_DAY - 3
  const isDeadline = dayOfMonth === KPI_DEADLINE_DAY

  if (!isH7 && !isH3 && !isDeadline) {
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

  const urgency = isDeadline
    ? `HARI INI — batas akhir tanggal ${KPI_DEADLINE_DAY}! Data HR diambil besok.`
    : isH3
      ? `${KPI_DEADLINE_DAY - dayOfMonth} hari lagi (H-3)`
      : `${KPI_DEADLINE_DAY - dayOfMonth} hari lagi (H-7)`

  let notifiedSelf = 0
  let notifiedTeam = 0

  // ── 1. Self-assessment reminder — semua karyawan aktif kecuali Owner ──────
  for (const user of users) {
    if (user.role === 'OWNER') continue
    const items = KPI_BY_ROLE[user.role]
    if (!items || items.length === 0) continue

    // Check if self-assessment is complete (evaluatorId === userId)
    const selfDone = items.every(it => filledSet.has(`${user.id}:${user.id}:${it.key}`))
    if (selfDone) continue

    await notifyUser({
      userId: user.id,
      type: 'KPI_REMINDER',
      title: `Penilaian diri KPI — ${urgency}`,
      message: `Kamu belum mengisi self-assessment KPI periode ${period}. Selesaikan sebelum tanggal ${KPI_DEADLINE_DAY} — data HR diambil tanggal ${KPI_DEADLINE_DAY + 1}.`,
      link: '/scores',
    })
    notifiedSelf++
  }

  // ── 2. Team scoring reminder — evaluator yang belum nilai anggota tim ─────
  for (const evaluator of users) {
    const pendingTargets = []
    for (const target of users) {
      if (evaluator.id === target.id) continue // self-assessment sudah ditangani di atas
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
        title: `Penilaian tim KPI — ${urgency}`,
        message: `Kamu belum mengisi KPI periode ${period} untuk: ${pendingTargets.join(', ')}. Selesaikan sebelum tanggal ${KPI_DEADLINE_DAY}.`,
        link: '/scores',
      })
      notifiedTeam++
    }
  }

  return NextResponse.json({ notifiedSelf, notifiedTeam, period, urgency })
}
