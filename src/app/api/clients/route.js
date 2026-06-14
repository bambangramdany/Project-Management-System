import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { projects: true } },
      contacts: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(clients)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama klien tidak boleh kosong' }, { status: 400 })

  try {
    const client = await prisma.client.create({
      data: { name: body.name.trim(), industry: body.industry || null, contact: body.contact || null, notes: body.notes || null },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Klien dengan nama ini sudah ada' }, { status: 400 })
    throw e
  }
}
