import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const now = new Date()

  // Month range
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Today
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

  // Progress updates this month by this user
  const [updates, checkIns, activeTasks, personalTasks] = await Promise.all([
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
  ])

  // Unique days with at least one update
  const updateDays = new Set(updates.map(u => new Date(u.date).toISOString().slice(0, 10)))

  // Check-in streak: consecutive days from today backwards that have morningAckAt
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
    return h < 13 // before 20:00 WIB = 13:00 UTC
  }).length

  // Today check-in
  const todayCheckIn = checkIns.find(c => new Date(c.date) >= todayStart)

  // Work days this month so far (Mon–Sat)
  let workDays = 0
  const iter = new Date(monthStart)
  while (iter <= now) {
    const day = iter.getDay() // 0=Sun
    if (day !== 0) workDays++ // exclude Sunday only
    iter.setDate(iter.getDate() + 1)
  }

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
  })
}
