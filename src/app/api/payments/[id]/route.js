import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canApproveAsDirector, canApproveAsFinanceDirector, canProcessPayment } from '@/lib/rbac'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

const fmtRupiah = (n) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`

// Find users who should act on the next approval stage
async function findApprovers(stage, project) {
  if (stage === 'PENDING_FINANCE_DIRECTOR') {
    return prisma.user.findMany({
      where: { OR: [{ role: 'OWNER' }, { role: 'DIRECTOR', divisi: 'FINANCE_HRGA' }] },
      select: { id: true },
    })
  }
  if (stage === 'APPROVED_BY_DIRECTOR') {
    return prisma.user.findMany({ where: { role: { in: ['OWNER', 'FINANCE'] } }, select: { id: true } })
  }
  if (stage === 'PENDING_DIRECTOR') {
    return prisma.user.findMany({
      where: { OR: [{ role: 'OWNER' }, { role: 'DIRECTOR', divisi: project.division }] },
      select: { id: true },
    })
  }
  return []
}

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
    if (action === 'approve') {
      const approvers = await findApprovers('PENDING_FINANCE_DIRECTOR', payment.project)
      await Promise.all(approvers.map(u => notifyUser({
        userId: u.id, type: 'PAYMENT_APPROVAL',
        title: 'Pengajuan Pembayaran Menunggu Approval Anda',
        message: `${payment.project.name}: ${fmtRupiah(payment.amount)} (${payment.vendor || '-'}) telah disetujui Direktur Divisi.`,
        link: '/finance',
      })))
    } else {
      await notifyUser({
        userId: payment.requestedById, type: 'PAYMENT_REJECTED',
        title: 'Pengajuan Pembayaran Ditolak',
        message: `${payment.project.name}: ${fmtRupiah(payment.amount)} (${payment.vendor || '-'}) ditolak oleh Direktur Divisi.${body.note ? ` Catatan: ${body.note}` : ''}`,
        link: '/finance',
      })
    }
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
    if (action === 'approve') {
      const approvers = await findApprovers('APPROVED_BY_DIRECTOR', payment.project)
      await Promise.all(approvers.map(u => notifyUser({
        userId: u.id, type: 'PAYMENT_APPROVAL',
        title: 'Pengajuan Siap Dibayarkan',
        message: `${payment.project.name}: ${fmtRupiah(payment.amount)} (${payment.vendor || '-'}) telah disetujui Direktur Finance, siap dibayarkan.`,
        link: '/finance',
      })))
    } else {
      await notifyUser({
        userId: payment.requestedById, type: 'PAYMENT_REJECTED',
        title: 'Pengajuan Pembayaran Ditolak',
        message: `${payment.project.name}: ${fmtRupiah(payment.amount)} (${payment.vendor || '-'}) ditolak oleh Direktur Finance.${body.note ? ` Catatan: ${body.note}` : ''}`,
        link: '/finance',
      })
    }
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
    await notifyUser({
      userId: payment.requestedById, type: 'PAYMENT_PAID',
      title: 'Pembayaran Telah Dibayarkan',
      message: `${payment.project.name}: ${fmtRupiah(payment.amount)} (${payment.vendor || '-'}) telah dibayarkan.`,
      link: '/finance',
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })
}
