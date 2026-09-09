import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ?simple=1 → hanya id+name, untuk dropdown (jauh lebih cepat)
  const { searchParams } = new URL(req.url)
  const simple = searchParams.get('simple') === '1'

  if (simple) {
    const clients = await prisma.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(clients, {
      headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=600' },
    })
  }

  const [clients, revAgg] = await Promise.all([
    prisma.client.findMany({
      include: {
        _count: { select: { projects: true } },
        contacts: { orderBy: { createdAt: 'asc' } },
        projects: {
          select: {
            id: true, code: true, name: true, status: true,
            projectValue: true, startDate: true, endDate: true,
            category: true, division: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.project.groupBy({
      by: ['clientId'],
      _sum: { projectValue: true },
      _count: { id: true },
      where: { clientId: { not: null }, status: { in: ['PREPARATION','EVENT_DAY','REPORTING','INVOICING','DONE'] } },
    }),
  ])

  const revMap = {}
  for (const r of revAgg) {
    if (r.clientId) revMap[r.clientId] = { totalRevenue: r._sum.projectValue ?? 0, wonProjects: r._count.id }
  }

  const enriched = clients.map(c => ({
    ...c,
    totalRevenue: revMap[c.id]?.totalRevenue ?? 0,
    wonProjects: revMap[c.id]?.wonProjects ?? 0,
    repeatOrder: (revMap[c.id]?.wonProjects ?? 0) > 1,
  }))

  return NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama klien tidak boleh kosong' }, { status: 400 })

  try {
    const client = await prisma.client.create({
      data: {
        name: body.name.trim(),
        industry: body.industry || null,
        contact: body.contact || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        address: body.address || null,
        npwp: body.npwp || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Klien dengan nama ini sudah ada' }, { status: 400 })
    throw e
  }
}
