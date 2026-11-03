import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'DIRECTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [users, taskCounts] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, role: true, divisi: true, employeeStatus: true },
      orderBy: { name: 'asc' },
    }),
    prisma.task.groupBy({
      by: ['assigneeId', 'status'],
      _count: { id: true },
      where: { assigneeId: { not: null } },
    }),
  ])

  // Ambil sample task aktif per user yang punya task
  const activeTasksByUser = await prisma.task.findMany({
    where: { status: { not: 'DONE' }, assigneeId: { not: null } },
    select: {
      assigneeId: true,
      title: true,
      status: true,
      dueDate: true,
      project: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Build map: userId → { total, done, active, tasks[] }
  const countMap = {}
  for (const row of taskCounts) {
    const uid = row.assigneeId
    if (!countMap[uid]) countMap[uid] = { total: 0, done: 0, active: 0 }
    countMap[uid].total += row._count.id
    if (row.status === 'DONE') countMap[uid].done += row._count.id
    else countMap[uid].active += row._count.id
  }
  const sampleMap = {}
  for (const t of activeTasksByUser) {
    if (!sampleMap[t.assigneeId]) sampleMap[t.assigneeId] = []
    if (sampleMap[t.assigneeId].length < 3) sampleMap[t.assigneeId].push({
      title: t.title, status: t.status,
      project: t.project ? `${t.project.code} – ${t.project.name}` : null,
      dueDate: t.dueDate,
    })
  }

  const result = users.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    divisi: u.divisi,
    employeeStatus: u.employeeStatus,
    totalAssigned: countMap[u.id]?.total ?? 0,
    doneCount: countMap[u.id]?.done ?? 0,
    activeCount: countMap[u.id]?.active ?? 0,
    activeSample: sampleMap[u.id] || [],
  }))

  // Pisahkan: ada task aktif vs tidak ada sama sekali
  const withActive  = result.filter(u => u.activeCount > 0).sort((a, b) => b.activeCount - a.activeCount)
  const noActive    = result.filter(u => u.activeCount === 0 && u.totalAssigned > 0)
  const neverAssigned = result.filter(u => u.totalAssigned === 0)

  return NextResponse.json({ withActive, noActive, neverAssigned })
}
