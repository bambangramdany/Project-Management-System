import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER']

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const date = await prisma.projectDate.update({
    where: { id: params.dateId },
    data: {
      label: body.label ?? undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
      location: body.location ?? undefined,
      notes: body.notes ?? undefined,
    },
  })
  return NextResponse.json(date)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.projectDate.delete({ where: { id: params.dateId } })
  return NextResponse.json({ ok: true })
}
