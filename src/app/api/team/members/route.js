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
