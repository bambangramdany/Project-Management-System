import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageDebt(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}
const fmtRp = (n) => `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payment = await prisma.debtPayment.findUnique({
    where: { id: params.paymentId },
    include: { debt: true },
  })
  if (!payment || payment.debtId !== params.id)
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body   = await req.json()
  const action = body.action
  // action: 'mark_paid' | 'mark_interest_paid' | 'mark_principal_paid' | 'unmark' | 'unmark_interest' | 'unmark_principal'

  // ── Helper: cek apakah payment sudah full paid setelah update ──────────────
  async function checkAutoClose(debtId) {
    const remaining = await prisma.debtPayment.count({
      where: { debtId, status: 'PENDING' },
    })
    if (remaining === 0) {
      await prisma.debt.update({ where: { id: debtId }, data: { status: 'PAID_OFF' } })
    } else {
      await prisma.debt.update({ where: { id: debtId }, data: { status: 'ACTIVE' } })
    }
  }

  // ── Mark INTEREST paid (cicilan bunga) ─────────────────────────────────────
  if (action === 'mark_interest_paid') {
    if (payment.status === 'PAID')
      return NextResponse.json({ error: 'Sudah lunas' }, { status: 400 })

    const isInterestOnly = payment.paymentType === 'INTEREST'
    const alreadyPaidInterest = !!payment.paidAt

    if (alreadyPaidInterest)
      return NextResponse.json({ error: 'Bunga sudah dicatat lunas' }, { status: 400 })

    // Buat kas keluar untuk bunga
    const cashTx = await prisma.cashTransaction.create({
      data: {
        type: 'OUT',
        amount: payment.interestAmount,
        description: `Bunga hutang ${payment.debt.lenderName} cicilan ke-${payment.installmentNo} (${fmtRp(payment.interestAmount)})`,
        recordedById: session.user.id,
      },
    })

    const principalAlreadyPaid = payment.principalStatus === 'PAID' || payment.principalAmount === 0
    const nowFullyPaid = isInterestOnly || principalAlreadyPaid

    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: {
        cashTransactionId: cashTx.id,
        paidAt: new Date(),
        status: nowFullyPaid ? 'PAID' : 'PENDING',
      },
    })

    if (nowFullyPaid) await checkAutoClose(payment.debtId)

    await logAudit({
      userId: session.user.id, action: 'DEBT_PAYMENT_PAID', entity: 'DebtPayment', entityId: payment.id,
      summary: `${session.user.name} mencatat bayar BUNGA hutang ${payment.debt.lenderName} ke-${payment.installmentNo}: ${fmtRp(payment.interestAmount)}`,
    })
    return NextResponse.json(updated)
  }

  // ── Mark PRINCIPAL paid (pelunasan pokok) ──────────────────────────────────
  if (action === 'mark_principal_paid') {
    if (payment.principalAmount === 0)
      return NextResponse.json({ error: 'Tidak ada pokok di baris ini' }, { status: 400 })
    if (payment.principalStatus === 'PAID')
      return NextResponse.json({ error: 'Pokok sudah dicatat lunas' }, { status: 400 })

    const cashTx = await prisma.cashTransaction.create({
      data: {
        type: 'OUT',
        amount: payment.principalAmount,
        description: `Pelunasan pokok hutang ${payment.debt.lenderName} (${fmtRp(payment.principalAmount)})`,
        recordedById: session.user.id,
      },
    })

    const isPrincipalOnly = payment.paymentType === 'PRINCIPAL'
    const interestAlreadyPaid = !!payment.paidAt || payment.interestAmount === 0
    const nowFullyPaid = isPrincipalOnly || interestAlreadyPaid

    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: {
        principalCashTxId: cashTx.id,
        principalPaidAt:   new Date(),
        principalStatus:   'PAID',
        status:            nowFullyPaid ? 'PAID' : 'PENDING',
        paidAt:            nowFullyPaid ? new Date() : payment.paidAt,
      },
    })

    if (nowFullyPaid) await checkAutoClose(payment.debtId)

    await logAudit({
      userId: session.user.id, action: 'DEBT_PAYMENT_PAID', entity: 'DebtPayment', entityId: payment.id,
      summary: `${session.user.name} mencatat bayar POKOK hutang ${payment.debt.lenderName}: ${fmtRp(payment.principalAmount)}`,
    })
    return NextResponse.json(updated)
  }

  // ── Mark ALL paid (untuk BOTH atau sekaligus) ─────────────────────────────
  if (action === 'mark_paid') {
    if (payment.status === 'PAID')
      return NextResponse.json({ error: 'Sudah lunas' }, { status: 400 })

    const total = payment.principalAmount + payment.interestAmount
    const cashTx = await prisma.cashTransaction.create({
      data: {
        type: 'OUT',
        amount: total,
        description: `Bayar hutang ${payment.debt.lenderName} ke-${payment.installmentNo} (pokok ${fmtRp(payment.principalAmount)} + bunga ${fmtRp(payment.interestAmount)})`,
        recordedById: session.user.id,
      },
    })

    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID', paidAt: new Date(),
        cashTransactionId: cashTx.id,
        principalStatus: 'PAID', principalPaidAt: new Date(),
      },
    })

    await checkAutoClose(payment.debtId)

    await logAudit({
      userId: session.user.id, action: 'DEBT_PAYMENT_PAID', entity: 'DebtPayment', entityId: payment.id,
      summary: `${session.user.name} mencatat pembayaran penuh hutang ${payment.debt.lenderName} ke-${payment.installmentNo}: ${fmtRp(total)}`,
    })
    return NextResponse.json(updated)
  }

  // ── Unmark semua (batalkan lunas) ─────────────────────────────────────────
  if (action === 'unmark') {
    if (payment.cashTransactionId)
      await prisma.cashTransaction.delete({ where: { id: payment.cashTransactionId } }).catch(() => {})
    if (payment.principalCashTxId)
      await prisma.cashTransaction.delete({ where: { id: payment.principalCashTxId } }).catch(() => {})

    const updated = await prisma.debtPayment.update({
      where: { id: payment.id },
      data: {
        status: 'PENDING', paidAt: null, cashTransactionId: null,
        principalStatus: 'PENDING', principalPaidAt: null, principalCashTxId: null,
      },
    })
    await prisma.debt.update({ where: { id: payment.debtId }, data: { status: 'ACTIVE' } })

    await logAudit({
      userId: session.user.id, action: 'DEBT_PAYMENT_UNPAID', entity: 'DebtPayment', entityId: payment.id,
      summary: `${session.user.name} membatalkan status lunas hutang ${payment.debt.lenderName} ke-${payment.installmentNo}`,
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })
}
