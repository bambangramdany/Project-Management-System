import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = ['OWNER'].includes(session.user.role) ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, content, type, targetUserId, expiresAt, pinned } = body

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content?.trim() || null }),
      ...(type !== undefined && { type }),
      ...(targetUserId !== undefined && { targetUserId: targetUserId || null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(pinned !== undefined && { pinned }),
    },
    include: { author: { select: { id: true, name: true } }, targetUser: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = ['OWNER'].includes(session.user.role) ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
