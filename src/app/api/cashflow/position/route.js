import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

// Cash position summary: how much is pending approval, ready to pay, paid this
// month, and what's coming up in the next 14 days based on budget item due dates.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const allowed = role === 'OWNER' || role === 'FINANCE' || isFinanceDirector(session.user)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [pendingOwner, pendingFinanceDirector, readyToPay, paidThisMonthAgg] = await Promise.all([
    prisma.paymentRequest.aggregate({ where: { status: 'PENDING_OWNER' }, _sum: { amount: true }, _count: true }),
    prisma.paymentRequest.aggregate({ where: { status: 'PENDING_FINANCE_DIRECTOR' }, _sum: { amount: true }, _count: true }),
    prisma.paymentRequest.aggregate({ where: { status: 'APPROVED_BY_DIRECTOR' }, _sum: { amount: true }, _count: true }),
    prisma.paymentRequest.aggregate({
      where: { status: 'PAID', paidAt: { gte: startOfMonth, lt: endOfMonth } },
      _sum: { amount: true }, _count: true,
    }),
  ])

  // Upcoming budget items due within 14 days that haven't been paid yet
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const upcomingItems = await prisma.projectBudgetItem.findMany({
    where: {
      neededDate: { gte: now, lte: horizon },
    },
    include: {
      project: { select: { id: true, code: true, name: true, division: true } },
      payments: { select: { status: true } },
    },
    orderBy: { neededDate: 'asc' },
  })

  const upcoming = upcomingItems
    .filter(it => !it.payments.some(p => p.status === 'PAID'))
    .map(it => ({
      id: it.id,
      label: it.label,
      amount: it.actualAmount ?? it.quotedAmount,
      neededDate: it.neededDate,
      project: it.project,
      hasPendingPayment: it.payments.some(p => ['PENDING_OWNER', 'PENDING_FINANCE_DIRECTOR', 'APPROVED_BY_DIRECTOR'].includes(p.status)),
    }))

  return NextResponse.json({
    pendingApproval: {
      amount: (pendingOwner._sum.amount || 0) + (pendingFinanceDirector._sum.amount || 0),
      count: pendingOwner._count + pendingFinanceDirector._count,
    },
    readyToPay: {
      amount: readyToPay._sum.amount || 0,
      count: readyToPay._count,
    },
    paidThisMonth: {
      amount: paidThisMonthAgg._sum.amount || 0,
      count: paidThisMonthAgg._count,
    },
    upcoming,
  })
}
