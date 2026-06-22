import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageCash(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageCash(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  const transactions = await prisma.cashTransaction.findMany({
    include: {
      recordedBy: { select: { id: true, name: true } },
      paymentRequest: { select: { id: true, vendor: true, project: { select: { code: true, name: true } } } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })

  const agg = await prisma.cashTransaction.groupBy({
    by: ['type'],
    _sum: { amount: true },
  })
  const totalIn = agg.find(a => a.type === 'IN')?._sum.amount || 0
  const totalOut = agg.find(a => a.type === 'OUT')?._sum.amount || 0

  return NextResponse.json({
    balance: totalIn - totalOut,
    totalIn,
    totalOut,
    transactions,
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageCash(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const amount = parseFloat(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal tidak valid' }, { status: 400 })
  }
  if (body.type !== 'IN' && body.type !== 'OUT') {
    return NextResponse.json({ error: 'Tipe transaksi tidak valid' }, { status: 400 })
  }
  if (!body.description || !body.description.trim()) {
    return NextResponse.json({ error: 'Keterangan wajib diisi' }, { status: 400 })
  }

  const pph23 = body.type === 'IN' && body.pph23 ? parseFloat(body.pph23) || 0 : 0

  const tx = await prisma.cashTransaction.create({
    data: {
      type: body.type,
      amount,
      description: body.description.trim(),
      date: body.date ? new Date(body.date) : new Date(),
      recordedById: session.user.id,
      pph23,
      invoiceRef: body.invoiceRef?.trim() || null,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'CASH_TRANSACTION',
    entity: 'CashTransaction',
    entityId: tx.id,
    summary: `${session.user.name} mencatat kas ${body.type === 'IN' ? 'masuk' : 'keluar'} Rp ${Math.round(amount).toLocaleString('id-ID')} (${body.description.trim()})${pph23 ? ` · PPh23 Rp ${Math.round(pph23).toLocaleString('id-ID')}` : ''}`,
  })

  return NextResponse.json(tx, { status: 201 })
}
