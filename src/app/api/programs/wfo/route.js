import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Divisi yang wajib WFO Selasa (Finance/HR/GA dikecualikan)
const WFO_DIVISIONS = ['EVENT', 'PH', 'CREATIVE']

function getTuesdayDate(dateStr) {
  // Given a date string, return the nearest Tuesday (same week, Monday-based)
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay() // 0=Sun, 2=Tue
  const diff = 2 - day // offset to Tuesday
  const tue = new Date(d)
  tue.setDate(d.getDate() + diff)
  return tue.toISOString().slice(0, 10)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekDate = searchParams.get('weekDate') || getTuesdayDate()
  const all = searchParams.get('all') === '1'

  const isAdmin = session.user.role === 'OWNER' ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA') ||
    session.user.role === 'DIRECTOR'

  if (all && isAdmin) {
    // Directors see their division; Owner/HRGA see all
    const whereDiv = (session.user.role === 'OWNER' || session.user.divisi === 'FINANCE_HRGA')
      ? { divisi: { in: WFO_DIVISIONS } }
      : { divisi: session.user.divisi }

    const users = await prisma.user.findMany({
      where: { ...whereDiv, employeeStatus: 'ACTIVE' },
      select: { id: true, name: true, role: true, divisi: true,
        wfoLogs: { where: { weekDate }, select: { status: true, reason: true, altTime: true, submittedAt: true } }
      },
      orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json({ users, weekDate })
  }

  // Personal log
  const log = await prisma.wfoLog.findUnique({
    where: { userId_weekDate: { userId: session.user.id, weekDate } },
  })
  return NextResponse.json({ log, weekDate, isRequired: WFO_DIVISIONS.includes(session.user.divisi) })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { weekDate, status, reason, altTime } = body

  if (!weekDate || !status) return NextResponse.json({ error: 'weekDate and status required' }, { status: 400 })
  if (status === 'TIDAK_HADIR' && !reason?.trim()) {
    return NextResponse.json({ error: 'Alasan wajib diisi jika tidak hadir' }, { status: 400 })
  }

  const log = await prisma.wfoLog.upsert({
    where: { userId_weekDate: { userId: session.user.id, weekDate } },
    create: { userId: session.user.id, weekDate, status, reason: reason?.trim() || null, altTime: altTime?.trim() || null },
    update: { status, reason: reason?.trim() || null, altTime: altTime?.trim() || null, updatedAt: new Date() },
  })

  return NextResponse.json(log)
}
