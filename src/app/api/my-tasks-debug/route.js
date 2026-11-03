import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ step: 'no-session' }, { status: 401 })

    const userId = session.user.id
    const [totalAssigned, doneAssigned, activeTasks] = await Promise.all([
      prisma.task.count({ where: { assigneeId: userId } }),
      prisma.task.count({ where: { assigneeId: userId, status: 'DONE' } }),
      prisma.task.findMany({
        where: { assigneeId: userId, status: { not: 'DONE' } },
        select: { id: true, title: true, status: true, dueDate: true, project: { select: { code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])
    const personalCount = await prisma.personalTask.count({ where: { userId } })

    return NextResponse.json({
      ok: true, userId,
      role: session.user.role,
      divisi: session.user.divisi,
      totalAssigned,
      doneAssigned,
      activeCount: totalAssigned - doneAssigned,
      activeTasks,
      personalCount,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e), stack: e.stack?.slice(0, 500) }, { status: 500 })
  }
}
