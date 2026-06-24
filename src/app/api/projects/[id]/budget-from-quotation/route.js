import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditBudget } from '@/lib/rbac'
import { syncBudgetFromQuotation } from '@/lib/syncBudgetFromQuotation'
import { NextResponse } from 'next/server'

// POST /api/projects/[id]/budget-from-quotation
// Body: { quotationId }
// Syncs a WON quotation's items into ProjectBudgetItems, tagged by sourceQuotationId.
// Safe to call multiple times (re-sync on revision).
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })
  if (!canEditBudget(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { quotationId } = await req.json()
  if (!quotationId) return NextResponse.json({ error: 'quotationId diperlukan' }, { status: 400 })

  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId }, select: { status: true } })
  if (!quotation) return NextResponse.json({ error: 'Quotation tidak ditemukan' }, { status: 404 })
  if (quotation.status !== 'WON') {
    return NextResponse.json({ error: 'Hanya quotation berstatus WON yang bisa disinkronkan' }, { status: 400 })
  }

  const result = await syncBudgetFromQuotation(params.id, quotationId)
  return NextResponse.json(result)
}
