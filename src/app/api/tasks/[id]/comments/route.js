import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const comments = await prisma.taskComment.findMany({
    where: { taskId: params.id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Komentar tidak boleh kosong' }, { status: 400 })

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, picId: true, members: { include: { user: { select: { id: true, name: true } } } } } },
    },
  })
  if (!task) return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 })

  const comment = await prisma.taskComment.create({
    data: { taskId: params.id, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true } } },
  })

  // Build list of candidates eligible to be @mentioned: PIC + members
  const candidates = [
    ...(task.project.picId ? [{ id: task.project.picId, name: (await prisma.user.findUnique({ where: { id: task.project.picId }, select: { name: true } }))?.name }] : []),
    ...task.project.members.map(m => m.user),
  ].filter(c => c.name)

  const notifiedIds = new Set()
  const link = `/projects/${task.project.id}`

  // @mentions
  for (const c of candidates) {
    if (!c.name) continue
    const tag = c.name.replace(/\s+/g, '_').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const tagPattern = new RegExp(`@${tag}\\b`, 'i')
    if (tagPattern.test(content) && c.id !== session.user.id && !notifiedIds.has(c.id)) {
      notifiedIds.add(c.id)
      await notifyUser({
        userId: c.id,
        type: 'TASK_COMMENT_MENTION',
        title: `Anda disebut di task "${task.title}"`,
        message: `${session.user.name}: ${content.trim().slice(0, 200)}`,
        link,
      })
    }
  }

  // Notify task assignee on new comment (if not the author and not already notified)
  if (task.assigneeId && task.assigneeId !== session.user.id && !notifiedIds.has(task.assigneeId)) {
    notifiedIds.add(task.assigneeId)
    await notifyUser({
      userId: task.assigneeId,
      type: 'TASK_COMMENT',
      title: `Komentar baru di task "${task.title}"`,
      message: `${session.user.name}: ${content.trim().slice(0, 200)}`,
      link,
    })
  }

  return NextResponse.json(comment)
}
