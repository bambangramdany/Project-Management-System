import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: {
      id: true, name: true, email: true, role: true,
      jobTitle: true, divisi: true, phone: true, teamOrder: true,
    },
    orderBy: [{ divisi: 'asc' }, { teamOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(members)
}
