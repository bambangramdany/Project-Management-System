import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

function canViewDebt(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user) || user.role === 'DIRECTOR'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const activeDebts = await prisma.debt.findMany({
    where: { status: 'ACTIVE' },
    include: { payments: { where: { status: 'PENDING' } } },
  })

  const outstandingPrincipal = activeDebts.reduce(
    (sum, d) => sum + d.payments.reduce((s, p) => s + p.principalAmount, 0), 0
  )

  const dueThisMonth = await prisma.debtPayment.findMany({
    where: { status: 'PENDING', dueDate: { gte: startOfMonth, lt: endOfMonth } },
    include: { debt: { select: { lenderName: true } } },
    orderBy: { dueDate: 'asc' },
  })

  const overdue = await prisma.debtPayment.findMany({
    where: { status: 'PENDING', dueDate: { lt: startOfMonth } },
    include: { debt: { select: { lenderName: true } } },
    orderBy: { dueDate: 'asc' },
  })

  const monthlyObligation = dueThisMonth.reduce((s, p) => s + p.principalAmount + p.interestAmount, 0)
    + overdue.reduce((s, p) => s + p.principalAmount + p.interestAmount, 0)

  return NextResponse.json({
    outstandingPrincipal,
    activeDebtCount: activeDebts.length,
    monthlyObligation,
    dueThisMonth: dueThisMonth.map(p => ({
      id: p.id, debtId: p.debtId, lenderName: p.debt.lenderName, installmentNo: p.installmentNo,
      dueDate: p.dueDate, principalAmount: p.principalAmount, interestAmount: p.interestAmount,
    })),
    overdue: overdue.map(p => ({
      id: p.id, debtId: p.debtId, lenderName: p.debt.lenderName, installmentNo: p.installmentNo,
      dueDate: p.dueDate, principalAmount: p.principalAmount, interestAmount: p.interestAmount,
    })),
  })
}
