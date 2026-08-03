import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function canEdit(user) {
  return user?.canHrdEvaluate || user?.role === 'OWNER'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const w = await prisma.evaluationWeight.findFirst({ orderBy: { updatedAt: 'desc' } })
  return Response.json(w ?? { kpiWeight: 40, attendanceWeight: 20, sharingWeight: 15, attitudeWeight: 15, skillWeight: 10 })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canEdit(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { kpiWeight, attendanceWeight, sharingWeight, attitudeWeight, skillWeight } = body
  const total = (kpiWeight || 0) + (attendanceWeight || 0) + (sharingWeight || 0) + (attitudeWeight || 0) + (skillWeight || 0)
  if (Math.abs(total - 100) > 0.01) return Response.json({ error: `Total bobot harus 100% (sekarang ${total}%)` }, { status: 400 })

  const existing = await prisma.evaluationWeight.findFirst({ orderBy: { updatedAt: 'desc' } })
  const record = existing
    ? await prisma.evaluationWeight.update({
        where: { id: existing.id },
        data: { kpiWeight, attendanceWeight, sharingWeight, attitudeWeight, skillWeight, updatedById: session.user.id },
      })
    : await prisma.evaluationWeight.create({
        data: { kpiWeight, attendanceWeight, sharingWeight, attitudeWeight, skillWeight, updatedById: session.user.id },
      })
  return Response.json(record)
}
