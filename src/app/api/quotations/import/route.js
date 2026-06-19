import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function canManage(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user.role)
}

// ─── Watermark template parser ────────────────────────────────────────────────
// Parses the actual Watermark quotation Excel template:
//   - Scans for header row (contains No/Deskripsi/Qty/Harga/Total keywords)
//   - Extracts client info from cells above the table
//   - Identifies section rows (letter prefix like "A.", "B.") vs item rows
// Returns a single quotation object with sections + items.
function parseWatermarkTemplate(rows) {
  // ── 1. Find table header row ──────────────────────────────────────────────
  let headerRowIdx = -1
  let colNo = -1, colDesc = -1, colQty = -1, colUnit = -1, colPrice = -1, colTotal = -1

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c ?? '').toLowerCase().trim())
    const hasDesc  = row.findIndex(c => c.includes('deskripsi') || c === 'uraian' || c === 'item')
    const hasQty   = row.findIndex(c => c === 'qty' || c === 'jumlah' || c === 'volume')
    const hasPrice = row.findIndex(c => c.includes('harga') || c.includes('satuan') || c.includes('rate'))
    const hasTotal = row.findIndex(c => c === 'total' || c === 'subtotal' || c.includes('jumlah total'))
    if (hasDesc !== -1 && (hasQty !== -1 || hasPrice !== -1 || hasTotal !== -1)) {
      headerRowIdx = i
      colNo    = row.findIndex(c => c === 'no' || c === 'no.' || c === '#')
      colDesc  = hasDesc
      colQty   = hasQty
      colUnit  = row.findIndex(c => c === 'satuan' || c === 'unit')
      colPrice = hasPrice
      colTotal = hasTotal !== -1 ? hasTotal : row.findLastIndex(c => c.includes('total') || c.includes('jumlah'))
      break
    }
  }

  // ── 2. Extract meta from rows ABOVE the table ─────────────────────────────
  let quotationNumber = null
  let clientName = null
  let eventName = null
  let venue = null
  let eventDate = null

  const metaRows = rows.slice(0, headerRowIdx < 0 ? rows.length : headerRowIdx)
  for (let i = 0; i < metaRows.length; i++) {
    const row = metaRows[i]
    const rowStr = row.map(c => String(c ?? '')).join(' ')

    // Quotation number pattern: WTM/XX/QUOT/YYYY/NNN
    const qMatch = rowStr.match(/WTM\/[A-Z]+\/QUOT\/\d{4}\/\d+/i)
    if (qMatch) quotationNumber = qMatch[0].toUpperCase()

    // Client name: look for "Kepada" or "Client" label
    const kepada = row.findIndex(c => /kepada|client|klien|yth/i.test(String(c ?? '')))
    if (kepada !== -1) {
      // Client name is usually to the right of the label, or in the next row
      const candidate = row.slice(kepada + 1).find(c => String(c ?? '').trim().length > 2)
      if (candidate) clientName = String(candidate).trim()
      else if (i + 1 < metaRows.length) {
        const nextRow = metaRows[i + 1]
        const nc = nextRow.find(c => String(c ?? '').trim().length > 2)
        if (nc) clientName = String(nc).trim()
      }
    }

    // Event / project name
    const eventLabel = row.findIndex(c => /event|project|kegiatan|nama.*event|nama.*project/i.test(String(c ?? '')))
    if (eventLabel !== -1) {
      const candidate = row.slice(eventLabel + 1).find(c => String(c ?? '').trim().length > 2)
      if (candidate) eventName = String(candidate).trim()
      else if (i + 1 < metaRows.length) {
        const nextRow = metaRows[i + 1]
        const nc = nextRow.find(c => String(c ?? '').trim().length > 2)
        if (nc) eventName = String(nc).trim()
      }
    }

    // Venue
    if (/venue|tempat|lokasi/i.test(rowStr)) {
      const vidx = row.findIndex(c => /venue|tempat|lokasi/i.test(String(c ?? '')))
      if (vidx !== -1) {
        const vc = row.slice(vidx + 1).find(c => String(c ?? '').trim().length > 2)
        if (vc) venue = String(vc).trim()
      }
    }

    // Event date
    if (/tanggal|tgl|date/i.test(rowStr) && !quotationNumber?.includes(rowStr)) {
      const didx = row.findIndex(c => /tanggal|tgl.*event|event.*date/i.test(String(c ?? '')))
      if (didx !== -1) {
        const dc = row.slice(didx + 1).find(c => String(c ?? '').trim().length > 2)
        if (dc) eventDate = String(dc).trim()
      }
    }
  }

  // ── 3. Parse items + sections below header row ────────────────────────────
  const sections = []
  let currentSection = null
  let grandTotal = 0

  if (headerRowIdx >= 0) {
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      const noCell   = colNo   >= 0 ? String(row[colNo]   ?? '').trim() : ''
      const descCell = colDesc >= 0 ? String(row[colDesc] ?? '').trim() : ''
      const qtyCell  = colQty  >= 0 ? String(row[colQty]  ?? '').trim() : ''
      const unitCell = colUnit >= 0 ? String(row[colUnit] ?? '').trim() : ''
      const totalRaw = colTotal >= 0 ? row[colTotal] : null
      const priceRaw = colPrice >= 0 ? row[colPrice] : null

      // Skip empty rows
      if (!descCell && !noCell) continue

      const totalNum = typeof totalRaw === 'number' ? totalRaw
        : parseFloat(String(totalRaw ?? '').replace(/[^0-9.-]/g, '')) || 0
      const priceNum = typeof priceRaw === 'number' ? priceRaw
        : parseFloat(String(priceRaw ?? '').replace(/[^0-9.-]/g, '')) || 0

      // Stop at footer rows
      if (/^(total|grand total|sub ?total|ppn|agency fee|diskon)/i.test(descCell) && !noCell) {
        if (/grand.?total/i.test(descCell) && totalNum > 0) grandTotal = totalNum
        continue
      }

      // Section header: letter prefix (A., B., C.) OR no numeric values and row is label-only
      const isSection = /^[A-Z]\.\s*/.test(descCell) || /^[A-Z]\.\s*/.test(noCell)
        || (noCell === '' && descCell.length > 3 && totalNum === 0 && priceNum === 0 && !qtyCell)

      if (isSection) {
        const sectionName = descCell || noCell
        // Extract letter prefix if present
        const letterMatch = sectionName.match(/^([A-Z])\.\s*(.*)/)
        currentSection = {
          letter: letterMatch ? letterMatch[1] : String.fromCharCode(65 + sections.length),
          name: letterMatch ? letterMatch[2].trim() : sectionName,
          items: [],
        }
        sections.push(currentSection)
        continue
      }

      // Item row: has description
      if (descCell) {
        if (!currentSection) {
          currentSection = { letter: 'A', name: 'Umum', items: [] }
          sections.push(currentSection)
        }
        const qty  = parseFloat(qtyCell.replace(/[^0-9.]/g, '')) || 1
        const subtotal = totalNum || priceNum * qty || 0

        currentSection.items.push({
          description: descCell,
          qty,
          unitType: unitCell || 'Unit',
          rate: priceNum || (qty > 0 ? subtotal / qty : subtotal),
          subtotal,
          showInInvoiceDetail: true,
          includeAgencyFee: false,
        })
      }
    }
  }

  // If no sections parsed, create a single placeholder section with grand total
  if (sections.length === 0 && grandTotal > 0) {
    sections.push({
      letter: 'A',
      name: 'Jasa & Produksi',
      items: [{ description: eventName || 'Jasa Event Organizer / Production House', qty: 1, unitType: 'Paket', rate: grandTotal, subtotal: grandTotal, showInInvoiceDetail: true, includeAgencyFee: false }],
    })
  }

  return {
    quotationNumber,
    clientName: clientName || '',
    eventName: eventName || '',
    venue: venue || '',
    eventDate: eventDate || '',
    status: 'WON',   // historical quotations are typically WON
    division: 'EVENT',
    sections,
    totalAmount: grandTotal || sections.flatMap(s => s.items).reduce((sum, it) => sum + it.subtotal, 0),
  }
}

// ─── Bulk template parser ─────────────────────────────────────────────────────
// Parses a simple table: each row = one quotation header
// Columns (flexible, matched by keyword):
//   No. Quotation | Klien | Event | Divisi | Status | Tgl Quotation | Tgl Event | Venue | Nilai Total | Catatan
function parseBulkTemplate(rows) {
  if (rows.length < 2) return []

  const DIVISION_MAP = { 'ph': 'PH', 'event': 'EVENT', 'creative': 'CREATIVE', 'eo': 'EVENT' }
  const STATUS_MAP = { 'won': 'WON', 'draft': 'DRAFT', 'sent': 'SENT', 'loss': 'LOST', 'lost': 'LOST' }

  // Detect header row (first row with text)
  const headerRow = rows[0].map(c => String(c ?? '').toLowerCase().trim())
  const col = key => headerRow.findIndex(h => h.includes(key))

  const colQuotNum  = col('quotation') !== -1 ? col('quotation') : col('no.')
  const colClient   = col('klien') !== -1 ? col('klien') : col('client')
  const colEvent    = col('event') !== -1 ? col('event') : col('project')
  const colDivision = col('divisi') !== -1 ? col('divisi') : col('division')
  const colStatus   = col('status')
  const colDate     = col('tgl quotation') !== -1 ? col('tgl quotation') : col('tanggal')
  const colEventDate = col('tgl event') !== -1 ? col('tgl event') : -1
  const colVenue    = col('venue')
  const colTotal    = col('nilai') !== -1 ? col('nilai') : col('total')
  const colNotes    = col('catatan') !== -1 ? col('catatan') : col('notes')

  return rows.slice(1).map((row, ri) => {
    const get = (idx) => idx >= 0 ? String(row[idx] ?? '').trim() : ''
    const quotNum = get(colQuotNum)
    const client  = get(colClient)
    const event   = get(colEvent)
    if (!client && !event && !quotNum) return null   // skip empty rows

    const division = DIVISION_MAP[(get(colDivision) || '').toLowerCase()] || 'EVENT'
    const status   = STATUS_MAP[(get(colStatus) || '').toLowerCase()] || 'WON'
    const totalRaw = colTotal >= 0 ? row[colTotal] : null
    const total    = typeof totalRaw === 'number' ? totalRaw
      : parseFloat(String(totalRaw ?? '').replace(/[^0-9.-]/g, '')) || 0

    const sections = total > 0
      ? [{ letter: 'A', name: 'Jasa & Produksi', items: [
          { description: event || 'Jasa Event Organizer / Production House', qty: 1, unitType: 'Paket', rate: total, subtotal: total, showInInvoiceDetail: true, includeAgencyFee: false }
        ]}]
      : []

    return {
      quotationNumber: quotNum || null,   // null = auto-generate
      clientName: client,
      eventName: event,
      division,
      status,
      quotationDate: get(colDate) || null,
      eventDate: get(colEventDate) || null,
      venue: get(colVenue) || null,
      totalAmount: total,
      notes: get(colNotes) || null,
      sections,
      _rowIdx: ri + 2,
    }
  }).filter(Boolean)
}

// ─── POST — parse an uploaded Excel file ─────────────────────────────────────
// Body: multipart/form-data with `file` (Excel) and `mode` ('bulk' | 'template')
// Returns { quotations: [...], warnings: [...] } — does NOT write to DB.
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  const mode = formData.get('mode') || 'bulk'   // 'bulk' | 'template'

  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer', cellText: false, cellDates: true })

  const warnings = []
  let quotations = []

  if (mode === 'template') {
    // One Excel file = one quotation in Watermark template format
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
    const q = parseWatermarkTemplate(rows.map(r => Array.isArray(r) ? r : Object.values(r)))
    if (!q.clientName && !q.eventName) {
      warnings.push('Nama klien dan event tidak terdeteksi. Silakan isi manual sebelum import.')
    }
    quotations = [q]
  } else {
    // Bulk mode: parse all sheets or just first sheet
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
    quotations = parseBulkTemplate(rows.map(r => Array.isArray(r) ? r : Object.values(r)))
    if (quotations.length === 0) {
      warnings.push('Tidak ada baris data yang terbaca. Pastikan baris pertama adalah header dan baris berikutnya adalah data.')
    }
  }

  return NextResponse.json({ quotations, warnings })
}
