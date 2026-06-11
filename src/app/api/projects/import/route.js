import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewAllProjects } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

const STATUS_VALUES = ['HOLD', 'PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING', 'DONE', 'FAILED', 'CANCELED']
const CATEGORY_VALUES = [
  'MEETING_CONFERENCE', 'ACTIVATION', 'LAUNCHING', 'EXHIBITION', 'INCENTIVE_GATHERING', 'SPONSORSHIP',
  'CORPORATE_PROFILE_BRANDING', 'COMMERCIAL_ADVERTISING', 'EVENT_DOCUMENTATION_HIGHLIGHT', 'SOCIAL_MEDIA_CONTENT',
  'TRAINING_INTERNAL_COMMUNICATION', 'PRODUCT_EXPLAINER_VIDEO', 'MOTION_GRAPHIC_ANIMATION', 'DOCUMENTARY_STORYTELLING',
]
const DIVISION_VALUES = ['EVENT', 'CREATIVE', 'PH', 'FINANCE_HRGA']
const PITCH_RESULT_VALUES = ['WIN', 'LOSE', 'NOT_FINAL']

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
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d)
  }
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function parseNumber(value) {
  if (typeof value === 'number') return value
  if (!value) return null
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function matchEnum(value, allowed, fallback = null) {
  if (!value) return fallback
  const v = String(value).trim().toUpperCase().replace(/&/g, '').replace(/[\s-]+/g, '_').replace(/_+/g, '_')
  return allowed.includes(v) ? v : fallback
}

// Bulk import historical projects from an .xlsx/.xls/.csv file. Expected columns
// (Indonesian or English, case-insensitive): Kode/Code, Nama Project/Name,
// Client, Kategori/Category, Divisi/Division, PIC (email), Status,
// Pitch Status, Hasil Pitch/Pitch Result, Nilai Project/Project Value,
// Tanggal Brief/Brief Date, Tanggal Submit/Submit Date,
// Tanggal Mulai/Start Date, Tanggal Selesai/End Date,
// Alasan Menang Kalah/Won Loss Reason, Vendor Pemenang/Vendor Winner, Catatan/Notes.
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewAllProjects(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  // Pre-fetch lookups
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } })
  const userByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]))
  const userByName = new Map(users.map(u => [u.name.toLowerCase(), u]))

  let imported = 0
  let skipped = 0
  const errors = []
  let codeCounter = await prisma.project.count()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = pick(row, ['nama project', 'nama', 'name', 'project'])
    if (!name || !String(name).trim()) {
      skipped++
      errors.push(`Baris ${i + 2}: nama project kosong`)
      continue
    }

    const clientName = pick(row, ['client', 'klien'])
    const category = matchEnum(pick(row, ['kategori', 'category']), CATEGORY_VALUES, 'MEETING_CONFERENCE')
    const division = matchEnum(pick(row, ['divisi', 'division']), DIVISION_VALUES, 'EVENT')
    const status = matchEnum(pick(row, ['status']), STATUS_VALUES, 'DONE')
    const pitchResult = matchEnum(pick(row, ['hasil pitch', 'pitch result']), PITCH_RESULT_VALUES, null)
    const projectValue = parseNumber(pick(row, ['nilai project', 'project value', 'nilai']))
    const briefDate = parseDate(pick(row, ['tanggal brief', 'brief date']))
    const submitDate = parseDate(pick(row, ['tanggal submit', 'submit date']))
    const startDate = parseDate(pick(row, ['tanggal mulai', 'start date', 'tanggal event']))
    const endDate = parseDate(pick(row, ['tanggal selesai', 'end date']))
    const wonLossReason = pick(row, ['alasan menang kalah', 'alasan menang/kalah', 'won loss reason'])
    const vendorWinner = pick(row, ['vendor pemenang', 'vendor winner'])
    const notes = pick(row, ['catatan', 'notes'])
    const evaluationNote = pick(row, ['catatan evaluasi', 'evaluation note'])
    const codeRaw = pick(row, ['kode', 'code'])
    const quotationNumber = pick(row, ['no quotation', 'no. quotation', 'nomor quotation', 'quotation number', 'quotation'])
    const invoiceNumber = pick(row, ['no invoice', 'no. invoice', 'nomor invoice', 'invoice number', 'invoice'])

    let picId = null
    const picRaw = pick(row, ['pic'])
    if (picRaw) {
      const key = String(picRaw).trim().toLowerCase()
      picId = userByEmail.get(key)?.id || userByName.get(key)?.id || null
      if (!picId) errors.push(`Baris ${i + 2}: PIC "${picRaw}" tidak ditemukan, dilewati untuk PIC`)
    }

    let clientId = null
    if (clientName && String(clientName).trim()) {
      const cName = String(clientName).trim()
      const client = await prisma.client.upsert({
        where: { name: cName },
        update: {},
        create: { name: cName },
      })
      clientId = client.id
    }

    codeCounter++
    const code = codeRaw && String(codeRaw).trim() ? String(codeRaw).trim() : `P-${String(codeCounter).padStart(3, '0')}`

    await prisma.project.create({
      data: {
        code,
        name: String(name).trim(),
        clientId,
        category,
        division,
        picId,
        status,
        pitchResult,
        projectValue,
        briefDate,
        submitDate,
        startDate,
        endDate,
        wonLossReason: wonLossReason ? String(wonLossReason).trim() : null,
        vendorWinner: vendorWinner ? String(vendorWinner).trim() : null,
        notes: notes ? String(notes).trim() : null,
        evaluationNote: evaluationNote ? String(evaluationNote).trim() : null,
        quotationNumber: quotationNumber ? String(quotationNumber).trim() : null,
        invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : null,
      },
    })
    imported++
  }

  await logAudit({
    userId: session.user.id,
    action: 'PROJECT_IMPORT',
    entity: 'Project',
    entityId: 'bulk',
    summary: `${session.user.name} mengimpor ${imported} project dari file (${skipped} dilewati)`,
  })

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 30) })
}
