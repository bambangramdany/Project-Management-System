import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Self-service password change for the logged-in user.
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // If currently impersonating another account, don't allow changing their password.
  if (session.user.impersonating) {
    return NextResponse.json({ error: 'Tidak bisa mengubah password saat dalam mode pengawasan (login sebagai user lain).' }, { status: 403 })
  }

  const body = await req.json()
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, user.hashedPassword)
  if (!valid) return NextResponse.json({ error: 'Password lama salah' }, { status: 400 })

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: user.id }, data: { hashedPassword } })

  return NextResponse.json({ ok: true })
}
