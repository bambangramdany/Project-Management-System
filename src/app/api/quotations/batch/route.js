/**
 * POST /api/quotations/batch
 * Bulk-create quotations from the import wizard.
 * Body: { quotations: QuotationInput[] }
 * Each QuotationInput may have a `quotationNumber` (use as-is) or omit it (auto-generate).
 * Returns { created: number, failed: { idx, error }[] }
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function canManage(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user.role)
}

async function nextQuotationNumber(division, year) {
  const divCode = division === 'PH' ? 'PH' : 'EO'
  const counter = await prisma.quotationCounter.upsert({
    where: { division_year: { division: divCode, year } },
    update: { lastNum: { increment: 1 } },
    create: { division: divCode, year, lastNum: 1 },
  })
  const num = String(counter.lastNum).padStart(3, '0')
  return `WTM/${divCode}/QUOT/${year}/${num}`
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { quotations } = await req.json()
  if (!Array.isArray(quotations) || quotations.length === 0) {
    return NextResponse.json({ error: 'Tidak ada quotation untuk diimport' }, { status: 400 })
  }

  const currentYear = new Date().getFullYear()
  const created = []
  const failed  = []

  for (let i = 0; i < quotations.length; i++) {
    const q = quotations[i]
    try {
      if (!q.clientName?.trim()) throw new Error('Nama klien kosong')
      if (!q.eventName?.trim())  throw new Error('Nama event kosong')

      const division = q.division || 'EVENT'

      // Use provided number, or auto-generate
      let quotationNumber = q.quotationNumber?.trim()
      if (!quotationNumber) {
        // Infer year from quotation number pattern or use current year
        const yr = q.quotationDate
          ? new Date(q.quotationDate).getFullYear() || currentYear
          : currentYear
        quotationNumber = await nextQuotationNumber(division, yr)
      } else {
        // Ensure no duplicate
        const existing = await prisma.quotation.findFirst({ where: { quotationNumber } })
        if (existing) throw new Error(`Nomor ${quotationNumber} sudah ada`)
      }

      const sections = (q.sections || []).map((sec, si) => ({
        letter: sec.letter || String.fromCharCode(65 + si),
        name:   sec.name   || '',
        order:  si,
        items: {
          create: (sec.items || []).map((item, ii) => ({
            no:                  ii + 1,
            description:         item.description || '',
            detailText:          item.detailText  || null,
            rate:                item.rate != null ? parseFloat(item.rate) : null,
            unitType:            item.unitType    || 'Unit',
            qty:                 parseFloat(item.qty)  || 1,
            days:                1,
            subtotal:            parseFloat(item.subtotal) || 0,
            includeAgencyFee:    !!item.includeAgencyFee,
            showInInvoiceDetail: item.showInInvoiceDetail !== false,
            order:               ii,
          })),
        },
      }))

      const record = await prisma.quotation.create({
        data: {
          quotationNumber,
          division,
          status:           q.status || 'WON',
          clientName:       q.clientName.trim(),
          eventName:        q.eventName.trim(),
          venue:            q.venue     || null,
          eventDate:        q.eventDate || null,
          agencyFeePercent: parseFloat(q.agencyFeePercent) || 0,
          includesPpn:      !!q.includesPpn,
          ppnPercent:       parseFloat(q.ppnPercent) || 11,
          createdById:     session.user.id,
          notes:           q.notes || null,
          termsConditions: q.termsConditions || null,
          sections: { create: sections },
        },
        select: { id: true, quotationNumber: true, clientName: true, eventName: true, status: true },
      })
      created.push(record)
    } catch (err) {
      failed.push({ idx: i, quotationNumber: q.quotationNumber, error: err.message })
    }
  }

  return NextResponse.json({ created: created.length, records: created, failed })
}
