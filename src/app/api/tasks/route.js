import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const lastTask = await prisma.task.findFirst({
    where: { projectId: body.projectId },
    orderBy: { order: 'desc' },
  })

  const task = await prisma.task.create({
    data: {
      projectId: body.projectId,
      title: body.title,
      description: body.description || null,
      assigneeId: body.assigneeId || null,
      status: body.status || 'TODO',
      priority: body.priority || 'MEDIUM',
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      openEnded: body.openEnded || false,
      order: (lastTask?.order ?? 0) + 1,
    },
    include: { assignee: { select: { id: true, name: true } } },
  })

  // Add dependencies
  if (body.dependsOn?.length) {
    await prisma.taskDependency.createMany({
      data: body.dependsOn.map(reqId => ({ dependentTaskId: task.id, requiredTaskId: reqId })),
      skipDuplicates: true,
    })
  }

  // Notify assignee of new task
  if (task.assigneeId && task.assigneeId !== session.user.id) {
    const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { code: true, name: true } })
    await notifyUser({
      userId: task.assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'Task baru ditugaskan untukmu',
      message: `${task.title} — ${project?.code} ${project?.name}`,
      link: `/projects/${body.projectId}`,
    })
  }

  return NextResponse.json(task, { status: 201 })
}
