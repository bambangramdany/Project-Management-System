import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageReceivables(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const receivable = await prisma.receivable.findUnique({ where: { id: params.id } })
  if (!receivable) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}
  if (body.clientName !== undefined && body.clientName.trim()) data.clientName = body.clientName.trim()
  if (body.invoiceNumber !== undefined) data.invoiceNumber = body.invoiceNumber || null
  if (body.amount !== undefined) {
    const amount = parseFloat(body.amount)
    if (Number.isFinite(amount) && amount > 0) data.amount = amount
  }
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.issueDate !== undefined) data.issueDate = body.issueDate ? new Date(body.issueDate) : null
  if (body.notes !== undefined) data.notes = body.notes || null

  if (body.action === 'mark_paid') {
    data.status = 'PAID'
    data.paidAt = new Date()
  } else if (body.action === 'mark_unpaid') {
    data.status = 'UNPAID'
    data.paidAt = null
  }

  const updated = await prisma.receivable.update({
    where: { id: params.id },
    data,
    include: { project: { select: { id: true, code: true, name: true } } },
  })

  if (body.action === 'mark_paid' || body.action === 'mark_unpaid') {
    await logAudit({
      userId: session.user.id, action: 'RECEIVABLE_STATUS_CHANGE', entity: 'Receivable', entityId: updated.id,
      summary: `${session.user.name} menandai piutang ${updated.clientName} sebagai ${updated.status === 'PAID' ? 'Sudah Dibayar' : 'Belum Dibayar'}`,
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const receivable = await prisma.receivable.findUnique({ where: { id: params.id } })
  if (!receivable) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.receivable.delete({ where: { id: params.id } })
  await logAudit({
    userId: session.user.id, action: 'RECEIVABLE_DELETE', entity: 'Receivable', entityId: receivable.id,
    summary: `${session.user.name} menghapus catatan piutang dari ${receivable.clientName}`,
  })

  return NextResponse.json({ ok: true })
}
