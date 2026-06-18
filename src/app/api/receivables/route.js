import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageReceivables(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

function canViewReceivables(user) {
  return canManageReceivables(user) || user.role === 'DIRECTOR'
}

// Status project yang dianggap aktif / layak ditagih
const BILLABLE_STATUSES = ['PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING', 'DONE']

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // UNPAID | PAID | all

  // Ambil receivables yang sudah ada (manual + confirmed draft)
  const where = {}
  if (status && status !== 'all') where.status = status

  const existing = await prisma.receivable.findMany({
    where,
    include: {
      project: { select: { id: true, code: true, name: true, client: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Cari project yang punya projectValue tapi belum ada receivable
  const linkedProjectIds = new Set(existing.filter(r => r.projectId).map(r => r.projectId))

  const autoProjects = await prisma.project.findMany({
    where: {
      projectValue: { gt: 0 },
      status: { in: BILLABLE_STATUSES },
      id: { notIn: [...linkedProjectIds] },
    },
    select: {
      id: true, code: true, name: true,
      projectValue: true,
      client: { select: { name: true } },
    },
  })

  // Jadikan sebagai draft receivable virtual (belum tersimpan di DB)
  // Finance bisa klik "Buat Invoice" untuk confirm → save ke DB
  const drafts = autoProjects.map(p => ({
    id:                `__draft_${p.id}`,
    projectId:         p.id,
    isDraft:           true,
    isVirtual:         true,              // hanya tampil di UI, belum di DB
    clientName:        p.client?.name || '',
    financeProjectName: null,
    invoiceNumber:     null,
    poNumber:          null,
    taxInvoiceNumber:  null,
    amount:            p.projectValue,
    issueDate:         null,
    dueDate:           null,
    status:            'UNPAID',
    paidAt:            null,
    paidAmount:        null,
    pphAmount:         0,
    notes:             null,
    project: { id: p.id, code: p.code, name: p.name, client: p.client },
    createdAt:         null,
  }))

  const all = [...drafts, ...existing]
  const totalUnpaid = existing.filter(r => r.status === 'UNPAID').reduce((s, r) => s + r.amount, 0)
  const totalPaid   = existing.filter(r => r.status === 'PAID').reduce((s, r) => s + (r.paidAmount ?? r.amount), 0)

  return NextResponse.json({ receivables: all, totalUnpaid, totalPaid })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageReceivables(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const amount = parseFloat(body.amount)

  if (!body.clientName || !body.clientName.trim()) {
    return NextResponse.json({ error: 'Nama klien wajib diisi' }, { status: 400 })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal invoice tidak valid' }, { status: 400 })
  }

  const receivable = await prisma.receivable.create({
    data: {
      projectId:         body.projectId || null,
      invoiceNumber:     body.invoiceNumber || null,
      poNumber:          body.poNumber || null,
      taxInvoiceNumber:  body.taxInvoiceNumber || null,
      clientName:        body.clientName.trim(),
      financeProjectName: body.financeProjectName || null,
      amount,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      dueDate:   body.dueDate   ? new Date(body.dueDate)   : null,
      notes:     body.notes     || null,
      isDraft:   false,
    },
    include: { project: { select: { id: true, code: true, name: true, client: { select: { name: true } } } } },
  })

  await logAudit({
    userId: session.user.id, action: 'RECEIVABLE_CREATE', entity: 'Receivable', entityId: receivable.id,
    summary: `${session.user.name} menambahkan piutang dari ${receivable.clientName} sebesar Rp ${Math.round(amount).toLocaleString('id-ID')}`,
  })

  return NextResponse.json(receivable, { status: 201 })
}
