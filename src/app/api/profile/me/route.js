import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      divisi: true,
      jobTitle: true,
      npk: true,
      phone: true,
      personalEmail: true,
      birthDate: true,
      birthPlace: true,
      gender: true,
      joinDate: true,
      maritalStatus: true,
      education: true,
      educationMajor: true,
      addressKtp: true,
      addressDomicili: true,
      bankName: true,
      bankAccount: true,
      emergencyContact: true,
      emergencyContactRel: true,
      ktpNumber: true,
      npwpNumber: true,
      hobby: true,
      motherName: true,
      fatherName: true,
      siblingCount: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}
