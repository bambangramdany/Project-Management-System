import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: params.id, userId: session.user.id } },
    create: { announcementId: params.id, userId: session.user.id },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
