import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { getReceivables } from '@/lib/financeData'
import { NextResponse } from 'next/server'

function canManageReceivables(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

function canViewReceivables(user) {
  return canManageReceivables(user) || user.role === 'DIRECTOR'
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  return NextResponse.json(await getReceivables(status))
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const amount = parseFloat(body.amount)

  if (!body.clientName || !body.clientName.trim()) {
    return NextResponse.json({ error: 'Nama klien wajib diisi' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal invoice tidak valid' }, { status: 400 })
  }

  const receivable = await prisma.receivable.create({
    data: {
      projectId: body.projectId || null,
      invoiceNumber: body.invoiceNumber || null,
      clientName: body.clientName.trim(),
      amount,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes || null,
    },
    include: { project: { select: { id: true, code: true, name: true } } },
  })

  await logAudit({
    userId: session.user.id, action: 'RECEIVABLE_CREATE', entity: 'Receivable', entityId: receivable.id,
    summary: `${session.user.name} menambahkan piutang dari ${receivable.clientName} sebesar Rp ${Math.round(amount).toLocaleString('id-ID')}`,
  })

  return NextResponse.json(receivable, { status: 201 })
}
