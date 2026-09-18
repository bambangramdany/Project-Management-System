import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Finance-Event: Finance (FINANCE_HRGA) + Event PM/Producer/Director
// Finance-PH:    Finance (FINANCE_HRGA) + PH PM/Producer/Director

const FINANCE_ROLES = ['FINANCE', 'FINANCE_STAFF']
const PM_ROLES = ['PROJECT_MANAGER', 'PRODUCER', 'DIRECTOR', 'OWNER']

function getMeetingTypes(user) {
  const types = []
  const isFinance = (FINANCE_ROLES.includes(user.role) || ['OWNER', 'DIRECTOR'].includes(user.role))
    && user.divisi === 'FINANCE_HRGA'
  const isEvent = PM_ROLES.includes(user.role) && user.divisi === 'EVENT'
  const isPH    = PM_ROLES.includes(user.role) && user.divisi === 'PH'

  if (isFinance) { types.push('FINANCE_EVENT'); types.push('FINANCE_PH') }
  if (isEvent)   types.push('FINANCE_EVENT')
  if (isPH)      types.push('FINANCE_PH')
  return [...new Set(types)]
}

function getFridayDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const diff = 5 - d.getDay()
  const fri = new Date(d)
  fri.setDate(d.getDate() + diff)
  return fri.toISOString().slice(0, 10)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekDate = searchParams.get('weekDate') || getFridayDate()
  const history = searchParams.get('history') === '1'
  const types = getMeetingTypes(session.user)

  if (history) {
    const logs = await prisma.financeMeetingLog.findMany({
      where: types.length ? { meetingType: { in: types } } : undefined,
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ weekDate: 'desc' }, { meetingType: 'asc' }],
      take: 24,
    })
    return NextResponse.json(logs)
  }

  // Return logs for this week for all types this user cares about
  const logs = await prisma.financeMeetingLog.findMany({
    where: { weekDate, meetingType: { in: types.length ? types : ['FINANCE_EVENT', 'FINANCE_PH'] } },
    include: { author: { select: { id: true, name: true } } },
  })

  // Return as a map { FINANCE_EVENT: log|null, FINANCE_PH: log|null }
  const logMap = {}
  logs.forEach(l => { logMap[l.meetingType] = l })

  return NextResponse.json({
    weekDate,
    types,
    logs: logMap,
    isRequired: types.length > 0,
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const types = getMeetingTypes(session.user)
  if (!types.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { weekDate, meetingType, arSummary, apPlan, notes, attendees } = body

  if (!weekDate || !meetingType) return NextResponse.json({ error: 'weekDate and meetingType required' }, { status: 400 })
  if (!types.includes(meetingType)) return NextResponse.json({ error: 'Forbidden for this meeting type' }, { status: 403 })

  const log = await prisma.financeMeetingLog.upsert({
    where: { weekDate_meetingType: { weekDate, meetingType } },
    create: {
      weekDate,
      meetingType,
      authorId: session.user.id,
      arSummary: arSummary?.trim() || null,
      apPlan: apPlan?.trim() || null,
      notes: notes?.trim() || null,
      attendees: attendees?.trim() || null,
    },
    update: {
      authorId: session.user.id,
      arSummary: arSummary?.trim() || null,
      apPlan: apPlan?.trim() || null,
      notes: notes?.trim() || null,
      attendees: attendees?.trim() || null,
      updatedAt: new Date(),
    },
    include: { author: { select: { id: true, name: true } } },
  })

  return NextResponse.json(log)
}
