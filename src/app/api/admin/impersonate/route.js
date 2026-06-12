import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SECURE = (process.env.NEXTAUTH_URL || '').startsWith('https')
const COOKIE_NAME = SECURE ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

// Owner-only: switch the current session into another user's account, for
// occasional direct oversight/monitoring. The owner's own id is preserved as
// `actualUserId` so the session can be reverted via /api/admin/impersonate/stop.
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.user.impersonating) return NextResponse.json({ error: 'Sudah dalam mode pengawasan' }, { status: 400 })

  const { userId } = await req.json()
  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const token = {
    id: target.id,
    sub: target.id,
    name: target.name,
    email: target.email,
    role: target.role,
    divisi: target.divisi,
    impersonating: true,
    actualUserId: session.user.id,
  }

  const jwt = await encode({ token, secret: process.env.NEXTAUTH_SECRET })

  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}
