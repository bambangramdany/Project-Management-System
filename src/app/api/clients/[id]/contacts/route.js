import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama kontak wajib diisi' }, { status: 400 })

  const contact = await prisma.clientContact.create({
    data: {
      clientId:  params.id,
      name:      body.name.trim(),
      jobTitle:  body.jobTitle  || null,
      email:     body.email     || null,
      phone:     body.phone     || null,
      address:   body.address   || null,
      religion:  body.religion  || null,
      notes:     body.notes     || null,
    },
  })
  return NextResponse.json(contact, { status: 201 })
}
