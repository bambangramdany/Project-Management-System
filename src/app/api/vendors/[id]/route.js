import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

const ALLOWED = [
  'name', 'vendorType', 'subCategory', 'province', 'city', 'address', 'area', 'capacity',
  'ballroomCapacity', 'meetingCapacity', 'website', 'instagram', 'output',
  'productService', 'status', 'picContact', 'phone', 'priceNote', 'notes',
]

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.vendor.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key] || null
  }
  if ('priceMin' in body) data.priceMin = body.priceMin !== '' && body.priceMin != null ? parseFloat(body.priceMin) : null
  if ('priceMax' in body) data.priceMax = body.priceMax !== '' && body.priceMax != null ? parseFloat(body.priceMax) : null
  if (data.name) data.name = data.name.trim()

  const vendor = await prisma.vendor.update({
    where: { id: params.id },
    data,
    include: { enteredBy: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId: session.user.id, action: 'VENDOR_UPDATE', entity: 'Vendor', entityId: vendor.id,
    summary: `${session.user.name} memperbarui data vendor ${vendor.name}`,
  })

  return NextResponse.json(vendor)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.vendor.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.vendor.delete({ where: { id: params.id } })

  await logAudit({
    userId: session.user.id, action: 'VENDOR_DELETE', entity: 'Vendor', entityId: params.id,
    summary: `${session.user.name} menghapus vendor ${existing.name}`,
  })

  return NextResponse.json({ ok: true })
}
