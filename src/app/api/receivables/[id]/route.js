import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageReceivables(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const receivable = await prisma.receivable.findUnique({ where: { id: params.id } })
  if (!receivable) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}

  // Field updates
  if (body.clientName !== undefined && body.clientName.trim()) data.clientName = body.clientName.trim()
  if (body.financeProjectName !== undefined) data.financeProjectName = body.financeProjectName || null
  if (body.invoiceNumber !== undefined) data.invoiceNumber = body.invoiceNumber || null
  if (body.poNumber !== undefined) data.poNumber = body.poNumber || null
  if (body.taxInvoiceNumber !== undefined) data.taxInvoiceNumber = body.taxInvoiceNumber || null
  if (body.amount !== undefined) {
    const amount = parseFloat(body.amount)
    if (Number.isFinite(amount) && amount > 0) data.amount = amount
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.issueDate !== undefined) data.issueDate = body.issueDate ? new Date(body.issueDate) : null
  if (body.notes !== undefined) data.notes = body.notes || null
  // Confirm a draft → set isDraft false
  if (body.isDraft === false) data.isDraft = false

  if (body.action === 'mark_paid') {
    // Nominal yang benar-benar masuk ke kas (setelah PPh dipotong klien)
    const paidAmount = body.paidAmount !== undefined ? (parseFloat(body.paidAmount) || receivable.amount) : receivable.amount
    const pphAmount  = body.pphAmount  !== undefined ? (parseFloat(body.pphAmount)  || 0) : 0
    const paidDate   = body.paidAt ? new Date(body.paidAt) : new Date()

    data.status      = 'PAID'
    data.paidAt      = paidDate
    data.paidAmount  = paidAmount
    data.pphAmount   = pphAmount
    data.isDraft     = false

    // ── Buat Kas Masuk (nominal diterima) ──
    const kasIn = await prisma.cashTransaction.create({
      data: {
        type: 'IN',
        amount: paidAmount,
        description: `[Piutang Lunas] ${receivable.clientName}${receivable.invoiceNumber ? ' — ' + receivable.invoiceNumber : ''}`,
        date: paidDate,
        recordedById: session.user.id,
      },
    })
    data.kasTransactionInId = kasIn.id

    // ── Buat Kas Keluar untuk PPh jika ada ──
    if (pphAmount > 0) {
      const kasOut = await prisma.cashTransaction.create({
        data: {
          type: 'OUT',
          amount: pphAmount,
          description: `[PPh Potong] ${receivable.clientName}${receivable.invoiceNumber ? ' — ' + receivable.invoiceNumber : ''} (2% PPh)`,
          date: paidDate,
          recordedById: session.user.id,
        },
      })
      data.kasTransactionOutId = kasOut.id
    }

    await logAudit({
      userId: session.user.id, action: 'RECEIVABLE_PAID', entity: 'Receivable', entityId: receivable.id,
      summary: `${session.user.name} menandai piutang ${receivable.clientName} Rp ${Math.round(paidAmount).toLocaleString('id-ID')} sebagai Lunas${pphAmount > 0 ? ` (PPh Rp ${Math.round(pphAmount).toLocaleString('id-ID')})` : ''}`,
    })

  } else if (body.action === 'mark_unpaid') {
    data.status     = 'UNPAID'
    data.paidAt     = null
    data.paidAmount = null
    data.pphAmount  = 0

    // Hapus kas transaksi terkait jika ada
    const prev = await prisma.receivable.findUnique({
      where: { id: params.id },
      select: { kasTransactionInId: true, kasTransactionOutId: true },
    })
    if (prev?.kasTransactionInId) {
      await prisma.cashTransaction.delete({ where: { id: prev.kasTransactionInId } }).catch(() => {})
    }
    if (prev?.kasTransactionOutId) {
      await prisma.cashTransaction.delete({ where: { id: prev.kasTransactionOutId } }).catch(() => {})
    }
    data.kasTransactionInId  = null
    data.kasTransactionOutId = null

    await logAudit({
      userId: session.user.id, action: 'RECEIVABLE_STATUS_CHANGE', entity: 'Receivable', entityId: receivable.id,
      summary: `${session.user.name} menandai piutang ${receivable.clientName} kembali ke Belum Dibayar`,
    })
  }

  const updated = await prisma.receivable.update({
    where: { id: params.id },
    data,
    include: { project: { select: { id: true, code: true, name: true, client: { select: { name: true } } } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const receivable = await prisma.receivable.findUnique({
    where: { id: params.id },
    select: { id: true, clientName: true, kasTransactionInId: true, kasTransactionOutId: true },
  })
  if (!receivable) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  // Hapus kas transaksi terkait sebelum delete receivable
  if (receivable.kasTransactionInId) {
    await prisma.cashTransaction.delete({ where: { id: receivable.kasTransactionInId } }).catch(() => {})
  }
  if (receivable.kasTransactionOutId) {
    await prisma.cashTransaction.delete({ where: { id: receivable.kasTransactionOutId } }).catch(() => {})
  }

  await prisma.receivable.delete({ where: { id: params.id } })
  await logAudit({
    userId: session.user.id, action: 'RECEIVABLE_DELETE', entity: 'Receivable', entityId: receivable.id,
    summary: `${session.user.name} menghapus catatan piutang dari ${receivable.clientName}`,
  })

  return NextResponse.json({ ok: true })
}
