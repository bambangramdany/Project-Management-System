import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditBudget } from '@/lib/rbac'
import { NextResponse } from 'next/server'

// POST /api/projects/[id]/budget-from-quotation
// Body: { quotationId, mode: 'replace' | 'append' }
// Creates ProjectBudgetItems from a WON quotation's sections/items.
// "by client" items (rate = null) are included with quotedAmount = 0.
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })

  if (!canEditBudget(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { quotationId, mode = 'replace' } = await req.json()

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
  if (quotation.status !== 'WON') {
    return NextResponse.json({ error: 'Hanya quotation berstatus Won yang bisa disinkronkan ke Forecast Budget' }, { status: 400 })
  }

  // Build list of budget items from quotation sections/items
  const newItems = []
  let order = 0
  for (const sec of quotation.sections) {
    for (const item of sec.items) {
      // Skip "by client" items with zero subtotal (not our cost)
      const quotedAmount = item.subtotal || 0
      newItems.push({
        projectId:   params.id,
        label:       `[${sec.letter}] ${item.description}`,
        category:    'OPERATIONAL_OTHER',
        quotedAmount,
        qty:         item.qty   || 1,
        unitPrice:   item.rate  || 0,
        needsUpfrontFunding: false,
        isTitipan:   false,
        order:       order++,
        note:        item.detailText ? item.detailText.slice(0, 500) : null,
      })
    }
  }

  if (mode === 'replace') {
    // Delete existing budget items (only those with no payment requests)
    const existing = await prisma.projectBudgetItem.findMany({
      where: { projectId: params.id },
      include: { payments: { select: { id: true } } },
    })
    const deletable = existing.filter(i => i.payments.length === 0).map(i => i.id)
    if (deletable.length) {
      await prisma.projectBudgetItem.deleteMany({ where: { id: { in: deletable } } })
    }
  }

  // Create new budget items
  const created = await prisma.projectBudgetItem.createMany({ data: newItems })

  // Update project projectValue from quotation grand total (if not already set)
  // Compute grand total
  let base = 0, agencyBase = 0
  for (const sec of quotation.sections) {
    for (const item of sec.items) {
      base += item.subtotal || 0
      if (item.includeAgencyFee) agencyBase += item.subtotal || 0
    }
  }
  const agencyFeeAmt = agencyBase * ((quotation.agencyFeePercent || 0) / 100)
  const ppn = quotation.includesPpn ? (base + agencyFeeAmt) * ((quotation.ppnPercent || 11) / 100) : 0
  const grandTotal = base + agencyFeeAmt + ppn

  // Only update projectValue if it's not already set
  if (!project.projectValue && grandTotal > 0) {
    await prisma.project.update({
      where: { id: params.id },
      data: {
        projectValue: grandTotal,
        includesPpn: quotation.includesPpn,
        quotationNumber: quotation.quotationNumber,
      },
    })
  }

  return NextResponse.json({ created: created.count, grandTotal })
}
