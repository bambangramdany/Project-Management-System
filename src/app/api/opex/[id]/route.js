import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageOpex(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageOpex(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const entry = await prisma.opexEntry.findUnique({ where: { id: params.id } })
  if (!entry) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.opexEntry.delete({ where: { id: params.id } })
  if (entry.cashTransactionId) {
    await prisma.cashTransaction.delete({ where: { id: entry.cashTransactionId } }).catch(() => {})
  }

  await logAudit({
    userId: session.user.id,
    action: 'OPEX_DELETE',
    entity: 'OpexEntry',
    entityId: entry.id,
    summary: `${session.user.name} menghapus opex ${entry.category} Rp ${Math.round(entry.amount).toLocaleString('id-ID')} (${entry.description})`,
  })

  return NextResponse.json({ ok: true })
}
