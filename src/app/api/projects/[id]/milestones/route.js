import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId: params.id },
    orderBy: { date: 'asc' },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  })
  return NextResponse.json(milestones)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
  if (!body.date) return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })

  const memberIds = Array.isArray(body.memberIds) ? body.memberIds.filter(Boolean) : []
  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId: params.id,
      title: body.title.trim(),
      startDate: body.startDate ? new Date(body.startDate) : null,
      date: new Date(body.date),
      color: body.color || 'violet',
      note: body.note?.trim() || null,
      done: false,
      members: memberIds.length > 0 ? { create: memberIds.map(uid => ({ userId: uid })) } : undefined,
    },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  })
  return NextResponse.json(milestone, { status: 201 })
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { milestoneId, ...data } = body
  if (!milestoneId) return NextResponse.json({ error: 'milestoneId required' }, { status: 400 })

  const updateData = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.date !== undefined) updateData.date = new Date(data.date)
  if (data.done !== undefined) updateData.done = Boolean(data.done)
  if (data.color !== undefined) updateData.color = data.color
  if (data.note !== undefined) updateData.note = data.note?.trim() || null

  if (data.memberIds !== undefined) {
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds.filter(Boolean) : []
    updateData.members = { deleteMany: {}, create: memberIds.map(uid => ({ userId: uid })) }
  }

  const updated = await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: updateData,
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const milestoneId = searchParams.get('milestoneId')
  if (!milestoneId) return NextResponse.json({ error: 'milestoneId required' }, { status: 400 })

  await prisma.projectMilestone.delete({ where: { id: milestoneId } })
  return NextResponse.json({ ok: true })
}
