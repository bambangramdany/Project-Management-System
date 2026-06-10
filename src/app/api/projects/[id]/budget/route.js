import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewBudget, canEditBudget, canViewMargin, canEditProjectValue, canLockBudget } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { budgetLockedBy: { select: { id: true, name: true } } },
  })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (!canViewBudget(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const items = await prisma.projectBudgetItem.findMany({
    where: { projectId: params.id },
    orderBy: { order: 'asc' },
    include: { payments: { select: { id: true, amount: true, status: true, vendor: true, createdAt: true } } },
  })
  // Status of each forecast item is derived from its linked payment requests
  const budgetItems = items.map(item => {
    const active = item.payments.filter(p => p.status !== 'REJECTED')
    const requested = active.reduce((sum, p) => sum + p.amount, 0)
    const paid = active.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0)
    let paymentStatus = 'BELUM_DIAJUKAN'
    if (active.length > 0) {
      if (active.every(p => p.status === 'PAID')) paymentStatus = 'LUNAS'
      else if (active.some(p => p.status === 'PAID')) paymentStatus = 'SEBAGIAN'
      else if (active.some(p => p.status === 'APPROVED_BY_DIRECTOR')) paymentStatus = 'DISETUJUI'
      else paymentStatus = 'DIAJUKAN'
    }
    const base = item.actualAmount ?? item.quotedAmount
    return { ...item, requestedTotal: requested, paidTotal: paid, remaining: base - paid, paymentStatus }
  })
  const canNote = ['OWNER', 'FINANCE', 'DIRECTOR'].includes(session.user.role)
  return NextResponse.json({
    budgetItems,
    projectValue: project.projectValue,
    canViewMargin: canViewMargin(session.user, project),
    canEditProjectValue: canEditProjectValue(session.user, project),
    canEditBudget: canEditBudget(session.user, project),
    canNote,
    canLockBudget: canLockBudget(session.user, project),
    budgetLockedAt: project.budgetLockedAt,
    budgetLockedBy: project.budgetLockedBy,
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

  const body = await req.json() // { items: [{ id?, label, quotedAmount, actualAmount, neededDate, note }], projectValue, lockAction }

  // Lock/unlock the baseline forecast
  if (body.lockAction === 'lock' || body.lockAction === 'unlock') {
    if (!canLockBudget(session.user, project)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await prisma.project.update({
      where: { id: params.id },
      data: body.lockAction === 'lock'
        ? { budgetLockedAt: new Date(), budgetLockedById: session.user.id }
        : { budgetLockedAt: null, budgetLockedById: null },
    })
  }

  const isLocked = !!project.budgetLockedAt && body.lockAction !== 'unlock'

  if (canEdit && !isLocked) {
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
  } else if (canEdit && isLocked && Array.isArray(body.items)) {
    // Forecast is locked: only actualAmount and note can still be updated on existing rows
    await Promise.all(body.items.filter(i => i.id).map(item => {
      const data = {
        actualAmount: item.actualAmount === '' || item.actualAmount === null || item.actualAmount === undefined ? null : (parseFloat(item.actualAmount) || 0),
      }
      if (canNote) data.note = item.note || null
      return prisma.projectBudgetItem.update({ where: { id: item.id }, data })
    }))
  } else if (canNote && Array.isArray(body.items)) {
    // Finance/Director-only: update notes without touching amounts
    await Promise.all(body.items.filter(i => i.id).map(item =>
      prisma.projectBudgetItem.update({ where: { id: item.id }, data: { note: item.note || null } })
    ))
  }

  const budgetItems = await prisma.projectBudgetItem.findMany({ where: { projectId: params.id }, orderBy: { order: 'asc' } })
  return NextResponse.json({ budgetItems })
}
