import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'PROJECT_MANAGER', 'DIRECTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return NextResponse.json({ error: 'Nama client tidak boleh kosong' }, { status: 400 })
    data.name = body.name.trim()
  }

  const client = await prisma.client.update({ where: { id: params.id }, data })
  return NextResponse.json(client)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'PROJECT_MANAGER', 'DIRECTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.client.findUnique({ where: { id: params.id }, include: { _count: { select: { projects: true } } } })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (existing._count.projects > 0) {
    return NextResponse.json({ error: 'Klien ini masih memiliki project terkait, tidak bisa dihapus.' }, { status: 400 })
  }

  await prisma.client.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
