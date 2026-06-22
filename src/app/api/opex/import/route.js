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

const MONTH_ID = {
  januari:'01', februari:'02', maret:'03', april:'04', mei:'05',
  juni:'06', juli:'07', agustus:'08', september:'09', oktober:'10',
  november:'11', desember:'12',
}

function normalizeKey(key) { return String(key).trim().toLowerCase() }

function pick(row, candidates) {
  for (const [key, value] of Object.entries(row)) {
    if (candidates.includes(normalizeKey(key))) return value
  }
  return undefined
}

function parseDate(value) {
  if (value == null || value === '') return new Date()
  if (typeof value === 'number') {
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

function parsePeriodString(value) {
  if (!value) return null
  const s = String(value).trim().toLowerCase()
  for (const [name, mo] of Object.entries(MONTH_ID)) {
    if (s.includes(name)) {
      const ym = s.match(/\d{4}/)
      if (ym) return `${ym[0]}-${mo}`
    }
  }
  const m1 = s.match(/^(\d{4})-(\d{2})$/)
  if (m1) return `${m1[1]}-${m1[2]}`
  const m2 = s.match(/^(\d{2})\/(\d{4})$/)
  if (m2) return `${m2[2]}-${m2[1]}`
  return null
}

function isTemplateFormat(headers) {
  const hStr = headers.join(' ').toLowerCase()
  return (hStr.includes('item biaya') || hStr.includes('item')) && !hStr.includes('keterangan') && !hStr.includes('tanggal')
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
  const sheetName = workbook.SheetNames.find(n => /opex|biaya/i.test(n)) || workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawArr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  let headerIdx = 0
  for (let i = 0; i < Math.min(5, rawArr.length); i++) {
    const hStr = rawArr[i].map(c => String(c).toLowerCase()).join(' ')
    if (hStr.includes('no') || hStr.includes('item') || hStr.includes('kategori') || hStr.includes('tanggal')) {
      headerIdx = i; break
    }
  }

  const headers = rawArr[headerIdx].map(c => String(c).toLowerCase().trim())
  const useTemplate = isTemplateFormat(headers)
  const rows = XLSX.utils.sheet_to_json(sheet, { header: rawArr[headerIdx], defval: '', range: headerIdx })

  let imported = 0, skipped = 0
  const errors = []
  let defaultPeriod = null

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    let category, description, amountRaw, date, period

    if (useTemplate) {
      category  = pick(row, ['item biaya', 'item']) || pick(row, ['kategori', 'category'])
      amountRaw = pick(row, ['amount', 'nominal', 'jumlah', 'biaya'])
      const periodeRaw = pick(row, ['periode/bulan', 'periode', 'bulan', 'period'])
      description = category

      if (periodeRaw) {
        const p = parsePeriodString(periodeRaw)
        if (p) {
          defaultPeriod = p
          const [y, m] = p.split('-')
          date = new Date(parseInt(y), parseInt(m) - 1, 1)
          period = p
        }
      }
      if (!period && defaultPeriod) {
        period = defaultPeriod
        const [y, m] = period.split('-')
        date = new Date(parseInt(y), parseInt(m) - 1, 1)
      }
      if (!period) {
        const now = new Date()
        period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        date = now
      }
    } else {
      category    = pick(row, ['kategori', 'category'])
      description = pick(row, ['keterangan', 'deskripsi', 'description'])
      amountRaw   = pick(row, ['nominal', 'amount', 'jumlah'])
      const dateRaw = pick(row, ['tanggal', 'date'])
      date   = parseDate(dateRaw)
      period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    }

    const amount = parseAmount(amountRaw)
    if (!category || !Number.isFinite(amount) || amount <= 0) {
      skipped++
      if (String(category || '').trim()) errors.push(`Baris ${i + headerIdx + 1}: "${category}" — nominal kosong, dilewati`)
      continue
    }

    const catStr  = String(category).trim()
    const descStr = String(description || category).trim()

    const cashTx = await prisma.cashTransaction.create({
      data: { type: 'OUT', amount, description: `[Opex - ${catStr}] ${descStr}`, date, recordedById: session.user.id },
    })
    await prisma.opexEntry.create({
      data: { category: catStr, description: descStr, amount, date, period, recordedById: session.user.id, cashTransactionId: cashTx.id },
    })
    imported++
  }

  await logAudit({
    userId: session.user.id, action: 'OPEX_IMPORT', entity: 'OpexEntry', entityId: 'bulk',
    summary: `${session.user.name} mengimpor ${imported} entri opex dari file (${skipped} dilewati)`,
  })

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20) })
}
