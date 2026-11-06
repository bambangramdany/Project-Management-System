import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// WIB helpers
function todayWIB() {
  const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

function hourWIB() {
  const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
  return wib.getUTCHours() + wib.getUTCMinutes() / 60
}

function shapeCheckIn(record, date) {
  const currentHour = hourWIB()
  const morningLate = record?.morningAckAt
    ? (() => { const wib = new Date(record.morningAckAt.getTime() + 7*3600000); return (wib.getUTCHours() + wib.getUTCMinutes()/60) > 9.5 })()
    : false
  return {
    ...(record || {}),
    date,
    currentHour,
    morningLate,
    showEveningForm: !record?.eveningAt,
    eveningOverdue: currentHour >= 20 && !record?.eveningAt,
  }
}


const FINANCE_ROLES = ['FINANCE', 'FINANCE_STAFF']
const PM_ROLES = ['PROJECT_MANAGER', 'PRODUCER', 'DIRECTOR', 'OWNER']

function hasFinanceMeeting(user) {
  if (user.role === 'OWNER') return true
  const isFinance = (FINANCE_ROLES.includes(user.role) || user.role === 'DIRECTOR') && user.divisi === 'FINANCE_HRGA'
  const isEvent = PM_ROLES.includes(user.role) && user.divisi === 'EVENT'
  const isPH = PM_ROLES.includes(user.role) && user.divisi === 'PH'
  return isFinance || isEvent || isPH
}

// Combined init payload: checkin + briefing + finMeeting + sharingSessions + eventDay
// Replaces 5 separate fetch() calls on page mount with 1 request and 1 session check.
export async function GET() {
  let session = null
  let userId = null
  try {
  session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  userId = session.user.id
  const today = todayWIB()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

  const [checkIn, briefingLog, sharingSessions, eventProjects] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.briefingLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.sharingSession.findMany({
      orderBy: { scheduledDate: 'asc' },
      include: {
        user: { select: { id: true, name: true, role: true, jobTitle: true, divisi: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
        status: { in: ['PREPARATION', 'EVENT_DAY', 'REPORTING', 'HOLD'] },
        OR: [{ picId: userId }, { members: { some: { userId } } }],
      },
      include: {
        pic: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, role: true, divisi: true } } } },
        rundown: { orderBy: [{ sortOrder: 'asc' }, { time: 'asc' }] },
        issues: { where: { resolved: false }, orderBy: { createdAt: 'desc' }, include: { reportedBy: { select: { name: true } } } },
      },
    }),
  ])

  // Build event-day response
  let todayEvents = []
  if (eventProjects.length > 0) {
    const crewIds = new Set()
    eventProjects.forEach(p => {
      if (p.picId) crewIds.add(p.picId)
      p.members.forEach(m => crewIds.add(m.userId))
    })
    const crewCheckIns = await prisma.dailyCheckIn.findMany({
      where: { userId: { in: [...crewIds] }, date: today },
      select: { userId: true, morningAckAt: true },
    })
    const checkInMap = Object.fromEntries(crewCheckIns.map(c => [c.userId, c]))
    todayEvents = eventProjects.map(p => {
      const allCrew = [
        ...(p.pic ? [{ id: p.pic.id, name: p.pic.name, isPic: true }] : []),
        ...p.members.map(m => ({ id: m.user.id, name: m.user.name, isPic: false })),
      ]
      const uniqueCrew = [...new Map(allCrew.map(c => [c.id, c])).values()]
      return {
        id: p.id, code: p.code, name: p.name,
        startDate: p.startDate, endDate: p.endDate, pic: p.pic,
        rundown: p.rundown, issues: p.issues,
        crew: uniqueCrew.map(c => ({
          ...c, checkedIn: !!checkInMap[c.id]?.morningAckAt,
          checkedInAt: checkInMap[c.id]?.morningAckAt ?? null, isMe: c.id === userId,
        })),
      }
    })
  }

  return NextResponse.json(
    {
      checkIn: shapeCheckIn(checkIn, today),
      briefingLog: briefingLog ?? null,
      sharingSessions,
      todayEvents,
      hasFinanceMeeting: hasFinanceMeeting(session.user),
    },
    { headers: { 'Cache-Control': 'private, max-age=20, stale-while-revalidate=40' } }
  )
  } catch (e) {
    console.error('[my-tasks/init] GET error:', e)
    const today = todayWIB()
    // Try to get at least the check-in record so the morning status is correct
    let checkInRecord = null
    try {
      const userId = session?.user?.id
      if (userId) checkInRecord = await prisma.dailyCheckIn.findUnique({ where: { userId_date: { userId, date: today } } })
    } catch {}
    return NextResponse.json(
      { checkIn: shapeCheckIn(checkInRecord, today), briefingLog: null, sharingSessions: [], todayEvents: [], hasFinanceMeeting: false },
      { status: 200 }
    )
  }
}
