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
  // light=1 : hanya data dasar, tanpa tasks/budget/health (untuk dropdown, finance, scores)
  // list=1  : untuk halaman list project — include tasks (health) tapi skip budgetItems (paling berat)
  const light = searchParams.get('light') === '1'
  const listMode = searchParams.get('list') === '1'

  const where = {}
  if (status) where.status = status
  if (category) where.category = category

  // Search: name, code, or client name
  const searchClause = search ? { OR: [
    { name: { contains: search, mode: 'insensitive' } },
    { code: { contains: search, mode: 'insensitive' } },
    { client: { name: { contains: search, mode: 'insensitive' } } },
  ]} : null

  // Non-managers only see their own projects
  const visibilityClause = !canViewAllProjects(session.user.role) ? { OR: [
    { picId: session.user.id },
    { members: { some: { userId: session.user.id } } },
  ]} : null

  // Combine search + visibility with AND so neither overwrites the other
  if (searchClause && visibilityClause) {
    where.AND = [searchClause, visibilityClause]
  } else if (searchClause) {
    where.OR = searchClause.OR
  } else if (visibilityClause) {
    where.OR = visibilityClause.OR
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, industry: true } },
      pic: { select: { id: true, name: true } },
      // list mode: cukup userId saja (untuk filter "project saya"), bukan full user object
      members: listMode
        ? { select: { userId: true } }
        : { include: { user: { select: { id: true, name: true, role: true } } } },
      ...(light ? {} : {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true, dueDate: true } },
        // list mode: skip budgetItems (berat, hanya dipakai untuk finance health detail)
        ...(listMode ? {} : { budgetItems: { select: { quotedAmount: true, actualAmount: true } } }),
      }),
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (light) return NextResponse.json(projects)

  const withHealth = projects.map(p => {
    const { tasks, budgetItems, ...rest } = p
    // list mode: normalise members → array of {user: {id}} compatible with client code
    if (listMode) {
      rest.members = (rest.members || []).map(m => ({ user: { id: m.userId } }))
    }
    return { ...rest, health: computeProjectHealth({ ...p, budgetItems: budgetItems ?? [] }) }
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
      quotationNumber:   body.quotationNumber || null,
      projectValue:      body.estimatedValue ? parseFloat(body.estimatedValue) : null,
      quotationDeadline: body.quotationDeadline ? new Date(body.quotationDeadline) : null,
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
