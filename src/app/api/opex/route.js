import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageOpex(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

function calcTHP(r) {
  const income = (r.gajiPokok || 0) + (r.tunjanganJabatan || 0) + (r.tunjanganKinerja || 0)
    + (r.tunjanganTransport || 0) + (r.tunjanganProject || 0) + (r.bonusProject || 0) + (r.thrBonus || 0)
  const deduct = (r.bpjsTk || 0) + (r.bpjsKes || 0) + (r.bpjsKesKeluarga || 0)
    + (r.pph21 || 0) + (r.kasbon || 0) + (r.absen || 0)
  return income - deduct
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageOpex(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')

  const where = period ? { period } : {}
  // Filter out any manual "Beban Project Reguler" entries — it's now virtual/auto
  const entries = await prisma.opexEntry.findMany({
    where: { ...where, NOT: { category: 'Beban Project Reguler' } },
    include: { recordedBy: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  })

  // Hitung total THP dari salary records untuk period ini (auto-inject sebagai virtual entry)
  let salaryTotal = 0
  if (period) {
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: { period },
      include: { user: { select: { email: true } } },
    })
    salaryTotal = salaryRecords
      .filter(r => !HIDDEN_EMAILS.includes(r.user?.email))
      .reduce((s, r) => s + calcTHP(r), 0)
  }

  // Virtual entry "Beban Project Reguler" — selalu ada jika ada data gaji
  const [py, pm] = (period || '').split('-').map(Number)
  const salaryVirtualEntry = salaryTotal > 0 ? {
    id: `__salary_${period}`,
    isAutoSalary: true,
    category: 'Beban Project Reguler',
    description: `Beban Project Reguler`,
    amount: Math.round(salaryTotal),
    date: py && pm ? new Date(py, pm - 1, 24).toISOString() : null,
    period,
    recordedBy: null,
  } : null

  const allEntries = salaryVirtualEntry ? [salaryVirtualEntry, ...entries] : entries
  const total = allEntries.reduce((sum, e) => sum + e.amount, 0)
  const byCategory = {}
  allEntries.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })

  return NextResponse.json({ entries: allEntries, total, count: allEntries.length, byCategory, salaryTotal })
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
  if (body.category?.trim() === 'Beban Project Reguler') {
    return NextResponse.json({ error: '"Beban Project Reguler" otomatis diambil dari data gaji dan tidak bisa diinput manual.' }, { status: 400 })
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
