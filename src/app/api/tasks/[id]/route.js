import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status } = body

  // Enforce dependency lock: cannot complete task if required tasks are not done
  if (status === 'DONE') {
    const deps = await prisma.taskDependency.findMany({
      where: { dependentTaskId: params.id },
      include: { requiredTask: true },
    })
    const blocked = deps.filter(d => d.requiredTask.status !== 'DONE')
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `Task terkunci. Selesaikan dulu: ${blocked.map(d => d.requiredTask.title).join(', ')}` },
        { status: 400 }
      )
    }
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(body.priority && { priority: body.priority }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.openEnded !== undefined && { openEnded: body.openEnded }),
    },
    include: { assignee: { select: { id: true, name: true } } },
  })

  // When task is done, unblock dependents that now have all requirements met
  if (status === 'DONE') {
    const dependents = await prisma.taskDependency.findMany({
      where: { requiredTaskId: params.id },
      select: { dependentTaskId: true },
    })
    for (const { dependentTaskId } of dependents) {
      const allDeps = await prisma.taskDependency.findMany({
        where: { dependentTaskId },
        include: { requiredTask: true },
      })
      const allDone = allDeps.every(d => d.requiredTask.status === 'DONE')
      if (allDone) {
        await prisma.task.updateMany({
          where: { id: dependentTaskId, status: 'BLOCKED' },
          data: { status: 'TODO' },
        })
      }
    }
  }

  // When undoing done, re-block dependents
  if (status && status !== 'DONE') {
    const dependents = await prisma.taskDependency.findMany({
      where: { requiredTaskId: params.id },
      select: { dependentTaskId: true },
    })
    for (const { dependentTaskId } of dependents) {
      await prisma.task.updateMany({
        where: { id: dependentTaskId, status: { notIn: ['DONE', 'BLOCKED'] } },
        data: { status: 'BLOCKED' },
      })
    }
  }

  return NextResponse.json(task)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
