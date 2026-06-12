import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewAllProjects } from '@/lib/rbac'
import { computeProjectHealth } from '@/lib/health'
import { SOP_TEMPLATES } from '@/lib/constants'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  // Lightweight mode: skip tasks/budgetItems/health computation for pages that
  // only need basic project info (finance dropdowns, calendar, scores list).
  const light = searchParams.get('light') === '1'

  const where = {}
  if (status) where.status = status
  if (category) where.category = category
  if (search) where.name = { contains: search, mode: 'insensitive' }

  // Non-managers only see their own projects
  if (!canViewAllProjects(session.user.role)) {
    where.OR = [
      { picId: session.user.id },
      { members: { some: { userId: session.user.id } } },
    ]
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, industry: true } },
      pic: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, role: true } } } },
      ...(light ? {} : {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true, dueDate: true } },
        budgetItems: { select: { quotedAmount: true, actualAmount: true } },
      }),
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (light) return NextResponse.json(projects)

  const withHealth = projects.map(p => {
    const { tasks, budgetItems, ...rest } = p
    return { ...rest, health: computeProjectHealth(p) }
  })

  return NextResponse.json(withHealth)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewAllProjects(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Auto-generate code
  const count = await prisma.project.count()
  const code = `P-${String(count + 1).padStart(3, '0')}`

  const project = await prisma.project.create({
    data: {
      code,
      name: body.name,
      clientId: body.clientId || null,
      category: body.category,
      budgetTier: body.budgetTier || null,
      eventComplexity: body.eventComplexity || null,
      recommendation: body.recommendation || null,
      picId: body.picId || null,
      division: body.division || 'EVENT',
      briefDate: body.briefDate ? new Date(body.briefDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      loadInDays: body.loadInDays ? parseInt(body.loadInDays) : 0,
      status: body.status || 'HOLD',
      pitchStatus: body.pitchStatus || null,
      notes: body.notes || null,
    },
    include: { client: true, pic: true },
  })

  // Auto-generate SOP checklist tasks for this project's category, unless the
  // caller explicitly opted out.
  if (body.applySopTemplate !== false) {
    const template = SOP_TEMPLATES[project.category]
    if (template && template.length > 0) {
      await prisma.task.createMany({
        data: template.map((t, idx) => ({
          projectId: project.id,
          title: t.title,
          priority: t.priority || 'MEDIUM',
          assigneeId: project.picId || null,
          order: idx,
        })),
      })
    }
  }

  return NextResponse.json(project, { status: 201 })
}
