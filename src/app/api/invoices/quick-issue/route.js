/**
 * POST /api/invoices/quick-issue
 * Buat invoice ISSUED + Receivable dari quotation WON sekaligus.
 * Body: { quotationId, issueDate, dueDate? }
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED = ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR']

function extractQuotSeq(quotationNumber) {
  if (!quotationNumber) return null
  const parts = quotationNumber.split('/')
  const last = parts[parts.length - 1]
  return /^\d+$/.test(last) ? last.padStart(3, '0') : null
}

async function buildInvoiceNumber(division, quotationNumber) {
  const year = new Date().getFullYear()
  const prefix = division === 'PH' ? 'WTM/PH/INV' : 'WTM/EO/INV'
  const quotSeq = extractQuotSeq(quotationNumber)
  const count = await prisma.invoice.count({
    where: { invoiceNumber: { startsWith: `${prefix}/${year}/` } },
  })
  const invSeq = String(count + 1).padStart(3, '0')
  return quotSeq ? `${prefix}/${year}/${quotSeq}/${invSeq}` : `${prefix}/${year}/${invSeq}`
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { quotationId, issueDate, dueDate } = await req.json()
  if (!quotationId) return NextResponse.json({ error: 'quotationId wajib' }, { status: 400 })

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!quotation) return NextResponse.json({ error: 'Quotation tidak ditemukan' }, { status: 404 })
  if (quotation.status !== 'WON') return NextResponse.json({ error: 'Hanya quotation WON' }, { status: 400 })

  // Pastikan belum ada invoice ISSUED/PAID
  const existing = await prisma.invoice.findFirst({
    where: { quotationId, status: { in: ['ISSUED', 'PAID'] } },
  })
  if (existing) return NextResponse.json({ error: 'Invoice sudah ada dan terkirim' }, { status: 409 })

  // Hitung total
  const allItems = quotation.sections.flatMap(s => s.items)
  let subtotal = 0, agencyBase = 0
  for (const item of allItems) {
    subtotal += item.subtotal || 0
    if (item.includeAgencyFee) agencyBase += item.subtotal || 0
  }
  const agencyFeeAmount = agencyBase * ((quotation.agencyFeePercent || 0) / 100)
  const ppnAmount = quotation.includesPpn
    ? (subtotal + agencyFeeAmount) * ((quotation.ppnPercent || 11) / 100)
    : 0
  const totalAmount = subtotal + agencyFeeAmount + ppnAmount

  // Nomor invoice
  const invoiceNumber = await buildInvoiceNumber(quotation.division || 'EVENT', quotation.quotationNumber)

  // Hitung term number
  const existingCount = await prisma.invoice.count({ where: { quotationId } })
  const termNumber = existingCount + 1

  // Invoice items dari quotation
  const invoiceItems = []
  let order = 0
  for (const sec of quotation.sections) {
    for (const item of sec.items) {
      invoiceItems.push({
        description:      item.description,
        detailText:       item.detailText || null,
        rate:             item.rate,
        unitType:         item.unitType,
        qty:              item.qty,
        days:             item.days,
        subtotal:         item.subtotal,
        includeAgencyFee: item.includeAgencyFee,
        showInDetail:     item.showInInvoiceDetail ?? true,
        order:            order++,
      })
    }
  }

  const issueDateParsed = issueDate ? new Date(issueDate) : new Date()
  const dueDateParsed   = dueDate   ? new Date(dueDate)   : null

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      quotationId,
      termNumber,
      financeClientName: quotation.clientName,
      financeEventName:  quotation.eventName,
      mode:              'DETAIL',
      isDP:              false,
      dpExcludePpn:      false,
      subtotal,
      agencyFeeAmount,
      ppnAmount,
      totalAmount,
      issueDate:  issueDateParsed,
      dueDate:    dueDateParsed,
      status:     'ISSUED',
      createdById: session.user.id,
      items: { create: invoiceItems },
    },
  })

  await prisma.receivable.create({
    data: {
      projectId:          quotation.projectId || null,
      invoiceId:          invoice.id,
      invoiceNumber,
      clientName:         quotation.clientName,
      financeProjectName: quotation.eventName,
      amount:             totalAmount,
      issueDate:          issueDateParsed,
      dueDate:            dueDateParsed,
      isDraft:            false,
      status:             'UNPAID',
    },
  })

  // Mark PersonalTask terkait sebagai DONE (idempotent via marker di description)
  const marker = `[inv-queue:${quotationId}]`
  await prisma.personalTask.updateMany({
    where: {
      description: { contains: marker },
      status: { not: 'DONE' },
    },
    data: { status: 'DONE' },
  })

  return NextResponse.json({ ok: true, invoiceId: invoice.id, invoiceNumber }, { status: 201 })
}
