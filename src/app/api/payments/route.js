import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canRequestPayment, canViewBudget } from '@/lib/rbac'
import { getOwnerApprovalThreshold } from '@/lib/settings'
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
  if (role === 'OWNER' || role === 'FINANCE' || (role === 'DIRECTOR' && divisi === 'FINANCE_HRGA')) {
    // Finance & HRGA Director (Anung) approves/pays everything, so sees all — same as Owner/Finance
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
      owner: { select: { id: true, name: true } },
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
  if (!body.projectId || !body.amount) {
    return NextResponse.json({ error: 'projectId dan amount wajib diisi' }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: body.projectId } })
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })

  if (!canRequestPayment(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!project.quotationNumber || !project.quotationNumber.trim()) {
    return NextResponse.json({ error: 'Nomor quotation untuk project ini belum diisi. Lengkapi nomor quotation di halaman Finance project sebelum mengajukan pembayaran.' }, { status: 400 })
  }

  const budgetItemCount = await prisma.projectBudgetItem.count({ where: { projectId: body.projectId } })
  if (budgetItemCount === 0) {
    return NextResponse.json({ error: 'Forecast budget project ini belum diisi oleh PM/PIC. Lengkapi forecast budget terlebih dahulu sebelum mengajukan pembayaran.' }, { status: 400 })
  }

  // Match/create a forecast line item by label so this request shows up against
  // the project's budget forecast and reduces the remaining "sisa" amount there.
  // The category is taken from this matched forecast item, not chosen manually.
  let budgetItemId = body.budgetItemId || null
  let category = 'OPERATIONAL_OTHER'
  const label = (body.budgetItemLabel || '').trim()
  if (!budgetItemId && label) {
    const existing = await prisma.projectBudgetItem.findFirst({
      where: { projectId: body.projectId, label: { equals: label, mode: 'insensitive' } },
    })
    if (existing) {
      budgetItemId = existing.id
      category = existing.category
    } else {
      const created = await prisma.projectBudgetItem.create({
        data: { projectId: body.projectId, label, quotedAmount: 0 },
      })
      budgetItemId = created.id
      category = created.category
    }
  } else if (budgetItemId) {
    const existing = await prisma.projectBudgetItem.findUnique({ where: { id: budgetItemId } })
    if (existing) category = existing.category
  }

  // Requests submitted by a division director (Event/PH/Creative) need an extra
  // Owner approval step first — unless the amount is at/below the configured
  // threshold, in which case it goes straight to the Finance Director (who must
  // still approve all expenses regardless of amount).
  const amount = parseFloat(body.amount)
  const ownerThreshold = await getOwnerApprovalThreshold()
  const initialStatus = session.user.role === 'DIRECTOR' && session.user.divisi !== 'FINANCE_HRGA' && amount > ownerThreshold
    ? 'PENDING_OWNER'
    : 'PENDING_FINANCE_DIRECTOR'

  const payment = await prisma.paymentRequest.create({
    data: {
      projectId: body.projectId,
      requestedById: session.user.id,
      category,
      budgetItemId,
      amount,
      vendor: body.vendor || null,
      recipientName: body.recipientName || null,
      recipientAccount: body.recipientAccount || null,
      paymentTerm: body.paymentTerm || 'FULL',
      description: body.description || null,
      neededDate: body.neededDate ? new Date(body.neededDate) : null,
      status: initialStatus,
    },
    include: {
      project: { select: { id: true, code: true, name: true, division: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  })

  // Notify whoever needs to approve this first
  const approvers = initialStatus === 'PENDING_OWNER'
    ? await prisma.user.findMany({ where: { role: 'OWNER' }, select: { id: true } })
    : await prisma.user.findMany({
        where: { OR: [{ role: 'OWNER' }, { role: 'DIRECTOR', divisi: 'FINANCE_HRGA' }] },
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
