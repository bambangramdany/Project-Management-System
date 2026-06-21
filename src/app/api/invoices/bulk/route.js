/**
 * POST /api/invoices/bulk
 * Batch-create invoices from multiple WON quotations.
 *
 * Body: {
 *   invoices: [{
 *     quotationId:  string
 *     issueDate?:   string (YYYY-MM-DD)
 *     dueDate?:     string (YYYY-MM-DD)
 *     status?:      'DRAFT' | 'ISSUED' | 'PAID'   (default DRAFT)
 *     poNumber?:    string
 *   }]
 * }
 *
 * Returns: { created: N, failed: [{ quotationId, error }] }
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

function canManage(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

function buildInvoiceNumber(quotationNumber, termNumber) {
  const base = quotationNumber.replace('/QUOT/', '/INV/')
  return `${base}/${String(termNumber).padStart(3, '0')}`
}

function computeTotals(items, agencyFeePercent, includesPpn, ppnPercent) {
  let subtotal = 0, agencyBase = 0
  for (const item of items) {
    subtotal    += item.subtotal || 0
    if (item.includeAgencyFee) agencyBase += item.subtotal || 0
  }
  const agencyFeeAmount = agencyBase * ((agencyFeePercent || 0) / 100)
  const ppnAmount       = includesPpn ? (subtotal + agencyFeeAmount) * ((ppnPercent || 11) / 100) : 0
  const totalAmount     = subtotal + agencyFeeAmount + ppnAmount
  return { subtotal, agencyFeeAmount, ppnAmount, totalAmount }
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { invoices: requests } = await req.json()
  if (!Array.isArray(requests) || requests.length === 0) {
    return NextResponse.json({ error: 'Tidak ada invoice yang dipilih' }, { status: 400 })
  }

  // Fetch all quotations in one query
  const quotationIds = [...new Set(requests.map(r => r.quotationId))]
  const quotations = await prisma.quotation.findMany({
    where: { id: { in: quotationIds } },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  })
  const quotationMap = Object.fromEntries(quotations.map(q => [q.id, q]))

  // Check existing invoices count per quotation (to compute termNumber)
  const existingCounts = await prisma.invoice.groupBy({
    by: ['quotationId'],
    where: { quotationId: { in: quotationIds } },
    _count: { id: true },
  })
  const existingMap = Object.fromEntries(existingCounts.map(e => [e.quotationId, e._count.id]))

  let created = 0
  const failed = []

  for (const req of requests) {
    const quotation = quotationMap[req.quotationId]
    if (!quotation) {
      failed.push({ quotationId: req.quotationId, error: 'Quotation tidak ditemukan' })
      continue
    }
    if (quotation.status !== 'WON') {
      failed.push({ quotationId: req.quotationId, error: 'Quotation bukan status WON' })
      continue
    }

    try {
      const termNumber    = (existingMap[quotation.id] || 0) + 1
      const invoiceNumber = buildInvoiceNumber(quotation.quotationNumber, termNumber)

      // Build invoice items from quotation
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
            showInDetail:     item.showInInvoiceDetail,
            order:            order++,
          })
        }
      }

      const totals    = computeTotals(invoiceItems, quotation.agencyFeePercent, quotation.includesPpn, quotation.ppnPercent)
      const status    = req.status || 'DRAFT'
      const issueDate = req.issueDate ? new Date(req.issueDate) : null
      const dueDate   = req.dueDate  ? new Date(req.dueDate)   : null

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          quotationId:       quotation.id,
          termNumber,
          financeClientName: quotation.clientName,
          financeEventName:  quotation.eventName,
          poNumber:          req.poNumber  || null,
          mode:              'SUMMARY',    // historical imports default to SUMMARY
          isDP:              false,
          subtotal:          totals.subtotal,
          agencyFeeAmount:   totals.agencyFeeAmount,
          ppnAmount:         totals.ppnAmount,
          totalAmount:       totals.totalAmount,
          issueDate,
          dueDate,
          status,
          createdById:       session.user.id,
          items:             { create: invoiceItems },
        },
      })

      // Auto-create Receivable
      await prisma.receivable.create({
        data: {
          projectId:          quotation.projectId || null,
          invoiceId:          invoice.id,
          invoiceNumber,
          clientName:         quotation.clientName,
          financeProjectName: quotation.eventName,
          poNumber:           req.poNumber || null,
          amount:             totals.totalAmount,
          issueDate,
          dueDate,
          isDraft:            false,
          status:             status === 'PAID' ? 'PAID' : 'UNPAID',
        },
      })

      // Update existingMap so next termin for same quotation increments correctly
      existingMap[quotation.id] = termNumber

      created++
    } catch (err) {
      failed.push({ quotationId: req.quotationId, error: err.message || 'Gagal membuat invoice' })
    }
  }

  return NextResponse.json({ created, failed }, { status: 201 })
}
