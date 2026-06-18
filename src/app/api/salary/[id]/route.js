import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'DIRECTOR']

function calcTHP(r) {
  const income = (r.gajiPokok || 0) + (r.tunjanganJabatan || 0) + (r.tunjanganKinerja || 0)
    + (r.tunjanganTransport || 0) + (r.tunjanganProject || 0) + (r.bonusProject || 0) + (r.thrBonus || 0)
  const deduct = (r.bpjsTk || 0) + (r.bpjsKes || 0) + (r.bpjsKesKeluarga || 0)
    + (r.pph21 || 0) + (r.kasbon || 0) + (r.absen || 0)
  return income - deduct
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const record = await prisma.salaryRecord.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json({ ...record, thp: calcTHP(record) })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.salaryRecord.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
