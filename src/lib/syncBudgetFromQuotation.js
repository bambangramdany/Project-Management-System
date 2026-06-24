import { prisma } from '@/lib/prisma'

/**
 * Sync budget items from a WON quotation into the project's forecast budget.
 *
 * Strategy:
 * - Each budget item is tagged with sourceQuotationId so we know which quotation it came from.
 * - Main quotation (isAddCost=false): deletes existing items from THIS quotation that have no
 *   payment requests, then re-creates them from the latest quotation content.
 * - Add Cost quotation (isAddCost=true): same logic but items are prefixed with the add cost
 *   quotation number so they're visually distinct in the forecast table.
 * - Items with payment requests are NEVER deleted (regardless of quotation type).
 * - Manual items (sourceQuotationId=null) are NEVER touched.
 *
 * @param {string} projectId
 * @param {string} quotationId
 * @returns {{ created: number, skippedDueToPayments: number, grandTotal: number }}
 */
export async function syncBudgetFromQuotation(projectId, quotationId) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
    },
  })

  if (!quotation || quotation.status !== 'WON') return { created: 0, skippedDueToPayments: 0, grandTotal: 0 }
  if (!projectId) return { created: 0, skippedDueToPayments: 0, grandTotal: 0 }

  // 1. Find existing budget items from this quotation
  const existing = await prisma.projectBudgetItem.findMany({
    where: { projectId, sourceQuotationId: quotationId },
    include: { payments: { select: { id: true } } },
  })

  // 2. Delete only items without payment requests
  const deletable = existing.filter(i => i.payments.length === 0).map(i => i.id)
  const skippedDueToPayments = existing.length - deletable.length

  if (deletable.length > 0) {
    await prisma.projectBudgetItem.deleteMany({ where: { id: { in: deletable } } })
  }

  // 3. Keep existing order offset so add-cost items sort after main items
  const mainItemCount = await prisma.projectBudgetItem.count({
    where: { projectId, sourceQuotationId: null },
  })
  const existingWithPR = await prisma.projectBudgetItem.findMany({
    where: { projectId, sourceQuotationId: quotationId },
    select: { order: true },
    orderBy: { order: 'asc' },
  })
  // Start ordering after the highest existing order for this quotation (or after manual items)
  const baseOrder = quotation.isAddCost
    ? (existingWithPR[0]?.order ?? (mainItemCount + 1000))
    : mainItemCount

  // 4. Build new items from quotation sections
  const prefix = quotation.isAddCost ? `[Add Cost ${quotation.quotationNumber}] ` : ''
  const newItems = []
  let order = baseOrder

  for (const sec of quotation.sections) {
    for (const item of sec.items) {
      const quotedAmount = item.hppSubtotal != null ? item.hppSubtotal : (item.subtotal || 0)
      newItems.push({
        projectId,
        label:                `${prefix}[${sec.letter}] ${item.description}`,
        category:             'OPERATIONAL_OTHER',
        quotedAmount,
        qty:                  item.qty      || 1,
        unitPrice:            item.hppRate  ?? (item.rate || 0),
        needsUpfrontFunding:  false,
        isTitipan:            false,
        order:                order++,
        note:                 item.detailText ? item.detailText.slice(0, 500) : null,
        sourceQuotationId:    quotationId,
        sourceQuotationNumber: quotation.quotationNumber,
      })
    }
  }

  if (newItems.length > 0) {
    await prisma.projectBudgetItem.createMany({ data: newItems })
  }

  // 5. Compute grand total (selling price) for projectValue update
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

  // 6. Update projectValue only for main quotation and only if not yet set
  if (!quotation.isAddCost) {
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { projectValue: true } })
    if (!project?.projectValue && grandTotal > 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          projectValue:    grandTotal,
          includesPpn:     quotation.includesPpn,
          quotationNumber: quotation.quotationNumber,
        },
      })
    }
  }

  return { created: newItems.length, skippedDueToPayments, grandTotal }
}
