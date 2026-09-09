import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const MANAGER_ROLES = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER']

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.eventRundown.findMany({
    where: { projectId: params.id },
    orderBy: [{ sortOrder: 'asc' }, { time: 'asc' }],
    include: { createdBy: { select: { id: true, name: true } } },
  })
  return NextResponse.json(items)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!MANAGER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { time, title, note, sortOrder } = await req.json()
  if (!time || !title) return NextResponse.json({ error: 'time dan title wajib' }, { status: 400 })

  const item = await prisma.eventRundown.create({
    data: { projectId: params.id, time, title, note: note || null, sortOrder: sortOrder ?? 0, createdById: session.user.id },
    include: { createdBy: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!MANAGER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const rid = searchParams.get('rid')
  if (!rid) return NextResponse.json({ error: 'rid wajib' }, { status: 400 })

  await prisma.eventRundown.deleteMany({ where: { id: rid, projectId: params.id } })
  return NextResponse.json({ ok: true })
}
