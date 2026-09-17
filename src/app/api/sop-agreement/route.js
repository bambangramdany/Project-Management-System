import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const SOP_CURRENT_VERSION = '1.0'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { sopAgreedVersion: true, sopAgreedAt: true },
  })

  return NextResponse.json({
    agreed: user?.sopAgreedVersion === SOP_CURRENT_VERSION,
    agreedAt: user?.sopAgreedAt,
    currentVersion: SOP_CURRENT_VERSION,
  })
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agreedAt = new Date()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      sopAgreedVersion: SOP_CURRENT_VERSION,
      sopAgreedAt: agreedAt,
    },
    select: { name: true, email: true, sopAgreedVersion: true, sopAgreedAt: true },
  })

  return NextResponse.json({
    agreed: true,
    name: user.name,
    email: user.email,
    version: user.sopAgreedVersion,
    agreedAt: user.sopAgreedAt,
    message: `Persetujuan SOP v${SOP_CURRENT_VERSION} tercatat atas nama ${user.name} (${user.email}) pada ${agreedAt.toISOString()}`,
  })
}
