import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageAssets(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageAssets(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}
  const allowed = ['name', 'category', 'condition', 'acquisitionCost', 'currentValue', 'acquisitionDate', 'notes']
  for (const key of allowed) {
    if (key in body) {
      if (key === 'acquisitionDate') data[key] = body[key] ? new Date(body[key]) : existing.acquisitionDate
      else if (['acquisitionCost', 'currentValue'].includes(key)) data[key] = parseFloat(body[key])
      else data[key] = body[key]
    }
  }

  const asset = await prisma.asset.update({
    where: { id: params.id },
    data,
    include: { createdBy: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId: session.user.id,
    action: 'ASSET_UPDATE',
    entity: 'Asset',
    entityId: asset.id,
    summary: `${session.user.name} memperbarui aset ${asset.name}`,
  })

  return NextResponse.json(asset)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageAssets(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const asset = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!asset) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.asset.delete({ where: { id: params.id } })
  await logAudit({
    userId: session.user.id,
    action: 'ASSET_DELETE',
    entity: 'Asset',
    entityId: asset.id,
    summary: `${session.user.name} menghapus aset ${asset.name}`,
  })

  return NextResponse.json({ ok: true })
}
