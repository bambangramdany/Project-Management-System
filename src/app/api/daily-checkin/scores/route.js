import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Konversi skor 0-100 ke skala 1-5 (konsisten dengan KPI)
function toKpiScale(pct) {
  if (pct >= 90) return 5   // Istimewa
  if (pct >= 75) return 4   // Sangat Baik
  if (pct >= 55) return 3   // Baik
  if (pct >= 35) return 2   // Cukup
  return 1                  // Kurang
}

// GET: skor check-in satu user untuk satu periode
// ?userId=xxx&period=2026-06
// Juga mendukung ?period=2026-06 saja (userId = session user)
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId  = searchParams.get('userId') || session.user.id
  const period  = searchParams.get('period') || new Date().toISOString().slice(0, 7)

  // Hanya diri sendiri atau superior yang boleh lihat
  const isSelf  = userId === session.user.id
  const isAdmin = ['OWNER', 'DIRECTOR', 'FINANCE'].includes(session.user.role)
  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [y, m] = period.split('-').map(Number)
  const startDate = `${period}-01`
  const nextM = m + 1 > 12 ? 1 : m + 1
  const nextY = m + 1 > 12 ? y + 1 : y
  const endDate   = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  const today = new Date().toISOString().slice(0, 10)

  // Hitung hari kerja yang sudah lewat (Mon–Fri) dalam periode
  const workDays = []
  const d = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  while (d < end) {
    const dateStr = d.toISOString().slice(0, 10)
    const dow = d.getUTCDay()
    if (dow >= 1 && dow <= 5 && dateStr <= today) workDays.push(dateStr)
    d.setUTCDate(d.getUTCDate() + 1)
  }

  const totalDays = workDays.length || 1

  const records = await prisma.dailyCheckIn.findMany({
    where: { userId, date: { gte: startDate, lt: endDate } },
  })

  function hourWIB(dt) {
    if (!dt) return null
    const wib = new Date(new Date(dt).getTime() + 7 * 60 * 60 * 1000)
    return wib.getUTCHours() + wib.getUTCMinutes() / 60
  }

  const morningOnTime = records.filter(r => { const h = hourWIB(r.morningAckAt); return h !== null && h <= 9.5 }).length
  const morningLate   = records.filter(r => { const h = hourWIB(r.morningAckAt); return h !== null && h > 9.5 }).length
  const morningMissed = workDays.filter(wd => !records.find(r => r.date === wd && r.morningAckAt)).length

  const eveningOnTime = records.filter(r => { const h = hourWIB(r.eveningAt); return h !== null && h >= 17 && h <= 20 }).length
  const eveningLate   = records.filter(r => { const h = hourWIB(r.eveningAt); return h !== null && h > 20 }).length
  const eveningMissed = workDays.filter(wd => !records.find(r => r.date === wd && r.eveningAt)).length

  const morningPct = Math.round((morningOnTime * 100 + morningLate * 50) / totalDays)
  const eveningPct = Math.round((eveningOnTime * 100 + eveningLate * 50) / totalDays)

  return NextResponse.json({
    userId, period, workDays: totalDays,
    morning: {
      onTime: morningOnTime, late: morningLate, missed: morningMissed,
      pct: morningPct,
      kpiScore: toKpiScale(morningPct),   // 1–5
    },
    evening: {
      onTime: eveningOnTime, late: eveningLate, missed: eveningMissed,
      pct: eveningPct,
      kpiScore: toKpiScale(eveningPct),   // 1–5
    },
    // Data harian untuk grafik mini
    daily: workDays.map(wd => {
      const rec = records.find(r => r.date === wd)
      return {
        date: wd,
        morningDone: !!rec?.morningAckAt,
        morningOnTime: rec?.morningAckAt ? hourWIB(rec.morningAckAt) <= 9.5 : false,
        eveningDone: !!rec?.eveningAt,
        eveningOnTime: rec?.eveningAt ? (hourWIB(rec.eveningAt) >= 17 && hourWIB(rec.eveningAt) <= 20) : false,
        eveningNote: rec?.eveningNote || null,
      }
    }),
  })
}
