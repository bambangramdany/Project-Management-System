import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const SECURE = (process.env.NEXTAUTH_URL || '').startsWith('https')
const COOKIE_NAME = SECURE ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.user.impersonating || !session.user.actualUserId) {
    return NextResponse.json({ error: 'Tidak dalam mode pengawasan' }, { status: 400 })
  }

  const owner = await prisma.user.findUnique({ where: { id: session.user.actualUserId } })
  if (!owner) return NextResponse.json({ error: 'Akun owner tidak ditemukan' }, { status: 404 })

  const token = {
    id: owner.id,
    sub: owner.id,
    name: owner.name,
    email: owner.email,
    role: owner.role,
    divisi: owner.divisi,
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
