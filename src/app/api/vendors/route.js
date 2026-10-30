import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { resolveKpiPeriod } from '@/lib/constants'
import { NextResponse } from 'next/server'

// Roles yang punya kewajiban input vendor baru dan dihitung ke KPI
const VENDOR_KPI_ROLES = ['PROJECT_OFFICER', 'PRODUCTION']

// Hitung score vendor_database dari jumlah vendor: 1→2, 2→3, 3→4, 4+→5
function vendorCountToScore(count) {
  return Math.min(count + 1, 5)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const vendorType = searchParams.get('vendorType')
  const subCategory = searchParams.get('subCategory')
  const city = searchParams.get('city')
  const tier = searchParams.get('tier')

  const where = { AND: [] }
  if (vendorType) where.AND.push({ vendorType })
  if (subCategory) where.AND.push({ subCategory })
  if (city) where.AND.push({ city: { equals: city, mode: 'insensitive' } })
  if (tier) where.AND.push({ qualityTier: tier })
  if (q) {
    where.AND.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { area: { contains: q, mode: 'insensitive' } },
        { productService: { contains: q, mode: 'insensitive' } },
        { output: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { picContact: { contains: q, mode: 'insensitive' } },
      ],
    })
  }
  if (where.AND.length === 0) delete where.AND

  const vendors = await prisma.vendor.findMany({
    where,
    include: { enteredBy: { select: { id: true, name: true } } },
    orderBy: [{ qualityTier: 'asc' }, { scorecardAvg: 'desc' }, { name: 'asc' }],
    take: 500,
  })

  const enriched = vendors.map(v => ({
    ...v,
    avgRating:   v.scorecardAvg,
    ratingCount: v.totalProjectsUsed,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'Nama vendor wajib diisi' }, { status: 400 })
  }
  if (!body.vendorType) {
    return NextResponse.json({ error: 'Jenis vendor wajib diisi' }, { status: 400 })
  }

  const data = {
    name: body.name.trim(),
    vendorType: body.vendorType,
    subCategory: body.subCategory || null,
    province: body.province || null,
    city: body.city || null,
    address: body.address || null,
    area: body.area || null,
    capacity: body.capacity || null,
    ballroomCapacity: body.ballroomCapacity || null,
    meetingCapacity: body.meetingCapacity || null,
    website: body.website || null,
    instagram: body.instagram || null,
    output: body.output || null,
    productService: body.productService || null,
    status: body.status || 'Active',
    picContact: body.picContact || null,
    phone: body.phone || null,
    priceMin: body.priceMin !== '' && body.priceMin != null ? parseFloat(body.priceMin) : null,
    priceMax: body.priceMax !== '' && body.priceMax != null ? parseFloat(body.priceMax) : null,
    priceNote: body.priceNote || null,
    notes: body.notes || null,
    bankName: body.bankName || null,
    bankAccountNumber: body.bankAccountNumber || null,
    accountHolder: body.accountHolder || null,
    npwp: body.npwp || null,
    email: body.email || null,
    qualityTier: ['A', 'B', 'C'].includes(body.qualityTier) ? body.qualityTier : null,
    enteredById: session.user.id,
    enteredByName: session.user.name,
  }

  const vendor = await prisma.vendor.create({ data, include: { enteredBy: { select: { id: true, name: true } } } })

  await logAudit({
    userId: session.user.id, action: 'VENDOR_CREATE', entity: 'Vendor', entityId: vendor.id,
    summary: `${session.user.name} menambahkan vendor ${vendor.name}`,
  })

  // Auto-update KPI vendor_database untuk PROJECT_OFFICER dan PRODUCTION
  if (VENDOR_KPI_ROLES.includes(session.user.role)) {
    const period = resolveKpiPeriod(new Date())
    const [periodYear, periodMonth] = period.split('-').map(Number)
    const monthStart = new Date(periodYear, periodMonth - 1, 1)
    const monthEnd   = new Date(periodYear, periodMonth, 1)

    const countThisMonth = await prisma.vendor.count({
      where: {
        enteredById: session.user.id,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    })

    // Capped di 4 (target maksimal); score 1-5: 1→2, 2→3, 3→4, 4+→5
    const cappedCount = Math.min(countThisMonth, 4)
    const score = vendorCountToScore(cappedCount)

    await prisma.kpiAssessment.upsert({
      where: {
        userId_evaluatorId_period_kpiKey: {
          userId:      session.user.id,
          evaluatorId: session.user.id,
          period,
          kpiKey:      'vendor_database',
        },
      },
      update: { score },
      create: {
        userId:      session.user.id,
        evaluatorId: session.user.id,
        period,
        kpiKey:      'vendor_database',
        score,
        comment:     `Otomatis: ${cappedCount} vendor baru ditambahkan bulan ini`,
      },
    })
  }

  return NextResponse.json(vendor, { status: 201 })
}
