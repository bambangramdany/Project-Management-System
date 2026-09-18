import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1' // for HR admin view

  const isAdmin = ['OWNER'].includes(session.user.role) ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')

  const now = new Date()

  if (all && isAdmin) {
    const announcements = await prisma.announcement.findMany({
      include: {
        author: { select: { id: true, name: true } },
        targetUser: { select: { id: true, name: true } },
        reads: { select: { userId: true, readAt: true } },
      },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    })
    return NextResponse.json(announcements)
  }

  // For regular users — show general + their personal announcements, not expired
  const announcements = await prisma.announcement.findMany({
    where: {
      AND: [
        { OR: [{ targetUserId: null }, { targetUserId: session.user.id }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    include: {
      author: { select: { id: true, name: true } },
      reads: {
        where: { userId: session.user.id },
        select: { readAt: true },
      },
    },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    take: 20,
  })

  // Birthday check for dashboard banner
  const todayStr = now.toISOString().slice(5, 10) // MM-DD
  const birthdayToday = await prisma.user.findMany({
    where: {
      birthDate: { not: null },
      active: true,
    },
    select: { id: true, name: true, birthDate: true },
  }).then(users => users.filter(u => {
    const bd = new Date(u.birthDate)
    const bdStr = String(bd.getMonth() + 1).padStart(2, '0') + '-' + String(bd.getDate()).padStart(2, '0')
    return bdStr === todayStr
  }))

  // Return both array format (for /hr/announcements page) and dashboard format
  const format = new URL(req.url).searchParams.get('format')
  if (format === 'dashboard') {
    return NextResponse.json({ announcements, birthdayToday })
  }

  return NextResponse.json(announcements)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = ['OWNER'].includes(session.user.role) ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, content, type, targetUserId, expiresAt, pinned } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      content: content?.trim() || null,
      type: type || 'INFO',
      targetUserId: targetUserId || null,
      authorId: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      pinned: !!pinned,
    },
    include: {
      author: { select: { id: true, name: true } },
      targetUser: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
