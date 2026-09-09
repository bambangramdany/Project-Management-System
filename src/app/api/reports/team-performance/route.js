import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const VIEWER_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE', 'PROJECT_MANAGER']
const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

function workDaysInRange(start, end) {
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    if (d.getDay() !== 0) count++ // exclude Sunday
    d.setDate(d.getDate() + 1)
  }
  return count
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!VIEWER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const month  = searchParams.get('month') || new Date().toISOString().slice(0, 7) // YYYY-MM
  const divisi = searchParams.get('divisi') || null

  const [year, mon] = month.split('-').map(Number)
  const monthStart = new Date(year, mon - 1, 1)
  const monthEnd   = new Date(year, mon, 0, 23, 59, 59)
  const today      = new Date()
  const rangeEnd   = monthEnd < today ? monthEnd : today

  const workDays = workDaysInRange(monthStart, rangeEnd)

  // DIRECTOR: only their own divisi (unless OWNER/FINANCE/PM)
  const divisiFilter = session.user.role === 'DIRECTOR' && !divisi
    ? session.user.divisi
    : divisi || undefined

  const users = await prisma.user.findMany({
    where: {
      employeeStatus: 'ACTIVE',
      email: { notIn: HIDDEN_EMAILS },
      role: { notIn: ['OWNER'] },
      ...(divisiFilter ? { divisi: divisiFilter } : {}),
    },
    select: { id: true, name: true, role: true, divisi: true, jobTitle: true },
    orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
  })

  const userIds = users.map(u => u.id)

  const [checkIns, updates, kpiScores, hrdEvals, weights, sharingSessions] = await Promise.all([
    prisma.dailyCheckIn.findMany({
      where: { userId: { in: userIds }, date: { gte: monthStart, lte: monthEnd } },
      select: { userId: true, morningAckAt: true, eveningAt: true, date: true },
    }),
    prisma.progressUpdate.findMany({
      where: { userId: { in: userIds }, date: { gte: monthStart, lte: monthEnd } },
      select: { userId: true, date: true, status: true },
    }),
    prisma.kpiAssessment.findMany({
      where: { userId: { in: userIds }, period: month },
      select: { userId: true, kpiKey: true, score: true },
    }),
    prisma.hrdMonthlyEvaluation.findMany({
      where: { userId: { in: userIds }, period: month },
      select: { userId: true, attitudeScore: true, skillScore: true },
    }),
    prisma.evaluationWeight.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.sharingSession.findMany({
      where: {
        status: 'DONE',
        scheduledAt: { gte: monthStart, lte: monthEnd },
        presenterId: { in: userIds },
      },
      select: { presenterId: true },
    }),
  ])

  const w = weights || { kpiWeight: 40, attendanceWeight: 20, sharingWeight: 15, attitudeWeight: 15, skillWeight: 10 }

  // Group by userId
  const checkInMap = {}
  checkIns.forEach(c => {
    if (!checkInMap[c.userId]) checkInMap[c.userId] = []
    checkInMap[c.userId].push(c)
  })

  const updateMap = {}
  updates.forEach(u => {
    if (!updateMap[u.userId]) updateMap[u.userId] = []
    updateMap[u.userId].push(u)
  })

  const kpiMap = {}
  kpiScores.forEach(k => {
    if (!kpiMap[k.userId]) kpiMap[k.userId] = []
    kpiMap[k.userId].push(k)
  })

  const hrdMap = {}
  hrdEvals.forEach(h => { hrdMap[h.userId] = h })

  const sharingMap = {}
  sharingSessions.forEach(s => { sharingMap[s.presenterId] = (sharingMap[s.presenterId] || 0) + 1 })

  const result = users.map(user => {
    const uid = user.id

    // Check-in
    const userCheckIns = checkInMap[uid] || []
    const morningCount = userCheckIns.filter(c => c.morningAckAt).length
    const eveningCount = userCheckIns.filter(c => c.eveningAt).length
    const checkInRate  = workDays > 0 ? Math.round((morningCount / workDays) * 100) : 0

    // Task updates
    const userUpdates = updateMap[uid] || []
    const uniqueUpdateDays = new Set(userUpdates.map(u => new Date(u.date).toISOString().slice(0, 10))).size
    const updateRate = workDays > 0 ? Math.round((uniqueUpdateDays / workDays) * 100) : 0

    // On-time updates (before 20:00 WIB = 13:00 UTC)
    const onTimeCount = userUpdates.filter(u => new Date(u.date).getUTCHours() < 13).length
    const onTimeRate  = userUpdates.length > 0 ? Math.round((onTimeCount / userUpdates.length) * 100) : null

    // KPI scores
    const userKpi = kpiMap[uid] || []
    const kpiAvg  = userKpi.length > 0
      ? Math.round((userKpi.reduce((s, k) => s + k.score, 0) / userKpi.length) * 10) / 10
      : null

    // HRD eval
    const hrd = hrdMap[uid] || null
    const attitudeScore = hrd?.attitudeScore ?? null
    const skillScore    = hrd?.skillScore    ?? null

    // Sharing sessions this month
    const sharingCount = sharingMap[uid] || 0

    // Weighted total score (0–100)
    // attendance: checkInRate
    // kpi: kpiAvg (1–5 scale) → /5*100
    // sharing: capped at 100% if ≥1 session, 50% if 0
    // attitude: attitudeScore/5*100
    // skill: skillScore/5*100
    const hasEnoughData = kpiAvg !== null || attitudeScore !== null
    let totalScore = null
    if (hasEnoughData) {
      const kpiPct       = kpiAvg !== null ? (kpiAvg / 5) * 100 : 0
      const attendancePct = checkInRate
      const sharingPct   = sharingCount >= 1 ? 100 : 50
      const attitudePct  = attitudeScore !== null ? (attitudeScore / 5) * 100 : 0
      const skillPct     = skillScore !== null ? (skillScore / 5) * 100 : 0

      totalScore = Math.round(
        (kpiPct * w.kpiWeight + attendancePct * w.attendanceWeight +
         sharingPct * w.sharingWeight + attitudePct * w.attitudeWeight +
         skillPct * w.skillWeight) / 100
      )
    }

    return {
      id: uid,
      name: user.name,
      role: user.role,
      divisi: user.divisi,
      jobTitle: user.jobTitle,
      morningCount,
      eveningCount,
      checkInRate,
      uniqueUpdateDays,
      updateRate,
      onTimeRate,
      kpiAvg,
      kpiCount: userKpi.length,
      attitudeScore,
      skillScore,
      sharingCount,
      totalScore,
      workDays,
    }
  })

  return NextResponse.json({ month, workDays, weights: w, users: result })
}
