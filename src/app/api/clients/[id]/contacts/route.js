import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED = ['name', 'jobTitle', 'email', 'phone', 'address', 'religion', 'notes']

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['OWNER', 'PROJECT_MANAGER', 'DIRECTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama PIC tidak boleh kosong' }, { status: 400 })

  const data = { clientId: params.id }
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key]?.trim() || null
  }

  const contact = await prisma.clientContact.create({ data })
  return NextResponse.json(contact, { status: 201 })
}
