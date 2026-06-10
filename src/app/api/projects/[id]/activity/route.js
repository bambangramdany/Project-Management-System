import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Project-scoped activity feed: combines audit log entries for the project
// itself and for any payment requests belonging to it.
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const payments = await prisma.paymentRequest.findMany({ where: { projectId: params.id }, select: { id: true } })
  const paymentIds = payments.map(p => p.id)

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: 'Project', entityId: params.id },
        ...(paymentIds.length > 0 ? [{ entity: 'PaymentRequest', entityId: { in: paymentIds } }] : []),
      ],
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(logs)
}
