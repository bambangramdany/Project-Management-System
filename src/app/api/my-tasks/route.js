import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

const DIV_LABEL = {
  EVENT:        'Tim Event Organizer (EO)',
  CREATIVE:     'Tim Creative',
  PH:           'Tim Production House (PH)',
  FINANCE_HRGA: 'Tim Finance / HR & GA',
}

// Kembalikan divisi tim yang ditampilkan, dalam urutan yang benar per role.
// null  = OWNER (lihat semua divisi)
// []    = user biasa (tidak ada tim)
// [...] = urutan divisi yang ditampilkan sebagai grup tim
function getTeamDivisions(user) {
  const { role, divisi } = user
  if (role === 'OWNER') return null
  if (role === 'DIRECTOR' || role === 'PROJECT_MANAGER') {
    if (divisi === 'EVENT')        return ['EVENT', 'CREATIVE']
    if (divisi === 'CREATIVE')     return ['CREATIVE']
    if (divisi === 'PH')           return ['PH']
    if (divisi === 'FINANCE_HRGA') return ['FINANCE_HRGA', 'EVENT', 'CREATIVE', 'PH']
  }
  // Bima: FINANCE_STAFF FINANCE_HRGA → lihat semua tim operasional
  if (role === 'FINANCE_STAFF' && divisi === 'FINANCE_HRGA') return ['EVENT', 'CREATIVE', 'PH']
  return []
}

function startOfTodayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function isPastDeadlineWIB() {
  const now = new Date()
  return now.getUTCHours() >= 13
}

function shapeItem(item, kind, today, userId) {
  const uid = userId || item.assigneeId || item.userId
  const latest = (item.progressUpdates || []).find(u => u.userId === uid) || item.progressUpdates?.[0] || null
  const hasToday = latest && new Date(latest.date).getTime() === today.getTime()
  return {
    id: item.id,
    kind,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    status: item.status,
    project: item.project || null,
    clientName: item.clientName || item.project?.client?.name || null,
    projectName: item.projectName || item.project?.name || null,
    assignee: item.assignee || item.user || null,
    latestUpdate: latest ? { status: latest.status, note: latest.note, date: latest.date } : null,
    hasTodayUpdate: !!hasToday,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const today = startOfTodayUTC()
  const teamDivisions = getTeamDivisions(session.user)

  // ── OWNER: lihat semua tim, grouped per divisi (mode lama) ─────────────────
  if (teamDivisions === null) {
    const DIV_ORDER = ['EVENT', 'CREATIVE', 'PH', 'FINANCE_HRGA']
    const [allTasks, allPersonalTasks, allUsers] = await Promise.all([
      prisma.task.findMany({
        where: { status: { not: 'DONE' }, assignee: { email: { notIn: HIDDEN_EMAILS } } },
        include: {
          project: { select: { id: true, code: true, name: true, status: true, division: true, client: { select: { name: true } } } },
          assignee: { select: { id: true, name: true, divisi: true, role: true } },
          progressUpdates: { orderBy: { date: 'desc' }, take: 5 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.personalTask.findMany({
        where: { status: { not: 'DONE' }, user: { email: { notIn: HIDDEN_EMAILS } } },
        include: {
          project: { select: { id: true, code: true, name: true, status: true, division: true, client: { select: { name: true } } } },
          user: { select: { id: true, name: true, divisi: true, role: true } },
          progressUpdates: { orderBy: { date: 'desc' }, take: 5 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.user.findMany({
        where: { employeeStatus: 'ACTIVE', email: { notIn: HIDDEN_EMAILS } },
        select: { id: true, name: true, divisi: true, role: true },
        orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
      }),
    ])
    const userDivMap = {}
    for (const u of allUsers) userDivMap[u.id] = u.divisi || 'EVENT'
    const shapeTask = (item, kind) => {
      const uid = kind === 'task' ? item.assigneeId : item.userId
      return { ...shapeItem(item, kind, today, uid), _divisi: userDivMap[uid] || 'EVENT' }
    }
    const allItems = [
      ...allTasks.map(t => shapeTask(t, 'task')),
      ...allPersonalTasks.map(t => shapeTask(t, 'personal')),
    ]
    const groups = DIV_ORDER.map(div => ({
      divisi: div,
      label: DIV_LABEL[div] || div,
      items: allItems.filter(i => i._divisi === div),
    })).filter(g => g.items.length > 0)

    return NextResponse.json({ mode: 'director', groups, deadlinePassed: isPastDeadlineWIB(), today: today.toISOString() })
  }

  // ── DIRECTOR / PM / FINANCE_STAFF dengan tim: mode team_lead ──────────────
  // Tampilkan: (1) task sendiri — bisa di-edit, (2) task tim per divisi — read-only
  if (teamDivisions.length > 0) {
    const [myTasks, myPersonalTasks, teamTasks, teamPersonalTasks, allUsers, memberProjects] = await Promise.all([
      // Task sendiri
      prisma.task.findMany({
        where: { assigneeId: userId, status: { not: 'DONE' } },
        include: {
          project: { select: { id: true, code: true, name: true, status: true, client: { select: { name: true } } } },
          progressUpdates: { where: { userId }, orderBy: { date: 'desc' }, take: 1 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.personalTask.findMany({
        where: { userId, status: { not: 'DONE' } },
        include: {
          project: { select: { id: true, code: true, name: true, status: true, client: { select: { name: true } } } },
          progressUpdates: { where: { userId }, orderBy: { date: 'desc' }, take: 1 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      // Task tim (semua divisi yang relevan, EXCLUDE diri sendiri)
      prisma.task.findMany({
        where: {
          status: { not: 'DONE' },
          assigneeId: { not: userId },
          assignee: {
            divisi: { in: teamDivisions },
            email: { notIn: HIDDEN_EMAILS },
          },
        },
        include: {
          project: { select: { id: true, code: true, name: true, status: true, client: { select: { name: true } } } },
          assignee: { select: { id: true, name: true, divisi: true, role: true } },
          progressUpdates: { orderBy: { date: 'desc' }, take: 5 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.personalTask.findMany({
        where: {
          status: { not: 'DONE' },
          userId: { not: userId },
          user: {
            divisi: { in: teamDivisions },
            email: { notIn: HIDDEN_EMAILS },
          },
        },
        include: {
          project: { select: { id: true, code: true, name: true, status: true, client: { select: { name: true } } } },
          user: { select: { id: true, name: true, divisi: true, role: true } },
          progressUpdates: { orderBy: { date: 'desc' }, take: 5 },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.user.findMany({
        where: { employeeStatus: 'ACTIVE', email: { notIn: HIDDEN_EMAILS } },
        select: { id: true, name: true, divisi: true },
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { picId: userId },
            { members: { some: { userId } } },
            { tasks: { some: { assigneeId: userId } } },
          ],
        },
        select: { id: true, code: true, name: true, client: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    // Task diri sendiri
    const myItems = [
      ...myTasks.map(t => shapeItem(t, 'task', today, userId)),
      ...myPersonalTasks.map(t => shapeItem(t, 'personal', today, userId)),
    ]

    // Map userId → divisi untuk task tim
    const userDivMap = {}
    for (const u of allUsers) userDivMap[u.id] = u.divisi || 'EVENT'

    const shapeTeamTask = (item, kind) => {
      const uid = kind === 'task' ? item.assigneeId : item.userId
      return { ...shapeItem(item, kind, today, uid), _divisi: userDivMap[uid] || 'EVENT' }
    }
    const allTeamItems = [
      ...teamTasks.map(t => shapeTeamTask(t, 'task')),
      ...teamPersonalTasks.map(t => shapeTeamTask(t, 'personal')),
    ]

    // Grup per divisi, sesuai urutan teamDivisions
    const groups = teamDivisions.map(div => ({
      divisi: div,
      label: DIV_LABEL[div] || div,
      items: allTeamItems.filter(i => i._divisi === div),
    }))

    return NextResponse.json({
      mode: 'team_lead',
      myItems,
      groups,
      deadlinePassed: isPastDeadlineWIB(),
      today: today.toISOString(),
      projectOptions: memberProjects.map(p => ({ id: p.id, code: p.code, name: p.name, clientName: p.client?.name || null })),
    })
  }

  // ── USER BIASA: hanya tugas sendiri ────────────────────────────────────────
  const [tasks, personalTasks, memberProjects] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId, status: { not: 'DONE' } },
      include: {
        project: { select: { id: true, code: true, name: true, status: true, client: { select: { name: true } } } },
        progressUpdates: { where: { userId }, orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.personalTask.findMany({
      where: { userId, status: { not: 'DONE' } },
      include: {
        project: { select: { id: true, code: true, name: true, status: true, client: { select: { name: true } } } },
        progressUpdates: { where: { userId }, orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { picId: userId },
          { members: { some: { userId } } },
          { tasks: { some: { assigneeId: userId } } },
        ],
      },
      select: { id: true, code: true, name: true, client: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const items = [
    ...tasks.map(t => shapeItem(t, 'task', today, userId)),
    ...personalTasks.map(t => shapeItem(t, 'personal', today, userId)),
  ]

  return NextResponse.json({
    mode: 'personal',
    items,
    deadlinePassed: isPastDeadlineWIB(),
    today: today.toISOString(),
    projectOptions: memberProjects.map(p => ({ id: p.id, code: p.code, name: p.name, clientName: p.client?.name || null })),
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 })
  }

  const item = await prisma.personalTask.create({
    data: {
      userId: session.user.id,
      title: body.title.trim(),
      description: body.description || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: body.projectId || null,
      clientName: body.projectId ? null : (body.clientName || null),
      projectName: body.projectId ? null : (body.projectName || null),
    },
    include: { project: { select: { id: true, code: true, name: true, client: { select: { name: true } } } } },
  })

  return NextResponse.json(item, { status: 201 })
}
