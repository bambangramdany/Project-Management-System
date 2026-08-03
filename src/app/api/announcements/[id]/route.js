import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function canPost(user) {
  return user?.canHrdEvaluate || user?.role === 'OWNER'
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canPost(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, content, type, expiresAt, pinned } = body

    const rec = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content?.trim() || null }),
        ...(type !== undefined && { type }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(pinned !== undefined && { pinned }),
      },
      include: { author: { select: { id: true, name: true } } },
    })
    return Response.json(rec)
  } catch (e) {
    console.error('announcement PATCH error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canPost(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.announcement.delete({ where: { id: params.id } })
    return Response.json({ ok: true })
  } catch (e) {
    console.error('announcement DELETE error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
