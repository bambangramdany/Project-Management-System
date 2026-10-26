import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER']

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dates = await prisma.projectDate.findMany({
    where: { projectId: params.id },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(dates)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  if (!body.startDate) return NextResponse.json({ error: 'startDate wajib diisi' }, { status: 400 })

  const date = await prisma.projectDate.create({
    data: {
      projectId: params.id,
      label: body.label || null,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      location: body.location || null,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(date, { status: 201 })
}
