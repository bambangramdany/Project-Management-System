import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// WIB = UTC+7
function todayWIB() {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

function hourWIB() {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.getUTCHours() + wib.getUTCMinutes() / 60 // decimal hour
}

// GET: status check-in hari ini + ringkasan periode
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || session.user.id
  const period = searchParams.get('period') // YYYY-MM untuk ringkasan KPI
  const date = todayWIB()

  // Check-in hari ini
  const today = await prisma.dailyCheckIn.findUnique({
    where: { userId_date: { userId, date } },
  })

  // Ringkasan periode (untuk kalkulasi KPI)
  let periodSummary = null
  if (period) {
    const [y, m] = period.split('-').map(Number)
    const startDate = `${period}-01`
    const endDate = `${y}-${String(m + 1 > 12 ? 1 : m + 1).padStart(2, '0')}-01`
    const records = await prisma.dailyCheckIn.findMany({
      where: { userId, date: { gte: startDate, lt: endDate } },
    })

    // Hitung hari kerja dalam periode (Senin-Jumat)
    const workDays = []
    const d = new Date(startDate + 'T00:00:00Z')
    const end = new Date(endDate + 'T00:00:00Z')
    while (d < end) {
      const dow = d.getUTCDay()
      if (dow >= 1 && dow <= 5) workDays.push(d.toISOString().slice(0, 10))
      d.setUTCDate(d.getUTCDate() + 1)
    }

    const morningOnTime = records.filter(r => {
      if (!r.morningAckAt) return false
      const wib = new Date(r.morningAckAt.getTime() + 7 * 60 * 60 * 1000)
      const h = wib.getUTCHours() + wib.getUTCMinutes() / 60
      return h <= 9.5 // <= 09:30
    }).length
    const morningLate = records.filter(r => {
      if (!r.morningAckAt) return false
      const wib = new Date(r.morningAckAt.getTime() + 7 * 60 * 60 * 1000)
      const h = wib.getUTCHours() + wib.getUTCMinutes() / 60
      return h > 9.5
    }).length
    const morningMissed = workDays.filter(wd => {
      const past = wd < date
      return past && !records.find(r => r.date === wd && r.morningAckAt)
    }).length

    const eveningOnTime = records.filter(r => {
      if (!r.eveningAt) return false
      const wib = new Date(r.eveningAt.getTime() + 7 * 60 * 60 * 1000)
      const h = wib.getUTCHours() + wib.getUTCMinutes() / 60
      return h >= 17 && h <= 20
    }).length
    const eveningLate = records.filter(r => {
      if (!r.eveningAt) return false
      const wib = new Date(r.eveningAt.getTime() + 7 * 60 * 60 * 1000)
      const h = wib.getUTCHours() + wib.getUTCMinutes() / 60
      return h > 20 && h < 24
    }).length
    const eveningMissed = workDays.filter(wd => {
      const past = wd < date
      return past && !records.find(r => r.date === wd && r.eveningAt)
    }).length

    const totalWorkDays = workDays.filter(wd => wd <= date).length || 1
    periodSummary = {
      period, workDays: totalWorkDays,
      morning: { onTime: morningOnTime, late: morningLate, missed: morningMissed },
      evening: { onTime: eveningOnTime, late: eveningLate, missed: eveningMissed },
      // Skor 0-100: onTime=100%, late=50%, missed=0%
      morningScore: Math.round((morningOnTime * 100 + morningLate * 50) / totalWorkDays),
      eveningScore: Math.round((eveningOnTime * 100 + eveningLate * 50) / totalWorkDays),
    }
  }

  const currentHour = hourWIB()
  return NextResponse.json({
    date,
    today,
    currentHour,
    showEveningForm: currentHour >= 17 && currentHour < 24,
    eveningOverdue: currentHour >= 20 && !today?.eveningAt,
    periodSummary,
  })
}

// POST: morning acknowledgment
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = todayWIB()
  const now = new Date()
  const userId = session.user.id

  // Jangan timpa jika sudah check-in pagi
  const existing = await prisma.dailyCheckIn.findUnique({
    where: { userId_date: { userId, date } },
  })
  if (existing?.morningAckAt) return NextResponse.json(existing)

  const record = await prisma.dailyCheckIn.upsert({
    where: { userId_date: { userId, date } },
    update: { morningAckAt: now },
    create: { userId, date, morningAckAt: now },
  })

  return NextResponse.json(record)
}

// PATCH: evening progress report
export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eveningNote } = await req.json()
  if (!eveningNote?.trim()) return NextResponse.json({ error: 'Progress tidak boleh kosong' }, { status: 400 })

  const date = todayWIB()
  const now = new Date()

  const record = await prisma.dailyCheckIn.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { eveningNote: eveningNote.trim(), eveningAt: now },
    create: { userId: session.user.id, date, eveningNote: eveningNote.trim(), eveningAt: now },
  })

  return NextResponse.json(record)
}
