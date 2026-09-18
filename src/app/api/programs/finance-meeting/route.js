import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Roles that must join the Friday finance meeting
const FINANCE_MEETING_ROLES = ['FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER']
const FINANCE_MEETING_DIVISI = ['FINANCE_HRGA', 'EVENT', 'PH'] // Creative PM tidak wajib

function isMeetingMember(user) {
  if (['OWNER', 'DIRECTOR'].includes(user.role) && user.divisi === 'FINANCE_HRGA') return true
  return FINANCE_MEETING_ROLES.includes(user.role) && FINANCE_MEETING_DIVISI.includes(user.divisi)
}

function getFridayDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay()
  const diff = 5 - day // Friday = 5
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

  if (history) {
    const logs = await prisma.financeMeetingLog.findMany({
      include: { author: { select: { id: true, name: true } } },
      orderBy: { weekDate: 'desc' },
      take: 12,
    })
    return NextResponse.json(logs)
  }

  const log = await prisma.financeMeetingLog.findUnique({ where: { weekDate },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json({
    log,
    weekDate,
    isRequired: isMeetingMember(session.user),
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isMeetingMember(session.user) && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { weekDate, arSummary, apPlan, notes, attendees } = body

  if (!weekDate) return NextResponse.json({ error: 'weekDate required' }, { status: 400 })

  const log = await prisma.financeMeetingLog.upsert({
    where: { weekDate },
    create: {
      weekDate,
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
