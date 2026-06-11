import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageUsers } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      jobTitle: true, divisi: true, phone: true, employeeStatus: true, createdAt: true, teamOrder: true,
    },
    orderBy: [{ employeeStatus: 'asc' }, { divisi: 'asc' }, { teamOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(users)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role, divisi, jobTitle, phone } = body

  if (!name?.trim() || !email?.trim() || !password || !role) {
    return NextResponse.json({ error: 'Nama, email, password, dan role wajib diisi' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (existing) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      hashedPassword,
      role,
      divisi: divisi || null,
      jobTitle: jobTitle?.trim() || null,
      phone: phone?.trim() || null,
    },
    select: {
      id: true, name: true, email: true, role: true,
      jobTitle: true, divisi: true, phone: true, employeeStatus: true, createdAt: true,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'USER_CREATE',
    entity: 'User',
    entityId: user.id,
    summary: `${session.user.name} membuat akun baru untuk ${user.name} (${user.role})`,
  })

  return NextResponse.json(user)
}
