import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function startOfTodayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// Past 20:00 WIB (UTC+7) == past 13:00 UTC
function isPastDeadlineWIB() {
  const now = new Date()
  return now.getUTCHours() >= 13
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const today = startOfTodayUTC()

  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId, status: { not: 'DONE' } },
    include: {
      project: { select: { id: true, code: true, name: true, status: true } },
      progressUpdates: { where: { userId }, orderBy: { date: 'desc' }, take: 1 },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  })

  const personalTasks = await prisma.personalTask.findMany({
    where: { userId, status: { not: 'DONE' } },
    include: {
      progressUpdates: { where: { userId }, orderBy: { date: 'desc' }, take: 1 },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  })

  function shape(item, kind) {
    const latest = item.progressUpdates[0] || null
    const hasToday = latest && new Date(latest.date).getTime() === today.getTime()
    return {
      id: item.id,
      kind,
      title: item.title,
      description: item.description,
      dueDate: item.dueDate,
      status: item.status,
      project: item.project || null,
      latestUpdate: latest ? { status: latest.status, note: latest.note, date: latest.date } : null,
      hasTodayUpdate: !!hasToday,
    }
  }

  const items = [
    ...tasks.map(t => shape(t, 'task')),
    ...personalTasks.map(t => shape(t, 'personal')),
  ]

  return NextResponse.json({
    items,
    deadlinePassed: isPastDeadlineWIB(),
    today: today.toISOString(),
  })
}

export async function POST(req) {
  // Create a personal (manual) to-do item
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
  }

  const item = await prisma.personalTask.create({
    data: {
      userId: session.user.id,
      title: body.title.trim(),
      description: body.description || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  })

  return NextResponse.json(item, { status: 201 })
}
