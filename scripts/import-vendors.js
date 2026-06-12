const fs = require('fs')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const USER_MAP = {
  'Angga Julfikar': { id: 'cmq6hegtb000dscr0bndguv2o', name: 'Boni' },
  'Julian Putra Pragiwaka': { id: 'cmq6hegvs000fscr0iuzs20xo', name: 'Putra' },
  'Nauval M Zikiri Kushari Putra': { id: 'cmq6hegse0006scr04guiit8j', name: 'Reggy' },
  'Doddi Chaeril Fauzi': { id: 'cmq6hegta000ascr0mpz2jbso', name: 'Doddy' },
  'Siti Nur Fitriah Salsabilah': { id: 'cmq6hegl20000scr047ndhtla', name: 'Eca' },
}

const num = (v) => {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  const n = parseFloat(s.replace(/[^0-9.]/g, ''))
  return Number.isNaN(n) ? null : n
}

const str = (v) => {
  const s = (v ?? '').toString().trim()
  return s ? s : null
}

async function main() {
  const csv = fs.readFileSync('/Users/bambangramdany/Downloads/Vendors-Grid view.csv', 'utf8')
  const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true })

  let created = 0
  for (const row of data) {
    const enteredBy = USER_MAP[row['Entered by']?.trim()]
    const attachment = str(row['Attachment (Document / Photo / Layout)'])
    const notes = [str(row['Notes']), attachment ? `Lampiran lama (Airtable): ${attachment}` : null]
      .filter(Boolean).join('\n\n') || null

    await prisma.vendor.create({
      data: {
        name: str(row['Vendor Name']) || 'Tanpa Nama',
        vendorType: str(row['Vendor Type']) || 'Other',
        province: str(row['Province']),
        city: str(row['City']),
        address: str(row['Venue Address']),
        area: str(row['Area']),
        capacity: str(row['Capacity']),
        ballroomCapacity: str(row['Ballroom Capacity']),
        meetingCapacity: str(row['Meeting Capacity']),
        website: str(row['Website']),
        instagram: str(row['Instagram Account']),
        output: str(row['Output']),
        productService: str(row['Product / Service']),
        status: str(row['Status']) || 'Active',
        picContact: str(row['PIC Contact']),
        phone: str(row['Phone']),
        priceMin: num(row['Price Min']),
        priceMax: num(row['Price Max']),
        priceNote: str(row['Note (Price)']),
        notes,
        enteredById: enteredBy?.id || null,
        enteredByName: enteredBy?.name || str(row['Entered by']),
      },
    })
    created++
  }
  console.log(`Imported ${created} vendors`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
