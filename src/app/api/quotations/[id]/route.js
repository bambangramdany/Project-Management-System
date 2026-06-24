import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncBudgetFromQuotation } from '@/lib/syncBudgetFromQuotation'
import { NextResponse } from 'next/server'

function canManageQuotations(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user.role)
}

function canApprove(user) {
  return ['OWNER', 'DIRECTOR'].includes(user.role)
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    include: {
      createdBy:    { select: { id: true, name: true, jobTitle: true } },
      picQuotation: { select: { id: true, name: true, jobTitle: true } },
      approver1:    { select: { id: true, name: true, jobTitle: true } },
      approver2:    { select: { id: true, name: true, jobTitle: true } },
      project:      { select: { id: true, code: true, name: true } },
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
      addCosts: {
        orderBy: { createdAt: 'asc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      invoices: {
        orderBy: { termNumber: 'asc' },
        include: {
          items: { orderBy: { order: 'asc' } },
          receivables: { select: { id: true, status: true, amount: true, paidAmount: true } },
        },
      },
    },
  })

  if (!quotation) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json(quotation)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageQuotations(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const quotation = await prisma.quotation.findUnique({ where: { id: params.id } })
  if (!quotation) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()

  // ── Status transitions ──────────────────────────────────────────────────
  if (body.action === 'submit') {
    // PM/creator submits → PENDING_WULAN
    if (!['DRAFT'].includes(quotation.status)) {
      return NextResponse.json({ error: 'Quotation sudah tidak bisa disubmit' }, { status: 400 })
    }
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: 'PENDING_WULAN' },
    })
    return NextResponse.json(updated)
  }

  if (body.action === 'approve_wulan') {
    if (!canApprove(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (quotation.status !== 'PENDING_WULAN') {
      return NextResponse.json({ error: 'Status tidak sesuai' }, { status: 400 })
    }
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: 'PENDING_DIRECTOR' },
    })
    return NextResponse.json(updated)
  }

  if (body.action === 'approve_director') {
    if (!canApprove(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (quotation.status !== 'PENDING_DIRECTOR') {
      return NextResponse.json({ error: 'Status tidak sesuai' }, { status: 400 })
    }
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: 'APPROVED' },
    })
    return NextResponse.json(updated)
  }

  if (body.action === 'mark_won') {
    if (quotation.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Quotation harus Approved terlebih dahulu' }, { status: 400 })
    }
    const projectId = body.projectId || quotation.projectId || null
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: 'WON', projectId },
    })
    // Auto-sync ke forecast budget jika sudah ada project yang terhubung
    if (projectId) {
      await syncBudgetFromQuotation(projectId, params.id).catch(() => {})
    }
    return NextResponse.json(updated)
  }

  if (body.action === 'mark_lost') {
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: 'LOST' },
    })
    return NextResponse.json(updated)
  }

  if (body.action === 'revert_to_draft') {
    // WON juga bisa dikembalikan ke draft untuk revisi (oleh Owner/Director)
    const allowedFrom = ['PENDING_WULAN', 'PENDING_DIRECTOR', 'WON']
    if (!allowedFrom.includes(quotation.status)) {
      return NextResponse.json({ error: 'Tidak bisa kembali ke draft dari status ini' }, { status: 400 })
    }
    if (quotation.status === 'WON' && !canApprove(session.user)) {
      return NextResponse.json({ error: 'Hanya Owner/Director yang bisa membuka kembali quotation WON' }, { status: 403 })
    }
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { status: 'DRAFT', version: { increment: 1 } },
    })
    return NextResponse.json(updated)
  }

  // ── Update signature fields only (any status) ─────────────────────────
  if (body.action === 'update_sig') {
    const data = {}
    if (body.picQuotationId !== undefined) data.picQuotationId = body.picQuotationId || null
    if (body.approver1Id    !== undefined) data.approver1Id    = body.approver1Id    || null
    if (body.approver2Id    !== undefined) data.approver2Id    = body.approver2Id    || null
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data,
      include: {
        picQuotation: { select: { id: true, name: true } },
        approver1:    { select: { id: true, name: true } },
        approver2:    { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(updated)
  }

  // ── Link / unlink project (any status) ───────────────────────────────
  if (body.action === 'link_project') {
    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data: { projectId: body.projectId || null },
    })
    return NextResponse.json(updated)
  }

  // ── Full content update (DRAFT only) ──────────────────────────────────
  if (body.action === 'update_content' || !body.action) {
    if (!['DRAFT'].includes(quotation.status)) {
      return NextResponse.json({ error: 'Hanya quotation berstatus Draft yang bisa diedit' }, { status: 400 })
    }

    const data = {}
    if (body.clientName !== undefined) data.clientName = body.clientName.trim()
    if (body.eventName  !== undefined) data.eventName  = body.eventName.trim()
    if (body.venue      !== undefined) data.venue      = body.venue      || null
    if (body.eventDate  !== undefined) data.eventDate  = body.eventDate  || null
    if (body.location   !== undefined) data.location   = body.location   || null
    if (body.agencyFeePercent !== undefined) data.agencyFeePercent = parseFloat(body.agencyFeePercent) || 0
    if (body.includesPpn      !== undefined) data.includesPpn      = !!body.includesPpn
    if (body.ppnPercent       !== undefined) data.ppnPercent       = parseFloat(body.ppnPercent) || 11
    if (body.dpPercent        !== undefined) data.dpPercent        = body.dpPercent  != null ? parseFloat(body.dpPercent)  : null
    if (body.dpAmount         !== undefined) data.dpAmount         = body.dpAmount   != null ? parseFloat(body.dpAmount)   : null
    if (body.isAddCost        !== undefined) data.isAddCost        = !!body.isAddCost
    if (body.picQuotationId   !== undefined) data.picQuotationId   = body.picQuotationId || null
    if (body.approver1Id      !== undefined) data.approver1Id      = body.approver1Id    || null
    if (body.approver2Id      !== undefined) data.approver2Id      = body.approver2Id    || null
    if (body.projectId        !== undefined) data.projectId        = body.projectId      || null
    if (body.notes            !== undefined) data.notes            = body.notes          || null
    if (body.termsConditions  !== undefined) data.termsConditions  = body.termsConditions || null

    // Replace all sections + items if provided
    if (body.sections !== undefined) {
      // Delete existing sections (cascades to items)
      await prisma.quotationSection.deleteMany({ where: { quotationId: params.id } })

      data.sections = {
        create: (body.sections || []).map((sec, si) => ({
          letter: sec.letter || String.fromCharCode(65 + si),
          name:   sec.name   || '',
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
              hppRate:             item.hppRate != null && item.hppRate !== '' ? parseFloat(item.hppRate) : null,
              hppSubtotal:         item.hppRate != null && item.hppRate !== ''
                                     ? parseFloat(item.hppRate) * (parseFloat(item.qty) || 1) * (parseFloat(item.days) || 1)
                                     : null,
              order:               ii,
            })),
          },
        })),
      }
    }

    const updated = await prisma.quotation.update({
      where: { id: params.id },
      data,
      include: {
        sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
        createdBy:    { select: { id: true, name: true } },
        picQuotation: { select: { id: true, name: true } },
        approver1:    { select: { id: true, name: true } },
        approver2:    { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageQuotations(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, quotationNumber: true },
  })
  if (!quotation) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (['WON', 'APPROVED'].includes(quotation.status)) {
    return NextResponse.json({ error: 'Quotation yang sudah Approved atau Won tidak bisa dihapus' }, { status: 400 })
  }

  // Sections and items cascade-delete via schema
  await prisma.quotation.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
