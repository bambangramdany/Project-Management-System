import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function canManage(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

// Parse period code dari Excel: "WTMJUN2026" → "2026-06"
// Atau dari nama sheet/header: "WTM Slip Gaji Juni 2026" → "2026-06"
const MONTH_ID = {
  jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
  jun: '06', jul: '07', agu: '08', aug: '08', sep: '09', okt: '10',
  oct: '10', nov: '11', des: '12', dec: '12',
}

function parsePeriodCode(raw) {
  if (!raw) return null
  const s = String(raw).trim()

  // "WTMJUN2026" → ambil 3 huruf bulan + 4 digit tahun
  const m1 = s.match(/[A-Z]{3}([A-Z]{3})(\d{4})/i)
  if (m1) {
    const mo = MONTH_ID[m1[1].toLowerCase()]
    if (mo) return `${m1[2]}-${mo}`
  }

  // "Juni 2026" → nama bulan Indonesia
  const m2 = s.match(/([A-Za-z]+)\s+(\d{4})/)
  if (m2) {
    const mo = MONTH_ID[m2[1].toLowerCase().slice(0, 3)]
    if (mo) return `${m2[2]}-${mo}`
  }
  return null
}

function parseNum(v) {
  if (typeof v === 'number') return Math.abs(v)
  if (!v) return 0
  const n = parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : Math.abs(n)
}

// Normalise nama: uppercase, trim, collapse spaces
function normName(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb    = XLSX.read(buffer, { type: 'buffer', cellDates: false })

  // Cari sheet yang mengandung data payroll (biasanya sheet pertama atau yang ada "Gaji"/"Payroll")
  const sheetName = wb.SheetNames.find(n => /gaji|payroll|slip/i.test(n)) || wb.SheetNames[0]
  const ws   = wb.Sheets[sheetName]
  const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // ── Cari period ──────────────────────────────────────────────────────────
  // Baris 0 biasanya: ["", ..., "", "WTMJUN2026", ...]
  let period = null
  for (let r = 0; r < Math.min(5, raw.length); r++) {
    for (const cell of raw[r]) {
      const p = parsePeriodCode(cell)
      if (p) { period = p; break }
    }
    if (period) break
  }
  if (!period) {
    // Coba nama sheet sebagai fallback
    period = parsePeriodCode(sheetName)
  }
  if (!period) {
    // Gunakan bulan saat ini sebagai fallback
    const now = new Date()
    period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  // ── Temukan baris header & data ───────────────────────────────────────────
  // Header baris biasanya mengandung "Nama" atau "Gaji Pokok"
  let headerRowIdx = -1
  for (let r = 0; r < Math.min(10, raw.length); r++) {
    const row = raw[r]
    const joined = row.map(c => String(c).toLowerCase()).join(' ')
    if (joined.includes('nama') && joined.includes('gaji')) {
      headerRowIdx = r
      break
    }
  }
  const dataStart = headerRowIdx >= 0 ? headerRowIdx + 1 : 3

  // ── Cari kolom berdasarkan header atau posisi default ────────────────────
  // Format default (sesuai template Excel yang diberikan):
  // [0]=No, [1]=ID, [2]=Nama, [3]=ID+Nama, [4]=Unit, [5]=Status, [6]=GajiPokok,
  // [7]=SlipNo, [8]=BpjsTk, [9]=BpjsKes, [10]=BpjsKesKel, [11]=Pph21,
  // [12]=TunjJabatan, [13]=TunjKinerja, [14]=TunjTransport, [15]=TunjProject,
  // [16]=BonusProject, [17]=Kasbon, [18]=Absen, [19]=THR, [20]=THP
  const COL = { id:1, nama:2, gajiPokok:6, slipNo:7, bpjsTk:8, bpjsKes:9, bpjsKesKel:10,
    pph21:11, tunjJabatan:12, tunjKinerja:13, tunjTransport:14, tunjProject:15,
    bonusProject:16, kasbon:17, absen:18, thr:19, thp:20 }

  // Jika ada baris header, coba auto-detect kolom
  if (headerRowIdx >= 0) {
    const hdr = raw[headerRowIdx]
    hdr.forEach((cell, idx) => {
      const h = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '')
      if (h.includes('nama') && !h.includes('id')) COL.nama = idx
      else if (h.includes('gajipokok') || (h.includes('gaji') && h.includes('pokok'))) COL.gajiPokok = idx
      else if (h.includes('bpjsketenagakerjaan') || (h.includes('bpjs') && h.includes('tk'))) COL.bpjsTk = idx
      else if (h.includes('bpjskeluarga') || h.includes('keskeluarga')) COL.bpjsKesKel = idx
      else if (h.includes('bpjskesehatan') || (h.includes('bpjs') && h.includes('kes') && !h.includes('kel'))) COL.bpjsKes = idx
      else if (h.includes('pph21')) COL.pph21 = idx
      else if (h.includes('tunjanganJabatan') || (h.includes('jabatan') && h.includes('tunjang'))) COL.tunjJabatan = idx
      else if (h.includes('kinerja')) COL.tunjKinerja = idx
      else if (h.includes('transport')) COL.tunjTransport = idx
      else if (h.includes('project') && h.includes('bonus')) COL.bonusProject = idx
      else if (h.includes('project')) COL.tunjProject = idx
      else if (h.includes('kasbon')) COL.kasbon = idx
      else if (h.includes('absen')) COL.absen = idx
      else if (h.includes('thr') || h.includes('bonus')) COL.thr = idx
      else if (h.includes('thp')) COL.thp = idx
    })
  }

  // ── Muat semua user aktif untuk matching ────────────────────────────────
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: { id: true, name: true },
  })
  // Index by normalised name
  const userByName = new Map(users.map(u => [normName(u.name), u]))

  let imported = 0, updated = 0, skipped = 0
  const errors = []
  const notFound = []

  for (let r = dataStart; r < raw.length; r++) {
    const row = raw[r]
    const namaRaw = String(row[COL.nama] || '').trim()
    const gajiPokok = parseNum(row[COL.gajiPokok])

    // Baris kosong atau baris total → berhenti / skip
    if (!namaRaw || namaRaw.toLowerCase().includes('total') || namaRaw.toLowerCase().includes('jumlah')) continue
    if (gajiPokok === 0 && !namaRaw) continue

    // Cari user berdasarkan nama
    const nama = normName(namaRaw)
    const user = userByName.get(nama) ||
      // Fallback: partial match (nama depan saja)
      users.find(u => normName(u.name).startsWith(nama.split(' ')[0]) && normName(u.name).includes(nama.split(' ').slice(-1)[0]))

    if (!user) {
      skipped++
      notFound.push(namaRaw)
      errors.push(`Baris ${r + 1}: Karyawan "${namaRaw}" tidak ditemukan di sistem`)
      continue
    }

    const data = {
      employeeId: String(row[COL.id] || '').trim() || null,
      gajiPokok,
      bpjsTk:          parseNum(row[COL.bpjsTk]),
      bpjsKes:         parseNum(row[COL.bpjsKes]),
      bpjsKesKeluarga: parseNum(row[COL.bpjsKesKel]),
      pph21:           parseNum(row[COL.pph21]),
      tunjanganJabatan:   parseNum(row[COL.tunjJabatan]),
      tunjanganKinerja:   parseNum(row[COL.tunjKinerja]),
      tunjanganTransport: parseNum(row[COL.tunjTransport]),
      tunjanganProject:   parseNum(row[COL.tunjProject]),
      bonusProject:       parseNum(row[COL.bonusProject]),
      kasbon:  parseNum(row[COL.kasbon]),
      absen:   parseNum(row[COL.absen]),
      thrBonus: parseNum(row[COL.thr]),
    }

    // Upsert: create or update SalaryRecord untuk user & period ini
    const existing = await prisma.salaryRecord.findFirst({
      where: { userId: user.id, period },
    })

    if (existing) {
      await prisma.salaryRecord.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await prisma.salaryRecord.create({ data: { userId: user.id, period, ...data } })
      imported++
    }
  }

  await logAudit({
    userId: session.user.id,
    action: 'SALARY_IMPORT',
    entity: 'SalaryRecord',
    entityId: 'bulk',
    summary: `${session.user.name} import payroll ${period}: ${imported} dibuat, ${updated} diupdate, ${skipped} gagal`,
  })

  return NextResponse.json({ period, imported, updated, skipped, notFound, errors: errors.slice(0, 30) })
}
