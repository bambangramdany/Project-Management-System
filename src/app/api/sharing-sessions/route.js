import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function canManage(user) {
  return user.role === 'OWNER' || user.divisi === 'FINANCE_HRGA'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const sessions = await prisma.sharingSession.findMany({
    orderBy: { scheduledDate: 'asc' },
    include: {
      user: { select: { id: true, name: true, role: true, jobTitle: true, divisi: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
  return Response.json(sessions)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, scheduledDate, notes } = body
  if (!userId || !scheduledDate) return Response.json({ error: 'userId dan scheduledDate wajib diisi' }, { status: 400 })

  const record = await prisma.sharingSession.create({
    data: {
      userId,
      scheduledDate: new Date(scheduledDate),
      notes: notes || null,
      status: 'UPCOMING',
      createdById: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, role: true, jobTitle: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
  return Response.json(record, { status: 201 })
}
