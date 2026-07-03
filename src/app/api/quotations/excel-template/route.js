// GET  /api/quotations/excel-template  → download template kosong
// POST /api/quotations/excel-template  → upload Excel → create quotation draft

import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { NextResponse }     from 'next/server'
import * as XLSX            from 'xlsx'

const ALLOWED = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER']

// ─── Kolom sheet ITEMS ────────────────────────────────────────────────────────
// Urutan harus sama antara template & parser
const ITEM_COLS = [
  'Kategori (huruf)',      // A  → section.letter
  'Nama Kategori',         // B  → section.name
  'No',                   // C  → item.no
  'Deskripsi Item',        // D  → item.description
  'Detail / Keterangan',   // E  → item.detailText
  'Rate',                  // F  → item.rate  (kosong = by client / titipan)
  'Unit',                  // G  → item.unitType
  'Qty',                   // H  → item.qty
  'Days',                  // I  → item.days
  'HPP/Modal (internal)',  // J  → item.hppRate
  'Titipan Klien (internal)', // K → item.titipanKlien
  'Kena Agency Fee (Y/N)', // L  → item.includeAgencyFee
  'Tampil di Invoice (Y/N)', // M → item.showInInvoiceDetail
]

// ─── GET: download template ───────────────────────────────────────────────────
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const wb = XLSX.utils.book_new()

  // ── Sheet 1: INFO ──
  const infoData = [
    ['Field', 'Nilai', 'Keterangan'],
    ['Divisi', 'EVENT', 'Isi: EVENT atau PH'],
    ['Nama Klien', '', 'Wajib diisi'],
    ['Nama Event / Project', '', 'Wajib diisi'],
    ['Tanggal Event', '', 'Contoh: 12-14 Juni 2026'],
    ['Venue', '', ''],
    ['Kota / Lokasi', '', ''],
    ['Agency Fee (%)', '0', 'Isi angka, contoh: 10'],
    ['Include PPN (Y/N)', 'N', 'Y atau N'],
    ['PPN (%)', '11', 'Hanya aktif jika Include PPN = Y'],
    ['Ada Termin DP (Y/N)', 'N', 'Y atau N'],
    ['DP (%)', '', 'Hanya diisi jika Ada Termin DP = Y'],
    ['Catatan Internal', '', 'Tidak tampil di PDF'],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 26 }, { wch: 30 }, { wch: 40 }]
  // Style header row
  XLSX.utils.book_append_sheet(wb, wsInfo, 'INFO')

  // ── Sheet 2: ITEMS ──
  const itemsData = [
    ITEM_COLS,
    // Contoh baris
    ['A', 'MAN POWER', 1, 'Event Coordinator', '', 5000000, 'Event', 1, 1, 4000000, '', 'Y', 'Y'],
    ['A', 'MAN POWER', 2, 'MC', '', 3000000, 'Event', 1, 1, '', '', 'Y', 'Y'],
    ['B', 'VENUE', 1, 'Sewa Gedung', 'Include AV dasar', 50000000, 'Event', 1, 1, 40000000, 5000000, 'N', 'Y'],
    ['B', 'VENUE', 2, 'Catering', '', '', 'Pax', 200, 1, '', 8000000, 'N', 'Y'],
  ]
  const wsItems = XLSX.utils.aoa_to_sheet(itemsData)
  wsItems['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 5 }, { wch: 32 }, { wch: 30 },
    { wch: 16 }, { wch: 10 }, { wch: 6 }, { wch: 6 },
    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, wsItems, 'ITEMS')

  // ── Sheet 3: PETUNJUK ──
  const helpData = [
    ['PETUNJUK PENGISIAN TEMPLATE QUOTATION'],
    [''],
    ['Sheet INFO'],
    ['• Isi semua field yang diperlukan. Field "Nama Klien" dan "Nama Event" wajib diisi.'],
    ['• Untuk Y/N, cukup tulis Y (ya) atau N (tidak).'],
    [''],
    ['Sheet ITEMS'],
    ['• Kolom A (Kategori): huruf section, contoh A, B, C dst.'],
    ['• Kolom B (Nama Kategori): nama section, misal VENUE, PRODUCTION, CREATIVE.'],
    ['• Kolom C (No): nomor urut item dalam section, mulai dari 1.'],
    ['• Kolom D (Deskripsi): nama item — wajib diisi.'],
    ['• Kolom E (Detail): keterangan tambahan yang tampil di dokumen (opsional).'],
    ['• Kolom F (Rate): harga jual per unit. KOSONGKAN jika item by client / titipan murni.'],
    ['• Kolom G (Unit): satuan, contoh Unit, Pax, Event, Pcs, Set, Lot, Ls, Hari, Bulan.'],
    ['• Kolom H (Qty): jumlah unit (default 1).'],
    ['• Kolom I (Days): jumlah hari (default 1).'],
    ['• Kolom J (HPP/Modal): biaya modal WTM per unit — INTERNAL, tidak tampil di PDF klien.'],
    ['• Kolom K (Titipan Klien): nominal titipan yang melebur di item ini — INTERNAL.'],
    ['• Kolom L (Agency Fee): Y jika item ini kena Agency Fee, N jika tidak.'],
    ['• Kolom M (Tampil di Invoice): Y agar muncul di Invoice Detail, N untuk disembunyikan.'],
    [''],
    ['KEAMANAN DATA'],
    ['• Kolom HPP/Modal dan Titipan Klien bersifat RAHASIA — tidak pernah tampil di PDF klien.'],
    ['• File Excel ini hanya untuk keperluan internal tim WTM.'],
  ]
  const wsHelp = XLSX.utils.aoa_to_sheet(helpData)
  wsHelp['!cols'] = [{ wch: 90 }]
  XLSX.utils.book_append_sheet(wb, wsHelp, 'PETUNJUK')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template_Quotation_WTM.xlsx"',
    },
  })
}

// ─── POST: parse Excel → create quotation draft ───────────────────────────────
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Terima multipart form-data
  const formData = await req.formData()
  const file     = formData.get('file')
  const projectId = formData.get('projectId') || null

  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buf  = Buffer.from(await file.arrayBuffer())
  const wb   = XLSX.read(buf, { type: 'buffer' })

  // ── Parse sheet INFO ──
  const wsInfo = wb.Sheets['INFO']
  if (!wsInfo) return NextResponse.json({ error: 'Sheet INFO tidak ditemukan' }, { status: 400 })

  const infoRows = XLSX.utils.sheet_to_json(wsInfo, { header: 1 })
  function infoVal(label) {
    const row = infoRows.find(r => String(r[0] || '').trim() === label)
    return row ? String(row[1] ?? '').trim() : ''
  }

  const clientName  = infoVal('Nama Klien')
  const eventName   = infoVal('Nama Event / Project')
  if (!clientName)  return NextResponse.json({ error: 'Nama Klien wajib diisi di sheet INFO' }, { status: 400 })
  if (!eventName)   return NextResponse.json({ error: 'Nama Event wajib diisi di sheet INFO' }, { status: 400 })

  const division        = infoVal('Divisi') === 'PH' ? 'PH' : 'EVENT'
  const agencyFeePercent = parseFloat(infoVal('Agency Fee (%)')) || 0
  const includesPpn     = infoVal('Include PPN (Y/N)').toUpperCase() === 'Y'
  const ppnPercent      = parseFloat(infoVal('PPN (%)')) || 11
  const dpEnabled       = infoVal('Ada Termin DP (Y/N)').toUpperCase() === 'Y'
  const dpPercent       = dpEnabled ? (parseFloat(infoVal('DP (%)')) || null) : null
  const notes           = infoVal('Catatan Internal') || null
  const venue           = infoVal('Venue') || null
  const eventDate       = infoVal('Tanggal Event') || null
  const location        = infoVal('Kota / Lokasi') || null

  // ── Parse sheet ITEMS ──
  const wsItems = wb.Sheets['ITEMS']
  if (!wsItems) return NextResponse.json({ error: 'Sheet ITEMS tidak ditemukan' }, { status: 400 })

  const itemRows = XLSX.utils.sheet_to_json(wsItems, { header: 1, defval: '' })
  // Skip header row (row 0)
  const dataRows = itemRows.slice(1).filter(r => r[3] && String(r[3]).trim()) // kolom D (deskripsi) wajib ada

  if (dataRows.length === 0) return NextResponse.json({ error: 'Tidak ada item di sheet ITEMS' }, { status: 400 })

  // Group items by section (kolom A = letter, kolom B = name)
  const secMap = new Map() // letter → { letter, name, items[] }
  for (const row of dataRows) {
    const letter   = String(row[0] || 'A').trim().toUpperCase()
    const secName  = String(row[1] || '').trim()
    const no       = parseInt(row[2]) || 1
    const desc     = String(row[3] || '').trim()
    const detail   = String(row[4] || '').trim() || null
    const rateRaw  = row[5]
    const rate     = rateRaw !== '' && rateRaw != null ? parseFloat(String(rateRaw).replace(/[^\d.]/g, '')) || 0 : null
    const unitType = String(row[6] || 'Unit').trim() || 'Unit'
    const qty      = parseFloat(row[7]) || 1
    const days     = parseFloat(row[8]) || 1
    const hppRaw   = row[9]
    const hppRate  = hppRaw !== '' && hppRaw != null ? parseFloat(String(hppRaw).replace(/[^\d.]/g, '')) || null : null
    const titipanRaw = row[10]
    const titipanKlien = titipanRaw !== '' && titipanRaw != null ? parseFloat(String(titipanRaw).replace(/[^\d.]/g, '')) || null : null
    const includeAgencyFee    = String(row[11] || 'N').trim().toUpperCase() === 'Y'
    const showInInvoiceDetail = String(row[12] ?? 'Y').trim().toUpperCase() !== 'N'

    if (!secMap.has(letter)) secMap.set(letter, { letter, name: secName, items: [] })
    else if (secName && !secMap.get(letter).name) secMap.get(letter).name = secName

    const subtotal = rate != null ? rate * qty * days : 0
    const hppSubtotal = hppRate != null ? hppRate * qty * days : null

    secMap.get(letter).items.push({
      no, description: desc, detailText: detail,
      rate, unitType, qty, days, subtotal,
      hppRate, hppSubtotal, titipanKlien,
      includeAgencyFee, showInInvoiceDetail,
    })
  }

  // Generate quotation number
  const year    = new Date().getFullYear()
  const divCode = division === 'PH' ? 'PH' : 'EO'
  const counter = await prisma.quotationCounter.upsert({
    where:  { division_year: { division: divCode, year } },
    update: { lastNum: { increment: 1 } },
    create: { division: divCode, year, lastNum: 1 },
  })
  const quotationNumber = `WTM/${divCode}/QUOT/${year}/${String(counter.lastNum).padStart(3, '0')}`

  const sections = [...secMap.values()]

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      division,
      status: 'DRAFT',
      clientName,
      eventName,
      venue,
      eventDate,
      location,
      agencyFeePercent,
      includesPpn,
      ppnPercent,
      dpPercent,
      notes,
      createdById: session.user.id,
      projectId:   projectId || null,
      sections: {
        create: sections.map((sec, si) => ({
          letter: sec.letter,
          name:   sec.name,
          order:  si,
          items: {
            create: sec.items.map((item, ii) => ({ ...item, order: ii })),
          },
        })),
      },
    },
    select: { id: true, quotationNumber: true },
  })

  return NextResponse.json(quotation, { status: 201 })
}
