import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Who can create / manage quotations
function canManageQuotations(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user.role)
}

function canViewQuotations(user) {
  return canManageQuotations(user) || ['FINANCE', 'FINANCE_STAFF'].includes(user.role)
}

// Generate next quotation number for a given division and year
// Format: WTM/EO/QUOT/2026/073
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

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewQuotations(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const division  = searchParams.get('division')
  const projectId = searchParams.get('projectId')

  const where = {}
  if (status    && status    !== 'all') where.status    = status
  if (division  && division  !== 'all') where.division  = division
  if (projectId) where.projectId = projectId

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      createdBy:    { select: { id: true, name: true } },
      picQuotation: { select: { id: true, name: true } },
      approver1:    { select: { id: true, name: true } },
      approver2:    { select: { id: true, name: true } },
      project:      { select: { id: true, code: true, name: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: {
          items: { orderBy: { order: 'asc' } },
        },
      },
      _count: { select: { invoices: true, addCosts: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ quotations })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageQuotations(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (!body.clientName?.trim()) return NextResponse.json({ error: 'Nama klien wajib diisi' }, { status: 400 })
  if (!body.eventName?.trim())  return NextResponse.json({ error: 'Nama event wajib diisi' }, { status: 400 })

  const year = new Date().getFullYear()
  const division = body.division || 'EVENT'
  const quotationNumber = await nextQuotationNumber(division, year)

  // Build sections + items
  const sections = (body.sections || []).map((sec, si) => ({
    letter: sec.letter || String.fromCharCode(65 + si),
    name:   sec.name || '',
    order:  si,
    items: {
      create: (sec.items || []).map((item, ii) => ({
        no:                  item.no ?? (ii + 1),
        description:         item.description || '',
        detailText:          item.detailText  || null,
        rate:                item.rate != null ? parseFloat(item.rate) : null,
        unitType:            item.unitType    || 'Unit',
        qty:                 parseFloat(item.qty)  || 1,
        days:                parseFloat(item.days) || 1,
        subtotal:            parseFloat(item.subtotal) || 0,
        includeAgencyFee:    !!item.includeAgencyFee,
        showInInvoiceDetail: item.showInInvoiceDetail !== false,
        order:               ii,
      })),
    },
  }))

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      division,
      status:          'DRAFT',
      clientName:      body.clientName.trim(),
      eventName:       body.eventName.trim(),
      venue:           body.venue           || null,
      eventDate:       body.eventDate       || null,
      location:        body.location        || null,
      agencyFeePercent: parseFloat(body.agencyFeePercent) || 0,
      includesPpn:     !!body.includesPpn,
      ppnPercent:      parseFloat(body.ppnPercent) || 11,
      dpPercent:       body.dpPercent  != null ? parseFloat(body.dpPercent)  : null,
      dpAmount:        body.dpAmount   != null ? parseFloat(body.dpAmount)   : null,
      picQuotationId:  body.picQuotationId  || null,
      createdById:     session.user.id,
      approver1Id:     body.approver1Id     || null,
      approver2Id:     body.approver2Id     || null,
      projectId:       body.projectId       || null,
      isAddCost:       !!body.isAddCost,
      notes:           body.notes           || null,
      termsConditions: body.termsConditions || null,
      sections: { create: sections },
    },
    include: {
      sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
      createdBy:    { select: { id: true, name: true } },
      picQuotation: { select: { id: true, name: true } },
      approver1:    { select: { id: true, name: true } },
      approver2:    { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(quotation, { status: 201 })
}
