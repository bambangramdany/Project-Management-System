import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageDebt(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

function canViewDebt(user) {
  return canManageDebt(user) || user.role === 'DIRECTOR'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const debts = await prisma.debt.findMany({
    include: { payments: { orderBy: { installmentNo: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(debts)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const principal = parseFloat(body.principal)
  const interestRate = parseFloat(body.interestRate || 0)
  const monthlyInterest = Number.isFinite(principal) && Number.isFinite(interestRate)
    ? Math.round(principal * (interestRate / 100))
    : 0
  const tenorMonths = parseInt(body.tenorMonths)

  if (!body.lenderName || !body.lenderName.trim()) {
    return NextResponse.json({ error: 'Nama pemberi pinjaman wajib diisi' }, { status: 400 })
  }
  if (!Number.isFinite(principal) || principal <= 0) {
    return NextResponse.json({ error: 'Nilai pokok pinjaman tidak valid' }, { status: 400 })
  }
  if (!Number.isInteger(tenorMonths) || tenorMonths <= 0) {
    return NextResponse.json({ error: 'Lama pinjaman (bulan) tidak valid' }, { status: 400 })
  }
  if (!body.startDate) {
    return NextResponse.json({ error: 'Tanggal peminjaman wajib diisi' }, { status: 400 })
  }

  const startDate = new Date(body.startDate)

  // Even principal split across the tenor; remainder goes into the last installment.
  const basePrincipal = Math.floor((principal / tenorMonths) * 100) / 100
  const lastPrincipal = principal - basePrincipal * (tenorMonths - 1)

  const debt = await prisma.debt.create({
    data: {
      lenderName: body.lenderName.trim(),
      principal,
      interestRate: Number.isFinite(interestRate) ? interestRate : 0,
      monthlyInterest,
      tenorMonths,
      startDate,
      notes: body.notes || null,
      payments: {
        create: Array.from({ length: tenorMonths }, (_, i) => {
          const dueDate = new Date(startDate)
          dueDate.setMonth(dueDate.getMonth() + i + 1)
          return {
            installmentNo: i + 1,
            dueDate,
            principalAmount: i === tenorMonths - 1 ? lastPrincipal : basePrincipal,
            interestAmount: monthlyInterest,
          }
        }),
      },
    },
    include: { payments: { orderBy: { installmentNo: 'asc' } } },
  })

  await logAudit({
    userId: session.user.id, action: 'DEBT_CREATE', entity: 'Debt', entityId: debt.id,
    summary: `${session.user.name} menambahkan hutang dari ${debt.lenderName} sebesar Rp ${Math.round(principal).toLocaleString('id-ID')} (tenor ${tenorMonths} bulan)`,
  })

  return NextResponse.json(debt, { status: 201 })
}
