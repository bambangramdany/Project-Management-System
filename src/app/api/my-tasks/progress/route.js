import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function startOfTodayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function isPastDeadlineWIB() {
  const now = new Date()
  return now.getUTCHours() >= 13
}

const VALID_STATUSES = ['ON_TRACK', 'DELAYED', 'HOLD', 'PROBLEM', 'DONE']

// Upsert today's progress check-in for a project task or personal to-do item.
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { taskId, personalTaskId, status, note } = body

  if (!taskId && !personalTaskId) {
    return NextResponse.json({ error: 'taskId atau personalTaskId wajib diisi' }, { status: 400 })
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
  }
  if (['DELAYED', 'HOLD', 'PROBLEM'].includes(status) && (!note || !note.trim())) {
    return NextResponse.json({ error: 'Catatan wajib diisi jika progress Delayed, Hold, atau Bermasalah' }, { status: 400 })
  }

  // Ownership check
  if (taskId) {
    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task || task.assigneeId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  if (personalTaskId) {
    const pt = await prisma.personalTask.findUnique({ where: { id: personalTaskId } })
    if (!pt || pt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const today = startOfTodayUTC()
  const late = isPastDeadlineWIB()
  const data = { status, note: note || null, late, userId: session.user.id, date: today }

  const where = taskId
    ? { taskId_userId_date: { taskId, userId: session.user.id, date: today } }
    : { personalTaskId_userId_date: { personalTaskId, userId: session.user.id, date: today } }

  const update = await prisma.progressUpdate.upsert({
    where,
    create: { ...data, taskId: taskId || null, personalTaskId: personalTaskId || null },
    update: { status, note: note || null, late },
  })

  // If task marked DONE via progress update, sync task/personal status
  if (status === 'DONE') {
    if (taskId) await prisma.task.update({ where: { id: taskId }, data: { status: 'DONE' } })
    if (personalTaskId) await prisma.personalTask.update({ where: { id: personalTaskId }, data: { status: 'DONE' } })
  }

  return NextResponse.json(update)
}
