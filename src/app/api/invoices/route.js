import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

function canManageInvoices(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}
function canViewInvoices(user) {
  return canManageInvoices(user) || user.role === 'DIRECTOR' || user.role === 'PROJECT_MANAGER'
}

// Auto-generate invoice number: WTM/EO/INV/2026/073/001
function buildInvoiceNumber(quotationNumber, termNumber) {
  // quotationNumber: WTM/EO/QUOT/2026/073 → WTM/EO/INV/2026/073
  const base = quotationNumber.replace('/QUOT/', '/INV/')
  const term = String(termNumber).padStart(3, '0')
  return `${base}/${term}`
}

// Compute invoice totals from items
function computeTotals(items, agencyFeePercent, includesPpn, ppnPercent) {
  let subtotal = 0
  let agencyBase = 0
  for (const item of items) {
    subtotal += item.subtotal || 0
    if (item.includeAgencyFee) agencyBase += item.subtotal || 0
  }
  const agencyFeeAmount = agencyBase * ((agencyFeePercent || 0) / 100)
  const ppnAmount = includesPpn ? (subtotal + agencyFeeAmount) * ((ppnPercent || 11) / 100) : 0
  const totalAmount = subtotal + agencyFeeAmount + ppnAmount
  return { subtotal, agencyFeeAmount, ppnAmount, totalAmount }
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewInvoices(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const quotationId = searchParams.get('quotationId')
  const status      = searchParams.get('status')

  const where = {}
  if (quotationId) where.quotationId = quotationId
  if (status && status !== 'all') where.status = status

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      quotation:  { select: { id: true, quotationNumber: true, clientName: true, eventName: true, division: true } },
      createdBy:  { select: { id: true, name: true } },
      items:      { orderBy: { order: 'asc' } },
      receivables: { select: { id: true, status: true, amount: true, paidAmount: true, invoiceNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invoices })
}

// POST — create invoice from a WON quotation
// Body: { quotationId, termNumber, mode, isDP, financeClientName, financeEventName,
//         poNumber, taxInvoiceNumber, picFinanceName, picFinancePhone,
//         issueDate, dueDate, notes, items (optional overrides), dpAmount }
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageInvoices(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (!body.quotationId) return NextResponse.json({ error: 'quotationId wajib diisi' }, { status: 400 })

  const quotation = await prisma.quotation.findUnique({
    where: { id: body.quotationId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!quotation) return NextResponse.json({ error: 'Quotation tidak ditemukan' }, { status: 404 })
  if (quotation.status !== 'WON') {
    return NextResponse.json({ error: 'Hanya quotation berstatus WON yang bisa dibuatkan invoice' }, { status: 400 })
  }

  // Determine term number (auto-increment from existing invoices)
  const existingInvoices = await prisma.invoice.findMany({
    where: { quotationId: body.quotationId },
    select: { termNumber: true },
  })
  const termNumber = body.termNumber || (existingInvoices.length + 1)
  const invoiceNumber = buildInvoiceNumber(quotation.quotationNumber, termNumber)

  // Build invoice items from quotation sections/items
  // Allow body.items to override showInDetail per item (keyed by QuotationItem description)
  const itemOverrides = {}
  if (body.items) {
    body.items.forEach(it => { if (it._quotationItemId) itemOverrides[it._quotationItemId] = it })
  }

  const invoiceItems = []
  let order = 0
  for (const sec of quotation.sections) {
    for (const item of sec.items) {
      const override = itemOverrides[item.id] || {}
      invoiceItems.push({
        description:      item.description,
        detailText:       item.detailText || null,
        rate:             item.rate,
        unitType:         item.unitType,
        qty:              item.qty,
        days:             item.days,
        subtotal:         item.subtotal,
        includeAgencyFee: item.includeAgencyFee,
        showInDetail:     override.showInDetail !== undefined ? override.showInDetail : item.showInInvoiceDetail,
        order:            order++,
      })
    }
  }

  const mode       = body.mode || 'DETAIL'
  const isDP       = !!body.isDP
  const totals     = computeTotals(invoiceItems, quotation.agencyFeePercent, quotation.includesPpn, quotation.ppnPercent)
  const totalAmount = body.totalAmount != null ? parseFloat(body.totalAmount) : totals.totalAmount

  // For DP: invoice amount = dpAmount, pelunasan = rest
  const dpAmount   = isDP && body.dpAmount ? parseFloat(body.dpAmount) : null
  const invoiceTotal = isDP && dpAmount ? dpAmount : totalAmount

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      quotationId:       body.quotationId,
      termNumber,
      financeClientName: body.financeClientName || quotation.clientName,
      financeEventName:  body.financeEventName  || quotation.eventName,
      poNumber:          body.poNumber          || null,
      taxInvoiceNumber:  body.taxInvoiceNumber  || null,
      picFinanceName:    body.picFinanceName     || null,
      picFinancePhone:   body.picFinancePhone    || null,
      mode,
      isDP,
      subtotal:          totals.subtotal,
      agencyFeeAmount:   totals.agencyFeeAmount,
      ppnAmount:         totals.ppnAmount,
      totalAmount:       invoiceTotal,
      issueDate:         body.issueDate ? new Date(body.issueDate) : null,
      dueDate:           body.dueDate   ? new Date(body.dueDate)   : null,
      status:            'DRAFT',
      notes:             body.notes             || null,
      termsConditions:   body.termsConditions   || quotation.termsConditions || null,
      createdById:       session.user.id,
      items: { create: invoiceItems },
    },
    include: {
      items:      { orderBy: { order: 'asc' } },
      quotation:  { select: { id: true, quotationNumber: true, clientName: true, eventName: true } },
      createdBy:  { select: { id: true, name: true } },
    },
  })

  // Auto-create Receivable (draft) linked to this invoice
  await prisma.receivable.create({
    data: {
      projectId:         quotation.projectId || null,
      invoiceId:         invoice.id,
      invoiceNumber,
      clientName:        invoice.financeClientName,
      financeProjectName: invoice.financeEventName,
      poNumber:          body.poNumber || null,
      taxInvoiceNumber:  body.taxInvoiceNumber || null,
      amount:            invoiceTotal,
      issueDate:         body.issueDate ? new Date(body.issueDate) : null,
      dueDate:           body.dueDate   ? new Date(body.dueDate)   : null,
      isDraft:           false,
      status:            'UNPAID',
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
