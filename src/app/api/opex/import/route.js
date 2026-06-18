import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function canManageOpex(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

// Accepts an .xlsx/.xls/.csv file with columns (header names, case-insensitive,
// Indonesian or English): Tanggal/Date, Kategori/Category, Keterangan/Description,
// Nominal/Amount. Each valid row creates an OpexEntry + matching CashTransaction.
function normalizeKey(key) {
  return String(key).trim().toLowerCase()
}

function pick(row, candidates) {
  for (const [key, value] of Object.entries(row)) {
    if (candidates.includes(normalizeKey(key))) return value
  }
  return undefined
}

function parseDate(value) {
  if (value == null || value === '') return new Date()
  if (typeof value === 'number') {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d)
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

function parseAmount(value) {
  if (typeof value === 'number') return value
  if (!value) return NaN
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  return parseFloat(cleaned)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageOpex(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  let imported = 0
  let skipped = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const category = pick(row, ['kategori', 'category'])
    const description = pick(row, ['keterangan', 'deskripsi', 'description'])
    const amountRaw = pick(row, ['nominal', 'amount', 'jumlah'])
    const dateRaw = pick(row, ['tanggal', 'date'])

    const amount = parseAmount(amountRaw)
    if (!category || !description || !Number.isFinite(amount) || amount <= 0) {
      skipped++
      errors.push(`Baris ${i + 2}: data tidak lengkap/tidak valid`)
      continue
    }

    const date = parseDate(dateRaw)
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const cashTx = await prisma.cashTransaction.create({
      data: {
        type: 'OUT',
        amount,
        description: `[Opex - ${String(category).trim()}] ${String(description).trim()}`,
        date,
        recordedById: session.user.id,
      },
    })

    await prisma.opexEntry.create({
      data: {
        category: String(category).trim(),
        description: String(description).trim(),
        amount,
        date,
        period,
        recordedById: session.user.id,
        cashTransactionId: cashTx.id,
      },
    })
    imported++
  }

  await logAudit({
    userId: session.user.id,
    action: 'OPEX_IMPORT',
    entity: 'OpexEntry',
    entityId: 'bulk',
    summary: `${session.user.name} mengimpor ${imported} entri opex dari file (${skipped} dilewati)`,
  })

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20) })
}
