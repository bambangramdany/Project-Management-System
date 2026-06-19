/**
 * GET  /api/projects/:id/expenses  — list direct expenses for a project
 * POST /api/projects/:id/expenses  — add one expense
 * DELETE /api/projects/:id/expenses?expenseId=xxx — delete one expense
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function canView(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER', 'FINANCE', 'FINANCE_STAFF'].includes(user.role)
}
function canEdit(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER', 'FINANCE'].includes(user.role)
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || !canView(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expenses = await prisma.directExpense.findMany({
    where: { projectId: params.id },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json({ expenses })
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || !canEdit(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  // Batch create (import mode)
  if (Array.isArray(body)) {
    const created = await prisma.directExpense.createMany({
      data: body.map(e => ({
        projectId:   params.id,
        description: e.description || 'Pengeluaran',
        category:    e.category || 'OPERATIONAL_OTHER',
        amount:      parseFloat(e.amount) || 0,
        date:        e.date ? new Date(e.date) : null,
        vendor:      e.vendor || null,
        notes:       e.notes || null,
        source:      e.source || 'import',
        createdById: session.user.id,
      })),
    })
    return NextResponse.json({ created: created.count }, { status: 201 })
  }

  // Single create
  if (!body.description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 })
  if (!body.amount || body.amount <= 0) return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 })

  const expense = await prisma.directExpense.create({
    data: {
      projectId:   params.id,
      description: body.description.trim(),
      category:    body.category || 'OPERATIONAL_OTHER',
      amount:      parseFloat(body.amount),
      date:        body.date ? new Date(body.date) : null,
      vendor:      body.vendor?.trim() || null,
      notes:       body.notes?.trim() || null,
      source:      'manual',
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })
  return NextResponse.json(expense, { status: 201 })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || !canEdit(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const expenseId = searchParams.get('expenseId')
  if (!expenseId) return NextResponse.json({ error: 'expenseId required' }, { status: 400 })

  await prisma.directExpense.deleteMany({ where: { id: expenseId, projectId: params.id } })
  return NextResponse.json({ ok: true })
}
