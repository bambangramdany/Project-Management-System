import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'OWNER' ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === '1'
  const now = new Date()

  if (all && isAdmin) {
    const [announcements, disciplinary, users] = await Promise.all([
      prisma.announcement.findMany({
        include: {
          author: { select: { id: true, name: true } },
          targetUser: { select: { id: true, name: true } },
          reads: { select: { userId: true, readAt: true } },
        },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      }),
      prisma.disciplinaryRecord.findMany({
        include: {
          user: { select: { id: true, name: true, role: true, divisi: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: { employeeStatus: 'ACTIVE' },
        select: { id: true, name: true, role: true, divisi: true },
        orderBy: { name: 'asc' },
      }),
    ])
    return NextResponse.json({ announcements, disciplinary, users })
  }

  // Regular employee view
  const [announcements, disciplinary] = await Promise.all([
    prisma.announcement.findMany({
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
    }),
    prisma.disciplinaryRecord.findMany({
      where: { userId: session.user.id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ announcements, disciplinary })
}
