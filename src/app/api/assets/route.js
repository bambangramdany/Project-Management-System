import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

function canManageAssets(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || user.role === 'FINANCE_STAFF' || isFinanceDirector(user)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageAssets(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  const where = category && category !== 'ALL' ? { category } : {}
  const assets = await prisma.asset.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0)
  const totalCost = assets.reduce((sum, a) => sum + a.acquisitionCost, 0)
  const totalDepreciation = totalValue - totalCost

  return NextResponse.json({ assets, totalValue, totalCost, totalDepreciation, count: assets.length })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageAssets(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const acquisitionCost = parseFloat(body.acquisitionCost)
  const currentValue = parseFloat(body.currentValue ?? body.acquisitionCost)
  if (!body.name || !body.name.trim()) return NextResponse.json({ error: 'Nama aset wajib diisi' }, { status: 400 })
  if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0) return NextResponse.json({ error: 'Harga perolehan tidak valid' }, { status: 400 })
  if (!Number.isFinite(currentValue) || currentValue < 0) return NextResponse.json({ error: 'Nilai saat ini tidak valid' }, { status: 400 })

  const asset = await prisma.asset.create({
    data: {
      name: body.name.trim(),
      category: body.category || 'OTHER',
      condition: body.condition || 'BAIK',
      acquisitionCost,
      currentValue,
      acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : new Date(),
      notes: body.notes?.trim() || null,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  await logAudit({
    userId: session.user.id,
    action: 'ASSET_CREATE',
    entity: 'Asset',
    entityId: asset.id,
    summary: `${session.user.name} menambahkan aset ${asset.name} (Rp ${Math.round(acquisitionCost).toLocaleString('id-ID')})`,
  })

  return NextResponse.json(asset, { status: 201 })
}
