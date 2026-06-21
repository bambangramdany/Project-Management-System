/**
 * GET /api/quotations/without-invoice
 * Returns WON quotations that have no invoices yet — used by the bulk invoice generator.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED = ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const quotations = await prisma.quotation.findMany({
    where: {
      status: 'WON',
      invoices: { none: {} },
    },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Compute grand total for each quotation (same formula as invoice creation)
  const result = quotations.map(q => {
    const allItems = q.sections.flatMap(s => s.items)
    let subtotal = 0
    let agencyBase = 0
    for (const item of allItems) {
      subtotal += item.subtotal || 0
      if (item.includeAgencyFee) agencyBase += item.subtotal || 0
    }
    const agencyFeeAmount = agencyBase * ((q.agencyFeePercent || 0) / 100)
    const ppnAmount       = q.includesPpn ? (subtotal + agencyFeeAmount) * ((q.ppnPercent || 11) / 100) : 0
    const totalAmount     = subtotal + agencyFeeAmount + ppnAmount

    return {
      id:               q.id,
      quotationNumber:  q.quotationNumber,
      clientName:       q.clientName,
      eventName:        q.eventName,
      division:         q.division,
      agencyFeePercent: q.agencyFeePercent,
      includesPpn:      q.includesPpn,
      subtotal,
      agencyFeeAmount,
      ppnAmount,
      totalAmount,
      createdAt:        q.createdAt,
    }
  })

  return NextResponse.json({ quotations: result })
}
