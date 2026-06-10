import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'OWNER' && !isFinanceDirector(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const entity = searchParams.get('entity')

  const where = {}
  if (action) where.action = action
  if (entity) where.entity = entity

  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(logs)
}
