import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canApproveAsDirector, canApproveAsFinanceDirector, canProcessPayment } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await req.json()

  const payment = await prisma.paymentRequest.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!payment) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const action = body.action // 'approve' | 'reject' | 'mark_paid'

  // Stage 1: division director (Event/PH/Creative) approval
  if ((action === 'approve' || action === 'reject') && payment.status === 'PENDING_DIRECTOR') {
    if (!canApproveAsDirector(session.user, payment.project)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'PENDING_FINANCE_DIRECTOR' : 'REJECTED',
        directorId: session.user.id,
        directorNote: body.note || null,
        approvedAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  // Stage 2: Finance & HRGA Director (Anung) approval
  if ((action === 'approve' || action === 'reject') && payment.status === 'PENDING_FINANCE_DIRECTOR') {
    if (!canApproveAsFinanceDirector(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'APPROVED_BY_DIRECTOR' : 'REJECTED',
        financeDirectorId: session.user.id,
        financeDirectorNote: body.note || null,
        financeApprovedAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  if (action === 'approve' || action === 'reject') {
    return NextResponse.json({ error: 'Status tidak valid untuk aksi ini' }, { status: 400 })
  }

  if (action === 'mark_paid') {
    if (payment.status !== 'APPROVED_BY_DIRECTOR') {
      return NextResponse.json({ error: 'Status tidak valid untuk aksi ini' }, { status: 400 })
    }
    if (!canProcessPayment(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        financeById: session.user.id,
        financeNote: body.note || null,
        paidAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })
}
