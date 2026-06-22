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
  const principal       = parseFloat(body.principal)
  const interestRate    = parseFloat(body.interestRate || 0)
  const tenorMonths     = parseInt(body.tenorMonths)       // jumlah siklus bayar bunga
  const interestCycle   = parseInt(body.interestCycle || 1) // 1=bulanan, 2=per 2 bulan
  const monthlyInterest = Number.isFinite(principal) && Number.isFinite(interestRate)
    ? Math.round(principal * (interestRate / 100))
    : 0

  if (!body.lenderName?.trim())
    return NextResponse.json({ error: 'Nama pemberi pinjaman wajib diisi' }, { status: 400 })
  if (!Number.isFinite(principal) || principal <= 0)
    return NextResponse.json({ error: 'Nilai pokok pinjaman tidak valid' }, { status: 400 })
  if (!Number.isInteger(tenorMonths) || tenorMonths <= 0)
    return NextResponse.json({ error: 'Jumlah cicilan bunga tidak valid' }, { status: 400 })
  if (!body.startDate)
    return NextResponse.json({ error: 'Tanggal peminjaman wajib diisi' }, { status: 400 })

  const startDate = new Date(body.startDate)

  // ── Buat jadwal pembayaran ─────────────────────────────────────────────────
  // Skema baru:
  //   • N cicilan INTEREST (bunga saja, bayar per siklus 1/2 bulan)
  //   • 1 pembayaran PRINCIPAL (pokok penuh, jatuh tempo = akhir tenor bunga)
  const payments = []

  // Cicilan bunga
  for (let i = 0; i < tenorMonths; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + (i + 1) * interestCycle)
    payments.push({
      installmentNo:  i + 1,
      paymentType:    'INTEREST',
      dueDate,
      principalAmount: 0,
      interestAmount:  monthlyInterest,
    })
  }

  // Pembayaran pokok (jatuh tempo sama dengan cicilan bunga terakhir)
  const principalDue = new Date(startDate)
  principalDue.setMonth(principalDue.getMonth() + tenorMonths * interestCycle)
  payments.push({
    installmentNo:  tenorMonths + 1,
    paymentType:    'PRINCIPAL',
    dueDate:        principalDue,
    principalAmount: principal,
    interestAmount:  0,
  })

  const debt = await prisma.debt.create({
    data: {
      lenderName:     body.lenderName.trim(),
      principal,
      interestRate:   Number.isFinite(interestRate) ? interestRate : 0,
      monthlyInterest,
      tenorMonths,
      interestCycle,
      startDate,
      notes:          body.notes || null,
      payments:       { create: payments },
    },
    include: { payments: { orderBy: { installmentNo: 'asc' } } },
  })

  await logAudit({
    userId: session.user.id, action: 'DEBT_CREATE', entity: 'Debt', entityId: debt.id,
    summary: `${session.user.name} menambahkan hutang dari ${debt.lenderName} sebesar Rp ${Math.round(principal).toLocaleString('id-ID')} (${tenorMonths} cicilan bunga, siklus ${interestCycle} bulan)`,
  })

  return NextResponse.json(debt, { status: 201 })
}
