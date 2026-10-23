import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const FINANCE_MEETING_ROLES = ['FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER']
const FINANCE_MEETING_DIVISI = ['FINANCE_HRGA', 'EVENT', 'PH']

function todayWIB() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    .toISOString().slice(0, 10)
}

function getFridayOfWeek(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay()
  const diff = 5 - day
  const fri = new Date(d)
  fri.setDate(d.getDate() + diff)
  return fri.toISOString().slice(0, 10)
}

function isMeetingMember(user) {
  if (['OWNER', 'DIRECTOR'].includes(user.role) && user.divisi === 'FINANCE_HRGA') return true
  return FINANCE_MEETING_ROLES.includes(user.role) && FINANCE_MEETING_DIVISI.includes(user.divisi)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
  const { searchParams } = new URL(req.url)
  const finDate = searchParams.get('finDate') || getFridayOfWeek()
  const today = todayWIB()

  const user = session.user
  const isAdmin = user.role === 'OWNER' || (user.role === 'DIRECTOR' && user.divisi === 'FINANCE_HRGA')
  const needsFin = isMeetingMember(user)

  // Run all DB queries in parallel
  const [
    briefingLog,
    briefingAll,
    finLog,
    totalUsers,
  ] = await Promise.all([
    // Personal briefing log for today
    prisma.briefingLog.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    }),

    // All briefing logs for admin
    isAdmin ? prisma.briefingLog.findMany({
      where: { date: today },
      include: { user: { select: { id: true, name: true, role: true, divisi: true } } },
      orderBy: { loggedAt: 'asc' },
    }) : Promise.resolve(null),

    // Finance meeting log (compound unique [weekDate, meetingType], so use findMany)
    (needsFin || isAdmin) ? prisma.financeMeetingLog.findMany({
      where: { weekDate: finDate },
      include: { author: { select: { id: true, name: true } } },
    }) : Promise.resolve([]),

    // Total active users for briefing rate
    isAdmin ? prisma.user.count({ where: { employeeStatus: 'ACTIVE' } }) : Promise.resolve(null),
  ])

  return NextResponse.json({
    today,
    briefing: {
      log: briefingLog,
      allLogs: isAdmin ? briefingAll : null,
      totalUsers: isAdmin ? totalUsers : null,
    },
    finMeeting: {
      weekDate: finDate,
      logs: finLog,
      log: Array.isArray(finLog) ? (finLog[0] || null) : finLog,
      isRequired: needsFin,
    },
  })
  } catch (e) {
    console.error('GET /api/programs/summary error:', e)
    return NextResponse.json({ error: 'Gagal memuat data program' }, { status: 500 })
  }
}
