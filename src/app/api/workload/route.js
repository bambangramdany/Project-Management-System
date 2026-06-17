import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { ACTIVE_STATUSES, DEFAULT_WORKLOAD_WEIGHTS, STATUS_PIPELINE } from '@/lib/constants'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // format: YYYY-MM
  const year = searchParams.get('year') || new Date().getFullYear()
  const dateFrom = searchParams.get('dateFrom') // YYYY-MM-DD
  const dateTo = searchParams.get('dateTo')     // YYYY-MM-DD

  // Akun sistem internal yang disembunyikan dari workload & semua proses project
  const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

  // All active team members
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', email: { notIn: HIDDEN_EMAILS } },
    select: { id: true, name: true, role: true, jobTitle: true, divisi: true },
    orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
  })

  // Projects in scope — based on date range or fallback to year/month
  let projectWhere = {}

  if (dateFrom || dateTo) {
    const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01')
    const to = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : new Date()
    // Include: active projects OR projects with startDate within range OR currently spanning the range
    projectWhere = {
      OR: [
        { status: { in: ACTIVE_STATUSES } },
        { startDate: { gte: from, lte: to } },
        { AND: [{ startDate: { lte: to } }, { OR: [{ endDate: { gte: from } }, { endDate: null }] }] },
      ],
    }
  } else if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)
    projectWhere = {
      OR: [
        { status: { in: ACTIVE_STATUSES }, startDate: { gte: start, lt: end } },
        { startDate: { gte: start, lt: end } },
      ],
    }
  } else {
    projectWhere = {
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

  // Configurable workload weights per status (PIC vs other members)
  const weightRows = await prisma.workloadWeight.findMany()
  const weights = {}
  for (const s of STATUS_PIPELINE) weights[s] = DEFAULT_WORKLOAD_WEIGHTS[s]
  weightRows.forEach(r => { weights[r.status] = { picWeight: r.picWeight, memberWeight: r.memberWeight } })

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

    // Whether `user` is actually involved in `p` at its current stage:
    // - HOLD: nobody has active workload yet
    // - WAITING_PITCH_RESULT: only the PM/PIC is waiting on the result
    // - REPORTING / INVOICING: only PM/PIC and Finance handle closing — creative,
    //   production, design, etc. are done once Event Day wraps up
    // - everything else (PITCHING, PREPARATION, EVENT_DAY): whole tagged team
    const isInvolved = (p) => {
      const isPic = p.picId === user.id
      switch (p.status) {
        case 'HOLD': return false
        case 'WAITING_PITCH_RESULT': return isPic
        case 'REPORTING':
        case 'INVOICING': return isPic || user.role === 'FINANCE'
        default: return ACTIVE_STATUSES.includes(p.status)
      }
    }

    const involvedProjects = allProjects.filter(isInvolved)

    // Weighted workload score — uses configurable per-status weights, with the
    // PIC weight applying to the project's PIC and memberWeight to everyone else.
    const loadScore = involvedProjects.reduce((sum, p) => {
      const w = weights[p.status] || DEFAULT_WORKLOAD_WEIGHTS[p.status]
      return sum + (p.picId === user.id ? w.picWeight : w.memberWeight)
    }, 0)

    return {
      user,
      totalProjects: allProjects.length,
      picCount: picProjects.length,
      memberCount: memberProjects.length,
      activeCount: involvedProjects.length,
      loadScore: Math.round(loadScore * 10) / 10,
      byStatus,
      projects: allProjects.map(p => ({
        id: p.id, code: p.code, name: p.name,
        status: p.status, category: p.category,
        startDate: p.startDate, endDate: p.endDate,
        isPic: p.picId === user.id,
        involved: isInvolved(p),
      })),
      tasks: tasks.filter(t => {
        if (t.assigneeId !== user.id) return false
        const proj = projects.find(pr => pr.id === t.projectId)
        return proj ? isInvolved(proj) : true
      }).map(t => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate,
        project: projectInfo[t.projectId] || null,
        projectId: t.projectId,
      })),
    }
  })

  // Sort by weighted workload score descending
  workload.sort((a, b) => b.loadScore - a.loadScore)

  return NextResponse.json(workload)
}
