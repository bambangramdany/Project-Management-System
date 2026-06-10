import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

// Lightweight, read-only cash condition summary for division directors —
// just the actual cash balance, total funds requested but not yet paid out
// (an upcoming need-for-cash signal), without exposing transaction-level detail.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const allowed = role === 'OWNER' || role === 'FINANCE' || role === 'DIRECTOR' || isFinanceDirector(session.user)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [cashAgg, outstandingAgg] = await Promise.all([
    prisma.cashTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
    prisma.paymentRequest.aggregate({
      where: { status: { in: ['PENDING_OWNER', 'PENDING_FINANCE_DIRECTOR', 'APPROVED_BY_DIRECTOR'] } },
      _sum: { amount: true },
    }),
  ])

  const totalIn = cashAgg.find(a => a.type === 'IN')?._sum.amount || 0
  const totalOut = cashAgg.find(a => a.type === 'OUT')?._sum.amount || 0

  return NextResponse.json({
    cashBalance: totalIn - totalOut,
    pendingDisbursement: outstandingAgg._sum.amount || 0,
  })
}
