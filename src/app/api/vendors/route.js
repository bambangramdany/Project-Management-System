import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const vendorType = searchParams.get('vendorType')
  const subCategory = searchParams.get('subCategory')
  const city = searchParams.get('city')

  const where = { AND: [] }
  if (vendorType) where.AND.push({ vendorType })
  if (subCategory) where.AND.push({ subCategory })
  if (city) where.AND.push({ city: { equals: city, mode: 'insensitive' } })
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

  const [vendors, ratingAgg] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: { enteredBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.vendorRating.groupBy({
      by: ['vendorId'],
      _avg: { rating: true },
      _count: { id: true },
    }),
  ])

  const ratingMap = {}
  for (const r of ratingAgg) {
    ratingMap[r.vendorId] = { avgRating: r._avg.rating, ratingCount: r._count.id }
  }
  const enriched = vendors.map(v => ({
    ...v,
    avgRating:   ratingMap[v.id]?.avgRating   ?? null,
    ratingCount: ratingMap[v.id]?.ratingCount  ?? 0,
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
    enteredById: session.user.id,
    enteredByName: session.user.name,
  }

  const vendor = await prisma.vendor.create({ data, include: { enteredBy: { select: { id: true, name: true } } } })

  await logAudit({
    userId: session.user.id, action: 'VENDOR_CREATE', entity: 'Vendor', entityId: vendor.id,
    summary: `${session.user.name} menambahkan vendor ${vendor.name}`,
  })

  return NextResponse.json(vendor, { status: 201 })
}
