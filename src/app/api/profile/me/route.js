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

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.impersonating) {
    return NextResponse.json({ error: 'Tidak bisa mengubah profil saat dalam mode pengawasan.' }, { status: 403 })
  }

  const body = await req.json()

  // Fields yang boleh diubah sendiri oleh user
  const EDITABLE = [
    'phone', 'personalEmail',
    'emergencyContact', 'emergencyContactRel',
    'addressKtp', 'addressDomicili',
    'bankName', 'bankAccount', 'npwpNumber',
    'hobby',
    // Data pribadi yang user tahu sendiri
    'birthPlace', 'birthDate', 'gender', 'maritalStatus',
    'education', 'educationMajor',
    'ktpNumber', 'motherName', 'fatherName', 'siblingCount',
  ]

  const data = {}
  for (const key of EDITABLE) {
    if (!(key in body)) continue
    if (key === 'birthDate') {
      data[key] = body[key] ? new Date(body[key]) : null
    } else if (key === 'siblingCount') {
      data[key] = body[key] === '' || body[key] === null || body[key] === undefined ? null : (parseInt(body[key]) || 0)
    } else {
      data[key] = body[key] === '' ? null : body[key]
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Tidak ada data yang diubah' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true, name: true, email: true, role: true, divisi: true, jobTitle: true, npk: true,
      phone: true, personalEmail: true, birthDate: true, birthPlace: true, gender: true,
      joinDate: true, maritalStatus: true, education: true, educationMajor: true,
      addressKtp: true, addressDomicili: true, bankName: true, bankAccount: true,
      emergencyContact: true, emergencyContactRel: true, ktpNumber: true, npwpNumber: true,
      hobby: true, motherName: true, fatherName: true, siblingCount: true,
    },
  })

  return NextResponse.json(user)
}
