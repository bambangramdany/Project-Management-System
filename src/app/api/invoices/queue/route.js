/**
 * GET /api/invoices/queue
 * WON quotations where the project execution date has passed
 * and no ISSUED or PAID invoice exists yet.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED = ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR']

export const dynamic = 'force-dynamic'

function computeTotal(q) {
  const allItems = q.sections.flatMap(s => s.items)
  let subtotal = 0, agencyBase = 0
  for (const item of allItems) {
    subtotal += item.subtotal || 0
    if (item.includeAgencyFee) agencyBase += item.subtotal || 0
  }
  const agencyFeeAmount = agencyBase * ((q.agencyFeePercent || 0) / 100)
  const ppnAmount = q.includesPpn ? (subtotal + agencyFeeAmount) * ((q.ppnPercent || 11) / 100) : 0
  return { subtotal, agencyFeeAmount, ppnAmount, totalAmount: subtotal + agencyFeeAmount + ppnAmount }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // WON quotations with at least one invoice that is not ISSUED/PAID,
  // OR quotations with no invoices at all — where project ended.
  const quotations = await prisma.quotation.findMany({
    where: {
      status: 'WON',
      invoices: { none: { status: { in: ['ISSUED', 'PAID'] } } },
      project: {
        OR: [
          { endDate: { lt: today } },
          { endDate: null, startDate: { lt: today } },
        ],
      },
    },
    include: {
      project: { select: { id: true, code: true, name: true, startDate: true, endDate: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true },
      },
    },
    orderBy: { updatedAt: 'asc' },
  })

  const result = quotations.map(q => {
    const totals = computeTotal(q)
    const execDate = q.project?.endDate || q.project?.startDate || null
    const draftInvoice = q.invoices.find(i => i.status === 'DRAFT') || null
    return {
      id: q.id,
      quotationNumber: q.quotationNumber,
      clientName: q.clientName,
      eventName: q.eventName,
      eventDate: q.eventDate,
      division: q.division,
      projectId: q.project?.id || null,
      projectCode: q.project?.code || null,
      projectName: q.project?.name || null,
      execDate,
      draftInvoiceId: draftInvoice?.id || null,
      draftInvoiceNumber: draftInvoice?.invoiceNumber || null,
      ...totals,
    }
  })

  return NextResponse.json({ quotations: result })
}
