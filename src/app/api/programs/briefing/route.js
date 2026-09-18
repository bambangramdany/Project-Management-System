import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function todayWIB() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    .toISOString().slice(0, 10)
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || todayWIB()
  const all = searchParams.get('all') === '1'

  if (all && ['OWNER', 'DIRECTOR'].includes(session.user.role)) {
    const logs = await prisma.briefingLog.findMany({
      where: { date },
      include: { user: { select: { id: true, name: true, role: true, divisi: true } } },
      orderBy: { loggedAt: 'asc' },
    })
    // Get total active users for attendance rate
    const totalUsers = await prisma.user.count({ where: { employeeStatus: 'ACTIVE' } })
    return NextResponse.json({ logs, date, totalUsers })
  }

  const log = await prisma.briefingLog.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  })
  return NextResponse.json({ log, date })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, status, note } = body
  const useDate = date || todayWIB()

  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })

  const log = await prisma.briefingLog.upsert({
    where: { userId_date: { userId: session.user.id, date: useDate } },
    create: { userId: session.user.id, date: useDate, status, note: note?.trim() || null },
    update: { status, note: note?.trim() || null },
  })

  return NextResponse.json(log)
}
