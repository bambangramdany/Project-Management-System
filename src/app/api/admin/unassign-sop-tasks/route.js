import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { SOP_TEMPLATES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Judul SOP task dari semua template
const ALL_SOP_TITLES = new Set(
  Object.values(SOP_TEMPLATES).flat().map(t => t.title)
)

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden — hanya OWNER' }, { status: 403 })
  }

  // Temukan semua task SOP yang masih assigned (belum ada progress update)
  const sopTasks = await prisma.task.findMany({
    where: {
      assigneeId: { not: null },
      title: { in: [...ALL_SOP_TITLES] },
      status: { not: 'DONE' },
    },
    select: { id: true, title: true, assigneeId: true, project: { select: { code: true, name: true } } },
  })

  if (sopTasks.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Tidak ada SOP task yang perlu di-unassign' })
  }

  // Un-assign semua
  const ids = sopTasks.map(t => t.id)
  await prisma.task.updateMany({
    where: { id: { in: ids } },
    data: { assigneeId: null },
  })

  return NextResponse.json({
    updated: ids.length,
    tasks: sopTasks.map(t => ({ title: t.title, project: `${t.project?.code} – ${t.project?.name}` })),
  })
}
