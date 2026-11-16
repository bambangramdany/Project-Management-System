import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await prisma.personalTask.findMany({
    where: { projectId: params.id, status: { not: 'DONE' } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(tasks)
}
