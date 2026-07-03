// POST /api/quotations/:id/duplicate
// Duplikasi quotation sebagai Draft baru — semua section + item ter-copy,
// nomor quotation baru digenerate, status = DRAFT.

import { getServerSession }   from 'next-auth'
import { authOptions }        from '@/lib/auth'
import { prisma }             from '@/lib/prisma'
import { NextResponse }       from 'next/server'

async function nextQuotationNumber(division, year) {
  const divCode = division === 'PH' ? 'PH' : 'EO'
  const counter = await prisma.quotationCounter.upsert({
    where:  { division_year: { division: divCode, year } },
    update: { lastNum: { increment: 1 } },
    create: { division: divCode, year, lastNum: 1 },
  })
  return `WTM/${divCode}/QUOT/${year}/${String(counter.lastNum).padStart(3, '0')}`
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER']
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Ambil quotation sumber beserta semua section + item
  const source = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!source) return NextResponse.json({ error: 'Quotation tidak ditemukan' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  // projectId opsional — bisa dikosongkan atau ganti ke project lain
  const targetProjectId = body.projectId !== undefined ? body.projectId : source.projectId

  const year     = new Date().getFullYear()
  const division = source.division || 'EVENT'
  const newNumber = await nextQuotationNumber(division, year)

  const newQuotation = await prisma.quotation.create({
    data: {
      quotationNumber:  newNumber,
      division,
      status:           'DRAFT',
      clientName:       source.clientName,
      eventName:        source.eventName,
      venue:            source.venue,
      eventDate:        source.eventDate,
      location:         source.location,
      agencyFeePercent: source.agencyFeePercent,
      includesPpn:      source.includesPpn,
      ppnPercent:       source.ppnPercent,
      dpPercent:        source.dpPercent,
      dpAmount:         source.dpAmount,
      termsConditions:  source.termsConditions,
      notes:            null,           // catatan tidak ikut di-copy
      isAddCost:        false,          // duplikasi selalu bukan add-cost
      picQuotationId:   source.picQuotationId,
      approver1Id:      source.approver1Id,
      approver2Id:      source.approver2Id,
      createdById:      session.user.id,
      projectId:        targetProjectId || null,
      sections: {
        create: source.sections.map((sec, si) => ({
          letter: sec.letter || String.fromCharCode(65 + si),
          name:   sec.name   || '',
          order:  sec.order  ?? si,
          items: {
            create: sec.items.map((item, ii) => ({
              no:                  item.no ?? (ii + 1),
              description:         item.description  || '',
              detailText:          item.detailText   || null,
              rate:                item.rate,           // null = byClient, dipertahankan
              unitType:            item.unitType     || 'Unit',
              qty:                 item.qty,
              days:                item.days,
              subtotal:            item.subtotal,
              hppRate:             item.hppRate      || null,
              hppSubtotal:         item.hppSubtotal  || null,
              includeAgencyFee:    item.includeAgencyFee,
              showInInvoiceDetail: item.showInInvoiceDetail,
              order:               item.order ?? ii,
            })),
          },
        })),
      },
    },
    include: {
      sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
      createdBy:    { select: { id: true, name: true } },
      picQuotation: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(newQuotation, { status: 201 })
}
