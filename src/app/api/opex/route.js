import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageOpex(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageOpex(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')

  const where = period ? { period } : {}
  const entries = await prisma.opexEntry.findMany({
    where,
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  })

  const total = entries.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = {}
  entries.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })

  return NextResponse.json({ entries, total, count: entries.length, byCategory })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageOpex(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const amount = parseFloat(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal tidak valid' }, { status: 400 })
  }
  if (!body.category || !body.category.trim()) {
    return NextResponse.json({ error: 'Kategori wajib diisi' }, { status: 400 })
  }
  if (!body.description || !body.description.trim()) {
    return NextResponse.json({ error: 'Keterangan wajib diisi' }, { status: 400 })
  }

  const date = body.date ? new Date(body.date) : new Date()
  const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  const description = body.description.trim()
  const category = body.category.trim()

  const cashTx = await prisma.cashTransaction.create({
    data: {
      type: 'OUT',
      amount,
      description: `[Opex - ${category}] ${description}`,
      date,
      recordedById: session.user.id,
    },
  })

  const entry = await prisma.opexEntry.create({
    data: {
      category,
      description,
      amount,
      date,
      period,
      recordedById: session.user.id,
      cashTransactionId: cashTx.id,
    },
    include: { recordedBy: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId: session.user.id,
    action: 'OPEX_CREATE',
    entity: 'OpexEntry',
    entityId: entry.id,
    summary: `${session.user.name} mencatat opex ${category} Rp ${Math.round(amount).toLocaleString('id-ID')} (${description})`,
  })

  return NextResponse.json(entry, { status: 201 })
}
