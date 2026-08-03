import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MEMBER_SELECT = {
  id: true, name: true, email: true, role: true, jobTitle: true, divisi: true,
  employeeStatus: true, phone: true, teamOrder: true, createdAt: true,
  birthDate: true, birthPlace: true, gender: true, joinDate: true,
  npk: true, personalEmail: true, maritalStatus: true, education: true,
  educationMajor: true, emergencyContact: true, emergencyContactRel: true,
  bankName: true, bankAccount: true, addressKtp: true, addressDomicili: true,
  hobby: true, motherName: true, fatherName: true, ktpNumber: true, npwpNumber: true,
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.canHrdEvaluate && session.user.role !== 'OWNER') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    if (!body.name?.trim()) return Response.json({ error: 'Nama wajib diisi' }, { status: 400 })
    if (!body.email?.trim()) return Response.json({ error: 'Email wajib diisi' }, { status: 400 })

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } })
    if (existing) return Response.json({ error: 'Email sudah digunakan' }, { status: 409 })

    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(body.password || 'watermark2026', 10)

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        hashedPassword,
        role: body.role || 'MEMBER',
        jobTitle: body.jobTitle || null,
        divisi: body.divisi || null,
        employeeStatus: 'ACTIVE',
        phone: body.phone || null,
        npk: body.npk || null,
        gender: body.gender || null,
        birthPlace: body.birthPlace || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        joinDate: body.joinDate ? new Date(body.joinDate) : null,
        maritalStatus: body.maritalStatus || null,
        education: body.education || null,
        educationMajor: body.educationMajor || null,
        personalEmail: body.personalEmail || null,
        emergencyContact: body.emergencyContact || null,
        emergencyContactRel: body.emergencyContactRel || null,
        bankName: body.bankName || null,
        bankAccount: body.bankAccount || null,
        ktpNumber: body.ktpNumber || null,
        npwpNumber: body.npwpNumber || null,
        addressKtp: body.addressKtp || null,
        addressDomicili: body.addressDomicili || null,
        hobby: body.hobby || null,
        motherName: body.motherName || null,
        fatherName: body.fatherName || null,
      },
      select: MEMBER_SELECT,
    })
    return Response.json(user)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.canHrdEvaluate && session.user.role !== 'OWNER') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const users = await prisma.user.findMany({
      where: { role: { not: 'OWNER' } },
      select: MEMBER_SELECT,
      orderBy: [{ teamOrder: 'asc' }, { name: 'asc' }],
    })
    return Response.json(users)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
