import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageCash(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageCash(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tx = await prisma.cashTransaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (tx.paymentRequestId) {
    return NextResponse.json({ error: 'Transaksi otomatis dari pembayaran tidak bisa dihapus manual' }, { status: 400 })
  }

  await prisma.cashTransaction.delete({ where: { id: params.id } })
  await logAudit({
    userId: session.user.id,
    action: 'CASH_TRANSACTION_DELETE',
    entity: 'CashTransaction',
    entityId: tx.id,
    summary: `${session.user.name} menghapus catatan kas ${tx.type === 'IN' ? 'masuk' : 'keluar'} Rp ${Math.round(tx.amount).toLocaleString('id-ID')} (${tx.description})`,
  })

  return NextResponse.json({ ok: true })
}
