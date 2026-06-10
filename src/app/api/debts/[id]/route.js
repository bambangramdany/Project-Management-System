import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageDebt(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const debt = await prisma.debt.findUnique({ where: { id: params.id } })
  if (!debt) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}
  if (body.notes !== undefined) data.notes = body.notes || null
  if (body.status && ['ACTIVE', 'PAID_OFF'].includes(body.status)) data.status = body.status

  const updated = await prisma.debt.update({ where: { id: params.id }, data })

  if (data.status && data.status !== debt.status) {
    await logAudit({
      userId: session.user.id, action: 'DEBT_STATUS_CHANGE', entity: 'Debt', entityId: debt.id,
      summary: `${session.user.name} mengubah status hutang ${debt.lenderName} menjadi ${data.status === 'PAID_OFF' ? 'Lunas' : 'Aktif'}`,
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const debt = await prisma.debt.findUnique({ where: { id: params.id } })
  if (!debt) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.debt.delete({ where: { id: params.id } })
  await logAudit({
    userId: session.user.id, action: 'DEBT_DELETE', entity: 'Debt', entityId: debt.id,
    summary: `${session.user.name} menghapus catatan hutang dari ${debt.lenderName}`,
  })

  return NextResponse.json({ ok: true })
}
