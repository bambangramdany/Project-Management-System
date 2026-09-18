import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const FINANCE_ROLES  = ['FINANCE', 'FINANCE_STAFF']
const PM_ROLES       = ['PROJECT_MANAGER', 'PRODUCER', 'DIRECTOR', 'OWNER']

// Divisi yang relevan per tipe meeting
const MEETING_DIVISI = {
  FINANCE_EVENT: ['FINANCE_HRGA', 'EVENT'],
  FINANCE_PH:    ['FINANCE_HRGA', 'PH'],
}

function getMeetingTypes(user) {
  const isFinance = (FINANCE_ROLES.includes(user.role) || ['OWNER', 'DIRECTOR'].includes(user.role))
    && user.divisi === 'FINANCE_HRGA'
  const isEvent = PM_ROLES.includes(user.role) && user.divisi === 'EVENT'
  const isPH    = PM_ROLES.includes(user.role) && user.divisi === 'PH'

  const types = []
  if (isFinance) { types.push('FINANCE_EVENT'); types.push('FINANCE_PH') }
  if (isEvent)   types.push('FINANCE_EVENT')
  if (isPH)      types.push('FINANCE_PH')
  return [...new Set(types)]
}

function canWrite(user) {
  return (FINANCE_ROLES.includes(user.role) || ['OWNER', 'DIRECTOR'].includes(user.role))
    && user.divisi === 'FINANCE_HRGA'
}

function getFridayDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const fri = new Date(d)
  fri.setDate(d.getDate() + (5 - d.getDay()))
  return fri.toISOString().slice(0, 10)
}

const ATTENDEE_SELECT = { id: true, name: true, role: true, divisi: true }

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekDate = searchParams.get('weekDate') || getFridayDate()
  const types    = getMeetingTypes(session.user)

  if (!types.length) return NextResponse.json({ types: [], logs: {}, potentialAttendees: {} })

  // Fetch logs + attendees for relevant types
  const logs = await prisma.financeMeetingLog.findMany({
    where: { weekDate, meetingType: { in: types } },
    include: {
      author: { select: ATTENDEE_SELECT },
      attendeeRecords: { include: { user: { select: ATTENDEE_SELECT } } },
    },
  })

  // Fetch potential attendees per meeting type
  const allDivisi = [...new Set(types.flatMap(t => MEETING_DIVISI[t]))]
  const allUsers = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', divisi: { in: allDivisi } },
    select: ATTENDEE_SELECT,
    orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
  })

  // Build potentialAttendees per meeting type
  const potentialAttendees = {}
  types.forEach(type => {
    potentialAttendees[type] = allUsers.filter(u => MEETING_DIVISI[type].includes(u.divisi))
  })

  const logMap = {}
  logs.forEach(l => { logMap[l.meetingType] = l })

  return NextResponse.json({
    weekDate,
    types,
    logs: logMap,
    potentialAttendees,
    canWrite: canWrite(session.user),
    isRequired: types.length > 0,
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canWrite(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { weekDate, meetingType, arSummary, apPlan, notes, attendeeIds = [] } = body

  if (!weekDate || !meetingType) return NextResponse.json({ error: 'weekDate and meetingType required' }, { status: 400 })

  const types = getMeetingTypes(session.user)
  if (!types.includes(meetingType)) return NextResponse.json({ error: 'Forbidden for this meeting type' }, { status: 403 })

  // Upsert log
  const log = await prisma.financeMeetingLog.upsert({
    where: { weekDate_meetingType: { weekDate, meetingType } },
    create: {
      weekDate, meetingType, authorId: session.user.id,
      arSummary: arSummary?.trim() || null,
      apPlan:    apPlan?.trim()    || null,
      notes:     notes?.trim()     || null,
    },
    update: {
      authorId: session.user.id,
      arSummary: arSummary?.trim() || null,
      apPlan:    apPlan?.trim()    || null,
      notes:     notes?.trim()     || null,
      updatedAt: new Date(),
    },
  })

  // Replace attendees
  await prisma.financeMeetingAttendee.deleteMany({ where: { meetingLogId: log.id } })
  if (attendeeIds.length) {
    await prisma.financeMeetingAttendee.createMany({
      data: attendeeIds.map(userId => ({ meetingLogId: log.id, userId })),
      skipDuplicates: true,
    })
  }

  const result = await prisma.financeMeetingLog.findUnique({
    where: { id: log.id },
    include: {
      author: { select: ATTENDEE_SELECT },
      attendeeRecords: { include: { user: { select: ATTENDEE_SELECT } } },
    },
  })

  return NextResponse.json(result)
}
