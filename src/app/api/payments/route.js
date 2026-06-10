import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canRequestPayment, canViewBudget } from '@/lib/rbac'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const projectId = searchParams.get('projectId')

  const where = {}
  if (status) where.status = status
  if (projectId) where.projectId = projectId

  const role = session.user.role
  const userId = session.user.id
  const divisi = session.user.divisi

  // Scope visibility based on role
  if (role === 'OWNER' || role === 'FINANCE') {
    // see all
  } else if (role === 'DIRECTOR') {
    where.project = { division: divisi }
  } else {
    // PM/others: only their own requests or projects they're PIC of
    where.OR = [
      { requestedById: userId },
      { project: { picId: userId } },
    ]
  }

  const payments = await prisma.paymentRequest.findMany({
    where,
    include: {
      project: { select: { id: true, code: true, name: true, division: true, picId: true } },
      requestedBy: { select: { id: true, name: true } },
      director: { select: { id: true, name: true } },
      financeDirector: { select: { id: true, name: true } },
      financeBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(payments)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.projectId || !body.category || !body.amount) {
    return NextResponse.json({ error: 'projectId, category, dan amount wajib diisi' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: body.projectId } })
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })

  if (!canRequestPayment(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Match/create a forecast line item by label so this request shows up against
  // the project's budget forecast and reduces the remaining "sisa" amount there.
  let budgetItemId = body.budgetItemId || null
  const label = (body.budgetItemLabel || '').trim()
  if (!budgetItemId && label) {
    const existing = await prisma.projectBudgetItem.findFirst({
      where: { projectId: body.projectId, label: { equals: label, mode: 'insensitive' } },
    })
    if (existing) {
      budgetItemId = existing.id
    } else {
      const created = await prisma.projectBudgetItem.create({
        data: { projectId: body.projectId, label, quotedAmount: 0 },
      })
      budgetItemId = created.id
    }
  }

  const payment = await prisma.paymentRequest.create({
    data: {
      projectId: body.projectId,
      requestedById: session.user.id,
      category: body.category,
      budgetItemId,
      amount: parseFloat(body.amount),
      vendor: body.vendor || null,
      recipientName: body.recipientName || null,
      recipientAccount: body.recipientAccount || null,
      paymentTerm: body.paymentTerm || 'FULL',
      description: body.description || null,
      neededDate: body.neededDate ? new Date(body.neededDate) : null,
    },
    include: {
      project: { select: { id: true, code: true, name: true, division: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  })

  // Notify the division director (or Owner) who needs to approve this first
  const approvers = await prisma.user.findMany({
    where: { OR: [{ role: 'OWNER' }, { role: 'DIRECTOR', divisi: project.division }] },
    select: { id: true },
  })
  await Promise.all(approvers.map(u => notifyUser({
    userId: u.id, type: 'PAYMENT_APPROVAL',
    title: 'Pengajuan Pembayaran Baru',
    message: `${project.name}: Rp ${Math.round(payment.amount).toLocaleString('id-ID')} (${payment.vendor || '-'}) menunggu approval Anda.`,
    link: '/finance',
  })))

  return NextResponse.json(payment, { status: 201 })
}
