import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageUsers } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.user.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const body = await req.json()
  const data = {}
  const allowed = ['name', 'role', 'divisi', 'jobTitle', 'phone', 'employeeStatus']
  for (const key of allowed) {
    if (key in body) data[key] = body[key] || null
  }
  if (data.name) data.name = data.name.trim()
  if ('teamOrder' in body) data.teamOrder = Number(body.teamOrder) || 0

  if (body.password) {
    if (body.password.length < 6) return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })
    data.hashedPassword = await bcrypt.hash(body.password, 10)
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      jobTitle: true, divisi: true, phone: true, employeeStatus: true, createdAt: true, teamOrder: true,
    },
  })

  await logAudit({
    userId: session.user.id,
    action: 'USER_UPDATE',
    entity: 'User',
    entityId: user.id,
    summary: `${session.user.name} memperbarui akun ${user.name}`,
  })

  return NextResponse.json(user)
}
