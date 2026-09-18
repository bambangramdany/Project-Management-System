import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await prisma.disciplinaryRecord.findUnique({ where: { id: params.id } })
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (record.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.disciplinaryRecord.update({
    where: { id: params.id },
    data: { acknowledgedAt: new Date() },
  })

  return NextResponse.json(updated)
}
