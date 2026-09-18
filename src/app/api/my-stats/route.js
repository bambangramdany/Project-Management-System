import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const WFO_DIVISIONS = ['EVENT', 'PH', 'CREATIVE']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const divisi = session.user.divisi
  const now = new Date()

  // Month range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Today
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  const monthStartStr = monthStart.toISOString().slice(0, 10)
  const monthEndStr   = monthEnd.toISOString().slice(0, 10)

  const needsWfo = WFO_DIVISIONS.includes(divisi)

  // Parallel queries
  const [updates, checkIns, activeTasks, personalTasks, briefingLogs, wfoLogs] = await Promise.all([
    prisma.progressUpdate.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: 'desc' },
    }),
    prisma.dailyCheckIn.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: 'desc' },
    }),
    prisma.task.count({ where: { assigneeId: userId, status: { not: 'DONE' } } }),
    prisma.personalTask.count({ where: { userId, done: false } }),
    prisma.briefingLog.findMany({
      where: { userId, date: { gte: monthStartStr, lte: monthEndStr } },
    }),
    needsWfo ? prisma.wfoLog.findMany({
      where: { userId, weekDate: { gte: monthStartStr, lte: monthEndStr } },
    }) : Promise.resolve([]),
  ])

  // Unique days with at least one update
  const updateDays = new Set(updates.map(u => new Date(u.date).toISOString().slice(0, 10)))

  // Check-in streak
  const checkInDays = new Set(checkIns.filter(c => c.morningAckAt).map(c =>
    new Date(c.date).toISOString().slice(0, 10)
  ))
  let streak = 0
  const d = new Date(todayStart)
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (checkInDays.has(key)) { streak++; d.setDate(d.getDate() - 1) }
    else break
    if (streak > 60) break
  }

  // On-time updates: submitted before 20:00 WIB (13:00 UTC)
  const onTimeCount = updates.filter(u => {
    const h = new Date(u.date).getUTCHours()
    return h < 13
  }).length

  // Today check-in
  const todayCheckIn = checkIns.find(c => new Date(c.date) >= todayStart)

  // Work days this month so far (Mon–Sat)
  let workDays = 0
  const iter = new Date(monthStart)
  while (iter <= now) {
    if (iter.getDay() !== 0) workDays++
    iter.setDate(iter.getDate() + 1)
  }

  // Briefing scoring: HADIR on-time=100, HADIR telat=50, others=0
  // Count work days so far as total briefing opportunities
  const briefingByDate = Object.fromEntries(briefingLogs.map(l => [l.date, l]))
  let briefingPoints = 0
  let briefingTotal = 0
  const iterB = new Date(monthStart)
  while (iterB <= now) {
    const day = iterB.getDay()
    if (day !== 0 && day !== 6) { // Mon–Fri only for briefing
      const key = iterB.toISOString().slice(0, 10)
      const log = briefingByDate[key]
      if (log) {
        if (log.status === 'HADIR') {
          briefingPoints += log.note === 'Telat' ? 50 : 100
        } else if (log.status === 'IZIN_PROJECT') {
          briefingPoints += 100 // izin project dihitung hadir
        }
      }
      briefingTotal++
    }
    iterB.setDate(iterB.getDate() + 1)
  }
  const briefingRate = briefingTotal > 0 ? Math.round((briefingPoints / (briefingTotal * 100)) * 100) : null
  const briefingOnTime = briefingLogs.filter(l => l.status === 'HADIR' && l.note !== 'Telat').length
  const briefingLate   = briefingLogs.filter(l => l.status === 'HADIR' && l.note === 'Telat').length

  // WFO scoring: count Tuesdays in month so far, HADIR=100 TIDAK_HADIR=0
  let wfoPoints = 0
  let wfoTotal = 0
  if (needsWfo) {
    const wfoByWeek = Object.fromEntries(wfoLogs.map(l => [l.weekDate, l]))
    const iterW = new Date(monthStart)
    while (iterW <= now) {
      if (iterW.getDay() === 2) { // Tuesday
        const key = iterW.toISOString().slice(0, 10)
        const log = wfoByWeek[key]
        if (log?.status === 'HADIR') wfoPoints += 100
        wfoTotal++
      }
      iterW.setDate(iterW.getDate() + 1)
    }
  }
  const wfoRate = needsWfo && wfoTotal > 0 ? Math.round((wfoPoints / (wfoTotal * 100)) * 100) : null

  const checkInRate = workDays > 0 ? Math.round((checkIns.filter(c => c.morningAckAt).length / workDays) * 100) : 0
  const updateRate  = workDays > 0 ? Math.round((updateDays.size / workDays) * 100) : 0

  return NextResponse.json({
    streak,
    checkInRate,
    updateRate,
    onTimeCount,
    totalUpdatesThisMonth: updateDays.size,
    workDaysThisMonth: workDays,
    activeTasks: activeTasks + personalTasks,
    todayCheckedIn: !!todayCheckIn?.morningAckAt,
    // Briefing stats
    briefingRate,
    briefingOnTime,
    briefingLate,
    briefingTotal,
    // WFO stats (null if not applicable)
    wfoRate,
    wfoTotal,
    needsWfo,
  })
}
