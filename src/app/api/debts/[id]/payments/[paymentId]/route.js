import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageDebt(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

const fmtRupiah = (n) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payment = await prisma.debtPayment.findUnique({
    where: { id: params.paymentId },
    include: { debt: true },
  })
  if (!payment || payment.debtId !== params.id) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const action = body.action // 'mark_paid' | 'unmark'

  if (action === 'mark_paid') {
    if (payment.status === 'PAID') return NextResponse.json({ error: 'Sudah dibayar' }, { status: 400 })

    const total = payment.principalAmount + payment.interestAmount
    const cashTx = await prisma.cashTransaction.create({
      data: {
        type: 'OUT',
        amount: total,
        description: `Cicilan hutang ${payment.debt.lenderName} ke-${payment.installmentNo} (pokok ${fmtRupiah(payment.principalAmount)} + bunga/bagi hasil ${fmtRupiah(payment.interestAmount)})`,
        recordedById: session.user.id,
      },
    })

    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: new Date(), cashTransactionId: cashTx.id },
    })

    await logAudit({
      userId: session.user.id, action: 'DEBT_PAYMENT_PAID', entity: 'DebtPayment', entityId: payment.id,
      summary: `${session.user.name} mencatat pembayaran cicilan hutang ${payment.debt.lenderName} ke-${payment.installmentNo} sebesar ${fmtRupiah(total)}`,
    })

    // Auto-close the debt if this was the last installment
    const remaining = await prisma.debtPayment.count({ where: { debtId: payment.debtId, status: 'PENDING' } })
    if (remaining === 0) {
      await prisma.debt.update({ where: { id: payment.debtId }, data: { status: 'PAID_OFF' } })
    }

    return NextResponse.json(updated)
  }

  if (action === 'unmark') {
    if (payment.status !== 'PAID') return NextResponse.json({ error: 'Belum dibayar' }, { status: 400 })

    if (payment.cashTransactionId) {
      await prisma.cashTransaction.delete({ where: { id: payment.cashTransactionId } }).catch(() => {})
    }
    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: { status: 'PENDING', paidAt: null, cashTransactionId: null },
    })
    await prisma.debt.update({ where: { id: payment.debtId }, data: { status: 'ACTIVE' } })

    await logAudit({
      userId: session.user.id, action: 'DEBT_PAYMENT_UNPAID', entity: 'DebtPayment', entityId: payment.id,
      summary: `${session.user.name} membatalkan status lunas cicilan hutang ${payment.debt.lenderName} ke-${payment.installmentNo}`,
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })
}
