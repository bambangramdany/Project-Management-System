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

  const budgetItems = await prisma.projectBudgetItem.findMany({ where: { projectId: params.id }, orderBy: { order: 'asc' } })
  const canNote = ['OWNER', 'FINANCE', 'DIRECTOR'].includes(session.user.role)
  return NextResponse.json({
    budgetItems,
    projectValue: project.projectValue,
    canViewMargin: canViewMargin(session.user, project),
    canEditProjectValue: canEditProjectValue(session.user, project),
    canEditBudget: canEditBudget(session.user, project),
    canNote,
  })
}

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const canEdit = canEditBudget(session.user, project)
  const canNote = ['OWNER', 'FINANCE', 'DIRECTOR'].includes(session.user.role)
  if (!canEdit && !canNote) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() // { items: [{ id?, label, quotedAmount, actualAmount, neededDate, note }], projectValue }

  if (canEdit) {
    const items = Array.isArray(body.items) ? body.items : []

    // Replace-all: delete removed rows, upsert the rest
    const keepIds = items.filter(i => i.id).map(i => i.id)
    await prisma.projectBudgetItem.deleteMany({
      where: { projectId: params.id, id: { notIn: keepIds.length ? keepIds : ['__none__'] } },
    })

    await Promise.all(items.map((item, idx) => {
      const data = {
        label: item.label || '',
        quotedAmount: parseFloat(item.quotedAmount) || 0,
        actualAmount: item.actualAmount === '' || item.actualAmount === null || item.actualAmount === undefined ? null : (parseFloat(item.actualAmount) || 0),
        neededDate: item.neededDate ? new Date(item.neededDate) : null,
        order: idx,
      }
      if (canNote) data.note = item.note || null
      // Reset reminder flag whenever the row is edited so date changes get a fresh reminder
      data.reminderSentAt = null
      if (item.id) {
        return prisma.projectBudgetItem.update({ where: { id: item.id }, data })
      }
      return prisma.projectBudgetItem.create({ data: { ...data, projectId: params.id } })
    }))

    if (body.projectValue !== undefined && canEditProjectValue(session.user, project)) {
      await prisma.project.update({
        where: { id: params.id },
        data: { projectValue: body.projectValue === '' || body.projectValue === null ? null : parseFloat(body.projectValue) || 0 },
      })
    }
  } else if (canNote && Array.isArray(body.items)) {
    // Finance/Director-only: update notes without touching amounts
    await Promise.all(body.items.filter(i => i.id).map(item =>
      prisma.projectBudgetItem.update({ where: { id: item.id }, data: { note: item.note || null } })
    ))
  }

  const budgetItems = await prisma.projectBudgetItem.findMany({ where: { projectId: params.id }, orderBy: { order: 'asc' } })
  return NextResponse.json({ budgetItems })
}
