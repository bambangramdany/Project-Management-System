import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function canPost(user) {
  return user?.canHrdEvaluate || user?.role === 'OWNER'
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()

    // Auto-generate birthday announcements for today
    const todayMonth = now.getMonth() + 1
    const todayDay = now.getDate()

    // Find team members whose birthday is today (compare month+day only)
    const allUsers = await prisma.user.findMany({
      where: { birthDate: { not: null }, role: { not: 'OWNER' } },
      select: { id: true, name: true, birthDate: true, jobTitle: true, divisi: true },
    })

    const birthdayToday = allUsers.filter(u => {
      const bd = new Date(u.birthDate)
      return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay
    })

    // Fetch saved announcements (non-expired)
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        publishedAt: { lte: now },
      },
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    })

    return Response.json({ announcements, birthdayToday })
  } catch (e) {
    console.error('announcements GET error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canPost(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, content, type, expiresAt, pinned } = body
    if (!title?.trim()) return Response.json({ error: 'Judul wajib diisi' }, { status: 400 })

    const rec = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content?.trim() || null,
        type: type || 'INFO',
        authorId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        pinned: pinned ?? false,
      },
      include: { author: { select: { id: true, name: true } } },
    })
    return Response.json(rec)
  } catch (e) {
    console.error('announcements POST error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
