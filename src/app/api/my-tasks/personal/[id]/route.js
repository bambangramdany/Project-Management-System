import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.personalTask.findUnique({ where: { id: params.id } })
  if (!item || item.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const data = {}
  if ('title' in body) data.title = body.title.trim()
  if ('description' in body) data.description = body.description || null
  if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if ('status' in body) data.status = body.status

  const updated = await prisma.personalTask.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.personalTask.findUnique({ where: { id: params.id } })
  if (!item || item.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.personalTask.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
