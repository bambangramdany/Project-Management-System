import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function canManage(user) {
  return user.role === 'OWNER' || user.divisi === 'FINANCE_HRGA'
}

function canScore(user) {
  return user?.canHrdEvaluate || user?.role === 'OWNER'
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await prisma.sharingSession.findUnique({ where: { id: params.id } })
  if (!record) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const isOwner = record.userId === session.user.id
  const isManager = canManage(session.user)

  if (!isOwner && !isManager) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const data = {}
  // Presenter sendiri hanya bisa update topic
  if (isOwner) {
    if (body.topic !== undefined) data.topic = body.topic
  }
  // HRD/Owner bisa update semua field
  if (isManager) {
    if (body.scheduledDate !== undefined) data.scheduledDate = new Date(body.scheduledDate)
    if (body.notes !== undefined) data.notes = body.notes
    if (body.status !== undefined) data.status = body.status
    if (body.topic !== undefined) data.topic = body.topic
    if (body.agenda !== undefined) data.agenda = body.agenda
  }
  // HRD khusus (canHrdEvaluate / OWNER) bisa input skor penilaian
  if (canScore(session.user)) {
    if (body.scoreMateri !== undefined) data.scoreMateri = body.scoreMateri
    if (body.scorePenyampaian !== undefined) data.scorePenyampaian = body.scorePenyampaian
    if (body.scoreInteraksi !== undefined) data.scoreInteraksi = body.scoreInteraksi
    if (body.scoreWaktu !== undefined) data.scoreWaktu = body.scoreWaktu
    if (body.scoreNotes !== undefined) data.scoreNotes = body.scoreNotes
    if (body.scoreMateri !== undefined || body.scorePenyampaian !== undefined ||
        body.scoreInteraksi !== undefined || body.scoreWaktu !== undefined) {
      data.scoredById = session.user.id
      data.scoredAt = new Date()
    }
  }

  const updated = await prisma.sharingSession.update({
    where: { id: params.id },
    data,
    include: {
      user: { select: { id: true, name: true, role: true, jobTitle: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
  return Response.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.sharingSession.delete({ where: { id: params.id } })
  return Response.json({ ok: true })
}
