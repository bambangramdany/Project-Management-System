import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewBudget, canEditBudget, canViewMargin, canEditProjectValue } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (!canViewBudget(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const budgets = await prisma.projectBudget.findMany({ where: { projectId: params.id } })
  return NextResponse.json({
    budgets,
    projectValue: project.projectValue,
    canViewMargin: canViewMargin(session.user, project),
    canEditProjectValue: canEditProjectValue(session.user, project),
  })
}

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (!canEditBudget(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() // { items: [{ category, amount }] }
  const items = Array.isArray(body.items) ? body.items : []

  await Promise.all(items.map(item =>
    prisma.projectBudget.upsert({
      where: { projectId_category: { projectId: params.id, category: item.category } },
      update: { amount: parseFloat(item.amount) || 0, neededDate: item.neededDate ? new Date(item.neededDate) : null },
      create: { projectId: params.id, category: item.category, amount: parseFloat(item.amount) || 0, neededDate: item.neededDate ? new Date(item.neededDate) : null },
    })
  ))

  if (body.projectValue !== undefined) {
    const { canEditProjectValue } = await import('@/lib/rbac')
    if (canEditProjectValue(session.user, project)) {
      await prisma.project.update({
        where: { id: params.id },
        data: { projectValue: body.projectValue === '' || body.projectValue === null ? null : parseFloat(body.projectValue) || 0 },
      })
    }
  }

  const budgets = await prisma.projectBudget.findMany({ where: { projectId: params.id } })
  return NextResponse.json(budgets)
}
