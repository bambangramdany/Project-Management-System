import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

function canManageInvoices(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      quotation: {
        include: {
          sections: { orderBy: { order: 'asc' }, include: { items: { orderBy: { order: 'asc' } } } },
          picQuotation: { select: { id: true, name: true, jobTitle: true } },
          approver1:    { select: { id: true, name: true, jobTitle: true } },
          approver2:    { select: { id: true, name: true, jobTitle: true } },
        },
      },
      createdBy:   { select: { id: true, name: true } },
      items:       { orderBy: { order: 'asc' } },
      receivables: { select: { id: true, status: true, amount: true, paidAmount: true, pphAmount: true, paidAt: true } },
    },
  })

  if (!invoice) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageInvoices(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } })
  if (!invoice) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}

  // Status: issue the invoice
  if (body.action === 'issue') {
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Invoice sudah di-issued' }, { status: 400 })
    }
    data.status    = 'ISSUED'
    data.issueDate = body.issueDate ? new Date(body.issueDate) : (invoice.issueDate || new Date())
  }

  if (body.action === 'cancel') {
    data.status = 'CANCELLED'
  }

  // PO number & Faktur Pajak — editable regardless of status (often received after invoice issued)
  if (body.action === 'update_refs') {
    if (body.poNumber         !== undefined) data.poNumber         = body.poNumber         || null
    if (body.taxInvoiceNumber !== undefined) data.taxInvoiceNumber = body.taxInvoiceNumber || null
    // Sync to receivable too
    await prisma.receivable.updateMany({
      where: { invoiceId: params.id },
      data: {
        poNumber:        body.poNumber         || undefined,
        taxInvoiceNumber: body.taxInvoiceNumber || undefined,
      },
    })
  }

  // Field updates (DRAFT only)
  if (!body.action || body.action === 'update') {
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Hanya invoice DRAFT yang bisa diedit' }, { status: 400 })
    }
    const fields = ['financeClientName','financeEventName','poNumber','taxInvoiceNumber',
                    'picFinanceName','picFinancePhone','mode','notes','termsConditions']
    fields.forEach(f => { if (body[f] !== undefined) data[f] = body[f] || null })

    if (body.issueDate !== undefined) data.issueDate = body.issueDate ? new Date(body.issueDate) : null
    if (body.dueDate   !== undefined) data.dueDate   = body.dueDate   ? new Date(body.dueDate)   : null
    if (body.totalAmount !== undefined) data.totalAmount = parseFloat(body.totalAmount) || invoice.totalAmount

    // Update showInDetail per item
    if (body.items) {
      for (const it of body.items) {
        if (it.id) {
          await prisma.invoiceItem.update({
            where: { id: it.id },
            data: { showInDetail: it.showInDetail !== undefined ? it.showInDetail : true },
          })
        }
      }
    }

    // Sync receivable fields when invoice is updated
    await prisma.receivable.updateMany({
      where: { invoiceId: params.id },
      data: {
        clientName:        body.financeClientName || undefined,
        financeProjectName: body.financeEventName || undefined,
        poNumber:          body.poNumber || undefined,
        taxInvoiceNumber:  body.taxInvoiceNumber || undefined,
        invoiceNumber:     invoice.invoiceNumber,
        issueDate:         body.issueDate ? new Date(body.issueDate) : undefined,
        dueDate:           body.dueDate   ? new Date(body.dueDate)   : undefined,
        amount:            body.totalAmount ? parseFloat(body.totalAmount) : undefined,
      },
    })
  }

  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data,
    include: {
      items:      { orderBy: { order: 'asc' } },
      receivables: { select: { id: true, status: true, amount: true } },
      quotation:  { select: { id: true, quotationNumber: true, clientName: true, eventName: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageInvoices(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, receivables: { select: { id: true, kasTransactionInId: true, kasTransactionOutId: true } } },
  })
  if (!invoice) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (invoice.status === 'PAID') {
    return NextResponse.json({ error: 'Invoice yang sudah dibayar tidak bisa dihapus' }, { status: 400 })
  }

  // Delete linked receivables (and their kas transactions)
  for (const rec of invoice.receivables) {
    if (rec.kasTransactionInId) {
      await prisma.cashTransaction.delete({ where: { id: rec.kasTransactionInId } }).catch(() => {})
    }
    if (rec.kasTransactionOutId) {
      await prisma.cashTransaction.delete({ where: { id: rec.kasTransactionOutId } }).catch(() => {})
    }
    await prisma.receivable.delete({ where: { id: rec.id } }).catch(() => {})
  }

  // Items cascade-delete via schema
  await prisma.invoice.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
