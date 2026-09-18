import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const CAN_CREATE = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER', 'PROJECT_OFFICER']

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notes = await prisma.meetingNote.findMany({
    where: { projectId: params.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      actionItems: {
        include: {
          assignee: { select: { id: true, name: true } },
          task: { select: { id: true, status: true } },
        },
      },
    },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(notes)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!CAN_CREATE.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { date, type, title, attendees, notes, actionItems } = body

  if (!date || !type || !title) return NextResponse.json({ error: 'Tanggal, tipe, dan judul wajib diisi' }, { status: 400 })

  const note = await prisma.meetingNote.create({
    data: {
      projectId: params.id,
      date: new Date(date),
      type,
      title,
      attendees: attendees ? JSON.stringify(attendees) : null,
      notes: notes || null,
      createdById: session.user.id,
      actionItems: actionItems?.length ? {
        create: actionItems.map(item => ({
          description: item.description,
          assigneeId: item.assigneeId || null,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
        })),
      } : undefined,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      actionItems: {
        include: {
          assignee: { select: { id: true, name: true } },
          task: { select: { id: true, status: true } },
        },
      },
    },
  })

  return NextResponse.json(note)
}
