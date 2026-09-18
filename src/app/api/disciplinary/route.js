import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = ['OWNER'].includes(session.user.role) ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (isAdmin) {
    // Admin sees all or filtered by userId
    const records = await prisma.disciplinaryRecord.findMany({
      where: userId ? { userId } : undefined,
      include: {
        user: { select: { id: true, name: true, role: true, divisi: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(records)
  }

  // Regular user sees only their own records
  const records = await prisma.disciplinaryRecord.findMany({
    where: { userId: session.user.id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(records)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = ['OWNER'].includes(session.user.role) ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, type, title, description, targetDate } = body

  if (!userId || !type || !title?.trim()) {
    return NextResponse.json({ error: 'userId, type, title required' }, { status: 400 })
  }

  const record = await prisma.disciplinaryRecord.create({
    data: {
      userId,
      authorId: session.user.id,
      type,
      title: title.trim(),
      description: description?.trim() || '',
      targetDate: targetDate ? new Date(targetDate) : null,
    },
    include: {
      user: { select: { id: true, name: true, role: true, divisi: true } },
      author: { select: { id: true, name: true } },
    },
  })

  // Create notification for the target user
  await prisma.notification.create({
    data: {
      userId,
      type: 'DISCIPLINARY',
      message: `Kamu menerima dokumen pembinaan baru: ${title.trim()}`,
      link: '/hr/announcements',
    },
  })

  return NextResponse.json(record, { status: 201 })
}
