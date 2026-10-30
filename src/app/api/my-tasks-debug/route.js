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
    const step1 = await prisma.task.count({ where: { assigneeId: userId } })
    const step2 = await prisma.personalTask.count({ where: { userId } })
    const step3 = await prisma.task.count({ where: { status: { not: 'DONE' } } })

    return NextResponse.json({ ok: true, userId, step1, step2, step3, role: session.user.role })
  } catch (e) {
    return NextResponse.json({ error: String(e), stack: e.stack?.slice(0, 500) }, { status: 500 })
  }
}
