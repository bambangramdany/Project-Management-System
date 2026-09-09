import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = {}
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return NextResponse.json({ error: 'Nama tidak boleh kosong' }, { status: 400 })
    data.name = body.name.trim()
  }
  if ('jobTitle'  in body) data.jobTitle  = body.jobTitle  || null
  if ('email'     in body) data.email     = body.email     || null
  if ('phone'     in body) data.phone     = body.phone     || null
  if ('address'   in body) data.address   = body.address   || null
  if ('religion'  in body) data.religion  = body.religion  || null
  if ('notes'     in body) data.notes     = body.notes     || null

  const contact = await prisma.clientContact.update({ where: { id: params.id }, data })
  return NextResponse.json(contact)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.clientContact.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
