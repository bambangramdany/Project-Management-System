import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ACTIVE_STATUSES } from '@/lib/constants'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // format: YYYY-MM
  const year = searchParams.get('year') || new Date().getFullYear()

  // All active team members
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: { id: true, name: true, role: true, jobTitle: true, divisi: true },
    orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
  })

  // Projects in scope — active OR have event in current year
  const projectWhere = {
    OR: [
      { status: { in: ACTIVE_STATUSES } },
      {
        AND: [
          { startDate: { gte: new Date(`${year}-01-01`) } },
          { startDate: { lt: new Date(`${parseInt(year) + 1}-01-01`) } },
        ],
      },
    ],
  }

  if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    projectWhere.OR = [
      { status: { in: ACTIVE_STATUSES }, startDate: { gte: start, lt: end } },
      { startDate: { gte: start, lt: end } },
    ]
  }

  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: {
      id: true, code: true, name: true, status: true, category: true,
      startDate: true, endDate: true,
      picId: true,
      members: { select: { userId: true } },
    },
  })

  // Open (not-done) tasks assigned to anyone, scoped to projects in view
  const tasks = await prisma.task.findMany({
    where: {
      projectId: { in: projects.map(p => p.id) },
      status: { not: 'DONE' },
      assigneeId: { not: null },
    },
    select: {
      id: true, title: true, status: true, priority: true, dueDate: true,
      assigneeId: true, projectId: true,
    },
  })
  const projectInfo = {}
  projects.forEach(p => { projectInfo[p.id] = { code: p.code, name: p.name } })

  // Build workload map per user
  const workload = users.map(user => {
    const picProjects = projects.filter(p => p.picId === user.id)
    const memberProjects = projects.filter(p =>
      p.picId !== user.id && p.members.some(m => m.userId === user.id)
    )
    const allProjects = [...picProjects, ...memberProjects]

    const byStatus = {}
    for (const p of allProjects) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
    }

    // HOLD and WAITING_PITCH_RESULT projects don't carry meaningful workload yet.
    const baseActiveStatuses = ACTIVE_STATUSES.filter(s => !['HOLD', 'WAITING_PITCH_RESULT'].includes(s))

    // Roles other than PM/Director/Finance are not involved in reporting/invoicing —
    // their workload ends at EVENT_DAY, so those stages don't count as active for them.
    const involvedThroughClosing = ['PROJECT_MANAGER', 'DIRECTOR', 'FINANCE'].includes(user.role)
    const userActiveStatuses = involvedThroughClosing
      ? baseActiveStatuses
      : baseActiveStatuses.filter(s => !['REPORTING', 'INVOICING'].includes(s))

    return {
      user,
      totalProjects: allProjects.length,
      picCount: picProjects.length,
      memberCount: memberProjects.length,
      activeCount: allProjects.filter(p => userActiveStatuses.includes(p.status)).length,
      byStatus,
      projects: allProjects.map(p => ({
        id: p.id, code: p.code, name: p.name,
        status: p.status, category: p.category,
        startDate: p.startDate, endDate: p.endDate,
        isPic: p.picId === user.id,
      })),
      tasks: tasks.filter(t => t.assigneeId === user.id && (
        involvedThroughClosing ||
        !['REPORTING', 'INVOICING'].includes(projects.find(p => p.id === t.projectId)?.status)
      )).map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
        project: projectInfo[t.projectId] || null,
        projectId: t.projectId,
      })),
    }
  })

  // Sort by total active projects descending
  workload.sort((a, b) => b.activeCount - a.activeCount)

  return NextResponse.json(workload)
}
