import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.meetingActionItem.findUnique({
    where: { id: params.itemId },
    include: { meetingNote: true },
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (item.taskId) return NextResponse.json({ error: 'Sudah dikonversi ke Task' }, { status: 400 })

  const task = await prisma.task.create({
    data: {
      projectId: params.id,
      title: item.description,
      assigneeId: item.assigneeId || null,
      dueDate: item.dueDate || null,
      priority: 'MEDIUM',
    },
  })

  await prisma.meetingActionItem.update({
    where: { id: params.itemId },
    data: { taskId: task.id },
  })

  return NextResponse.json({ task })
}
