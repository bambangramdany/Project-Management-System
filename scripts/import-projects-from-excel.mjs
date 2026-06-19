// scripts/import-projects-from-excel.mjs
// Import project data from Excel templates, preserving quotation & invoice numbers
// Run: node scripts/import-projects-from-excel.mjs

import { PrismaClient } from '@prisma/client'
import XLSX from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Excel serial date → JS Date ───────────────────────────────────────────────
function excelDateToISO(serial) {
  if (!serial || isNaN(parseFloat(serial))) return null
  const n = parseFloat(serial)
  if (n < 1000) return null  // not a date
  const d = new Date(Math.round((n - 25569) * 86400 * 1000))
  if (isNaN(d.getTime())) return null
  return d
}

// ── Status mapping ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  'DONE':                 'DONE',
  'CANCELED':             'CANCELED',
  'CANCELLED':            'CANCELED',
  'EVENT DAY':            'EVENT_DAY',
  'EVENT_DAY':            'EVENT_DAY',
  'HOLD':                 'HOLD',
  'PREPARATION':          'PREPARATION',
  'WAITING PITCH RESULT': 'WAITING_PITCH_RESULT',
  'WAITING_PITCH_RESULT': 'WAITING_PITCH_RESULT',
  'PITCHING':             'PITCHING',
  'REPORTING':            'REPORTING',
  'INVOICING':            'INVOICING',
  '':                     'DONE',   // default for blank (EO file is all DONE anyway)
}

// ── Pitch result mapping ──────────────────────────────────────────────────────
const PITCH_MAP = {
  'WIN':                  'WIN',
  'LOSE':                 'LOSE',
  'LOST':                 'LOSE',
  'NOT_FINAL':            'NOT_FINAL',
  'CANCEL':               'NOT_FINAL',
  'CANCELED':             'NOT_FINAL',
  'CANCELLED':            'NOT_FINAL',
  'WAITING PITCH RESULT': 'NOT_FINAL',
  'HOLD':                 null,
  '':                     null,
}

// ── Category mapping (handle non-standard values) ─────────────────────────────
const CATEGORY_MAP = {
  'MEETING_CONFERENCE':           'MEETING_CONFERENCE',
  'ACTIVATION':                   'ACTIVATION',
  'LAUNCHING':                    'LAUNCHING',
  'EXHIBITION':                   'EXHIBITION',
  'INCENTIVE_GATHERING':          'INCENTIVE_GATHERING',
  'SPONSORSHIP':                  'SPONSORSHIP',
  'CORPORATE_PROFILE_BRANDING':   'CORPORATE_PROFILE_BRANDING',
  'COMMERCIAL_ADVERTISING':       'COMMERCIAL_ADVERTISING',
  'EVENT_DOCUMENTATION_HIGHLIGHT':'EVENT_DOCUMENTATION_HIGHLIGHT',
  'SOCIAL_MEDIA_CONTENT':         'SOCIAL_MEDIA_CONTENT',
  'TRAINING_INTERNAL_COMMUNICATION': 'TRAINING_INTERNAL_COMMUNICATION',
  'PRODUCT_EXPLAINER_VIDEO':      'PRODUCT_EXPLAINER_VIDEO',
  'MOTION_GRAPHIC_ANIMATION':     'MOTION_GRAPHIC_ANIMATION',
  'DOCUMENTARY_STORYTELLING':     'DOCUMENTARY_STORYTELLING',
  // Non-standard → best fit
  'LIVE STREAM':                  'SOCIAL_MEDIA_CONTENT',
  'LIVE_STREAM':                  'SOCIAL_MEDIA_CONTENT',
  'TITIP PT':                     'MEETING_CONFERENCE',  // catch-all
  '':                             'MEETING_CONFERENCE',
}

// ── Division mapping ──────────────────────────────────────────────────────────
const DIVISION_MAP = {
  'EVENT': 'EVENT',
  'PH':    'PH',
  '':      'EVENT',
}

// ── Code generator ────────────────────────────────────────────────────────────
let codeCounter = {}

async function getNextCode(division) {
  const prefix = division === 'PH' ? 'PH' : 'EO'
  if (!codeCounter[prefix]) {
    // Find max existing code for this prefix
    const existing = await prisma.project.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true },
    })
    const nums = existing.map(p => parseInt(p.code.replace(prefix, '')) || 0)
    codeCounter[prefix] = nums.length ? Math.max(...nums) : 0
  }
  codeCounter[prefix]++
  return `${prefix}${String(codeCounter[prefix]).padStart(3, '0')}`
}

// ── Main import ───────────────────────────────────────────────────────────────
async function importFile(filePath, label) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Importing: ${label}`)
  console.log('═'.repeat(60))

  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets['Projects']
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

  // Pre-fetch all users by email (for PIC matching)
  const allUsers = await prisma.user.findMany({ select: { id: true, email: true, name: true } })
  const userByEmail = {}
  allUsers.forEach(u => { userByEmail[u.email.toLowerCase()] = u })

  // Pre-fetch existing clients
  const existingClients = await prisma.client.findMany({ select: { id: true, name: true } })
  const clientByName = {}
  existingClients.forEach(c => { clientByName[c.name.toLowerCase().trim()] = c })

  let imported = 0, skipped = 0, errors = []

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2  // Excel row number

    const projectName = (row['Nama Project'] || '').trim()
    if (!projectName) {
      skipped++
      continue
    }

    try {
      const rawDivision = (row['Divisi'] || '').trim().toUpperCase()
      const division = DIVISION_MAP[rawDivision] || 'EVENT'

      const rawStatus = (row['Status'] || '').trim().toUpperCase()
      const status = STATUS_MAP[rawStatus] || 'DONE'

      const rawPitch = (row['Hasil Pitch'] || '').trim().toUpperCase()
      const pitchResult = PITCH_MAP[rawPitch] !== undefined ? PITCH_MAP[rawPitch] : null

      const rawCategory = (row['Kategori'] || '').trim().toUpperCase()
      const category = CATEGORY_MAP[rawCategory] || CATEGORY_MAP['']

      // PIC by email
      const picEmail = (row['PIC (email)'] || '').trim().toLowerCase()
      const picUser = picEmail ? userByEmail[picEmail] : null
      if (picEmail && !picUser) {
        errors.push(`Row ${rowNum} [${projectName}]: PIC email "${picEmail}" tidak ditemukan`)
      }

      // Client — match or create
      const clientName = (row['Client'] || '').trim()
      let clientId = null
      if (clientName) {
        const clientKey = clientName.toLowerCase()
        if (clientByName[clientKey]) {
          clientId = clientByName[clientKey].id
        } else {
          const newClient = await prisma.client.create({ data: { name: clientName } })
          clientByName[clientKey] = newClient
          clientId = newClient.id
        }
      }

      // Dates
      const briefDate  = excelDateToISO(row['Tanggal Brief'])
      const startDate  = excelDateToISO(row['Tanggal Mulai'])
      const endDate    = excelDateToISO(row['Tanggal Selesai'])
      const submitDate = excelDateToISO(row['Tanggal Submit'])

      // Quotation & Invoice numbers from Excel
      const quotationNumber = (row['No. Quotation'] || '').trim() || null
      const invoiceNumber   = (row['No. Invoice']   || '').trim() || null

      // Project value
      const projectValue = parseFloat(row['Nilai Project']) || null

      // Generate code
      const existingCode = (row['Kode'] || '').trim()
      const code = existingCode || await getNextCode(division)

      // Check duplicate code
      const existing = await prisma.project.findUnique({ where: { code } })
      if (existing) {
        errors.push(`Row ${rowNum} [${projectName}]: Kode "${code}" sudah ada, di-skip`)
        skipped++
        continue
      }

      await prisma.project.create({
        data: {
          code,
          name:           projectName,
          clientId,
          category,
          division,
          picId:          picUser?.id || null,
          status,
          pitchResult,
          pitchStatus:    null,
          projectValue,
          quotationNumber,
          invoiceNumber,
          briefDate,
          startDate,
          endDate,
          submitDate,
          wonLossReason:  (row['Alasan Menang/Kalah'] || '').trim() || null,
          vendorWinner:   (row['Vendor Pemenang']     || '').trim() || null,
          notes:          (row['Catatan']             || '').trim() || null,
        },
      })

      imported++
      const quotTag  = quotationNumber ? ` [Q: ${quotationNumber}]` : ''
      const invTag   = invoiceNumber   ? ` [I: ${invoiceNumber}]`   : ''
      console.log(`  ✓ ${code} — ${projectName}${quotTag}${invTag}`)

    } catch (err) {
      errors.push(`Row ${rowNum} [${projectName}]: ${err.message}`)
      skipped++
    }
  }

  console.log(`\nHasil: ${imported} diimport, ${skipped} dilewati`)
  if (errors.length) {
    console.log('\nWarnings / Errors:')
    errors.forEach(e => console.log('  ⚠', e))
  }

  return { imported, skipped, errors }
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  const files = [
    {
      path: '/Users/bambangramdany/Downloads/template-import-project (4).xlsx',
      label: 'EO Projects (66 rows)',
    },
    {
      path: '/Users/bambangramdany/Downloads/PH template-import-project (1).xlsx',
      label: 'PH Projects (30 rows)',
    },
  ]

  let totalImported = 0, totalSkipped = 0

  for (const f of files) {
    const result = await importFile(f.path, f.label)
    totalImported += result.imported
    totalSkipped  += result.skipped
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`TOTAL: ${totalImported} project diimport, ${totalSkipped} dilewati`)
  console.log('═'.repeat(60))

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
