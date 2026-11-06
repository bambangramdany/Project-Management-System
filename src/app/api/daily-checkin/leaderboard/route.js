import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Semua karyawan aktif bisa melihat leaderboard disiplin tim.
// OWNER dan DIRECTOR dikecualikan dari ranking (manajemen senior).
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const period = searchParams.get('period') || defaultPeriod

  const [y, m] = period.split('-').map(Number)
  const startDate = `${period}-01`
  const nextM = m + 1 > 12 ? 1 : m + 1
  const nextY = m + 1 > 12 ? y + 1 : y
  const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  // Hitung hari kerja hingga hari ini dalam periode
  const today = new Date().toISOString().slice(0, 10)
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
    where: {
      date: { gte: startDate, lt: endDate },
      user: {
        employeeStatus: 'ACTIVE',
        role: { notIn: ['OWNER', 'DIRECTOR'] },
      },
    },
    include: { user: { select: { id: true, name: true, divisi: true, role: true } } },
  })

  // Group by user
  const byUser = {}
  for (const r of records) {
    if (!byUser[r.userId]) byUser[r.userId] = { user: r.user, records: [] }
    byUser[r.userId].records.push(r)
  }

  function hourWIB(dt) {
    if (!dt) return null
    const wib = new Date(dt.getTime() + 7 * 60 * 60 * 1000)
    return wib.getUTCHours() + wib.getUTCMinutes() / 60
  }

  const rows = Object.values(byUser).map(({ user, records: recs }) => {
    const morningOnTime = recs.filter(r => { const h = hourWIB(r.morningAckAt); return h !== null && h <= 9.5 }).length
    const morningLate   = recs.filter(r => { const h = hourWIB(r.morningAckAt); return h !== null && h > 9.5 }).length
    const eveningOnTime = recs.filter(r => { const h = hourWIB(r.eveningAt); return h !== null && h >= 17 && h <= 20 }).length
    const eveningLate   = recs.filter(r => { const h = hourWIB(r.eveningAt); return h !== null && h > 20 }).length

    const morningScore = Math.round((morningOnTime * 100 + morningLate * 50) / totalDays)
    const eveningScore = Math.round((eveningOnTime * 100 + eveningLate * 50) / totalDays)
    const avgScore = Math.round((morningScore + eveningScore) / 2)

    return {
      userId: user.id,
      name: user.name,
      divisi: user.divisi,
      morningScore,
      eveningScore,
      avgScore,
    }
  })

  // Urutkan: avgScore desc, kemudian morningScore desc
  rows.sort((a, b) => b.avgScore - a.avgScore || b.morningScore - a.morningScore)

  return NextResponse.json({ period, workDays: totalDays, rows })
}
