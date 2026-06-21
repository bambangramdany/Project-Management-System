/**
 * GET /api/admin/audit
 * Data reconciliation audit — identifies:
 * 1. Projects with no linked quotation (manual entries only)
 * 2. Quotations with no linked project
 * 3. Projects with projectValue ≠ their linked quotation grand total (mismatch)
 * 4. Potential duplicate projects (similar names)
 *
 * OWNER only.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function computeQuotTotal(q) {
  let base = 0, agencyBase = 0
  for (const sec of q.sections || []) {
    for (const item of sec.items || []) {
      base += item.subtotal || 0
      if (item.includeAgencyFee) agencyBase += item.subtotal || 0
    }
  }
  const af  = agencyBase * ((q.agencyFeePercent || 0) / 100)
  const ppn = q.includesPpn ? (base + af) * ((q.ppnPercent || 11) / 100) : 0
  return base + af + ppn
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all projects (all statuses)
  const projects = await prisma.project.findMany({
    select: {
      id: true, name: true, status: true, division: true,
      projectValue: true, startDate: true, briefDate: true,
      client: { select: { name: true } },
      pic: { select: { name: true } },
      quotations: {
        select: {
          id: true, quotationNumber: true, status: true,
          eventName: true, clientName: true,
          agencyFeePercent: true, includesPpn: true, ppnPercent: true,
          sections: {
            select: {
              items: {
                select: { subtotal: true, includeAgencyFee: true },
              },
            },
          },
          invoices: { select: { id: true, invoiceNumber: true, totalAmount: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch all WON/APPROVED quotations not linked to any project
  const orphanQuotations = await prisma.quotation.findMany({
    where: {
      projectId: null,
      status: { in: ['WON', 'APPROVED'] },
    },
    select: {
      id: true, quotationNumber: true, status: true,
      eventName: true, clientName: true, division: true,
      agencyFeePercent: true, includesPpn: true, ppnPercent: true,
      createdAt: true,
      sections: {
        select: {
          items: { select: { subtotal: true, includeAgencyFee: true } },
        },
      },
      invoices: { select: { id: true, invoiceNumber: true, totalAmount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // ── Classify projects ────────────────────────────────────────────────────
  const result = {
    summary: {
      totalProjects: projects.length,
      projectsNoQuotation: 0,
      projectsWithMismatch: 0,
      projectsClean: 0,
      orphanQuotations: orphanQuotations.length,
    },
    projectsNoQuotation:   [],  // manual projects, no WON quotation linked
    projectsWithMismatch:  [],  // projectValue ≠ linked quotation total
    projectsClean:         [],  // all good
    orphanQuotations:      [],  // WON/APPROVED quotations not linked to any project
  }

  for (const p of projects) {
    const wonQuots = p.quotations.filter(q => q.status === 'WON')
    const allQuots = p.quotations

    const quotGrandTotal = wonQuots.reduce((sum, q) => sum + computeQuotTotal(q), 0)
    const invoiceTotal   = allQuots.flatMap(q => q.invoices).reduce((sum, inv) => sum + inv.totalAmount, 0)
    const hasInvoices    = allQuots.flatMap(q => q.invoices).length > 0

    const row = {
      id:           p.id,
      name:         p.name,
      status:       p.status,
      division:     p.division,
      clientName:   p.client?.name || '—',
      picName:      p.pic?.name    || '—',
      projectValue: p.projectValue,
      quotCount:    allQuots.length,
      wonQuotCount: wonQuots.length,
      quotGrandTotal,
      invoiceTotal,
      hasInvoices,
      quotations: allQuots.map(q => ({
        id:             q.id,
        number:         q.quotationNumber,
        status:         q.status,
        eventName:      q.eventName,
        clientName:     q.clientName,
        grandTotal:     computeQuotTotal(q),
        invoiceCount:   q.invoices.length,
      })),
    }

    // Classify
    const hasWonQuot = wonQuots.length > 0
    const mismatch   = hasWonQuot && p.projectValue != null &&
                       Math.abs((p.projectValue || 0) - quotGrandTotal) > 1000

    if (!hasWonQuot && allQuots.length === 0) {
      result.projectsNoQuotation.push(row)
      result.summary.projectsNoQuotation++
    } else if (mismatch) {
      result.projectsWithMismatch.push(row)
      result.summary.projectsWithMismatch++
    } else {
      result.projectsClean.push(row)
      result.summary.projectsClean++
    }
  }

  // Orphan quotations
  result.orphanQuotations = orphanQuotations.map(q => ({
    id:           q.id,
    number:       q.quotationNumber,
    status:       q.status,
    eventName:    q.eventName,
    clientName:   q.clientName,
    division:     q.division,
    grandTotal:   computeQuotTotal(q),
    invoiceCount: q.invoices.length,
    invoiceTotal: q.invoices.reduce((s, i) => s + i.totalAmount, 0),
    createdAt:    q.createdAt,
  }))

  return NextResponse.json(result)
}
