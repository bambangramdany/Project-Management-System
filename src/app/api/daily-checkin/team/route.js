import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET: ringkasan check-in seluruh tim untuk periode tertentu
// Digunakan di halaman penilaian (scores) untuk menampilkan skor disiplin
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['OWNER', 'DIRECTOR', 'FINANCE']
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || new Date().toISOString().slice(0, 7)

  const [y, m] = period.split('-').map(Number)
  const startDate = `${period}-01`
  const nextM = m + 1 > 12 ? 1 : m + 1
  const nextY = m + 1 > 12 ? y + 1 : y
  const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  // Hitung hari kerja dalam periode
  const workDays = []
  const d = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  const today = new Date().toISOString().slice(0, 10)
  while (d < end) {
    const dateStr = d.toISOString().slice(0, 10)
    const dow = d.getUTCDay()
    if (dow >= 1 && dow <= 5 && dateStr <= today) workDays.push(dateStr)
    d.setUTCDate(d.getUTCDate() + 1)
  }

  const records = await prisma.dailyCheckIn.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    include: { user: { select: { id: true, name: true, divisi: true, role: true } } },
  })

  // Group by user
  const byUser = {}
  for (const r of records) {
    if (!byUser[r.userId]) byUser[r.userId] = { user: r.user, records: [] }
    byUser[r.userId].records.push(r)
  }

  const totalDays = workDays.length || 1

  const summary = Object.values(byUser).map(({ user, records }) => {
    function hourWIB(dt) {
      if (!dt) return null
      const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
      return wib.getUTCHours() + wib.getUTCMinutes() / 60
    }

    const morningOnTime = records.filter(r => { const h = hourWIB(r.morningAckAt); return h !== null && h <= 9.5 }).length
    const morningLate   = records.filter(r => { const h = hourWIB(r.morningAckAt); return h !== null && h > 9.5 }).length
    const morningMissed = workDays.filter(wd => !records.find(r => r.date === wd && r.morningAckAt)).length

    const eveningOnTime = records.filter(r => { const h = hourWIB(r.eveningAt); return h !== null && h >= 17 && h <= 20 }).length
    const eveningLate   = records.filter(r => { const h = hourWIB(r.eveningAt); return h !== null && h > 20 }).length
    const eveningMissed = workDays.filter(wd => !records.find(r => r.date === wd && r.eveningAt)).length

    const morningScore = Math.round((morningOnTime * 100 + morningLate * 50) / totalDays)
    const eveningScore = Math.round((eveningOnTime * 100 + eveningLate * 50) / totalDays)

    return {
      userId: user.id,
      userName: user.name,
      divisi: user.divisi,
      role: user.role,
      period,
      workDays: totalDays,
      morning: { onTime: morningOnTime, late: morningLate, missed: morningMissed, score: morningScore },
      evening: { onTime: eveningOnTime, late: eveningLate, missed: eveningMissed, score: eveningScore },
    }
  })

  return NextResponse.json({ period, workDays: totalDays, summary })
}
