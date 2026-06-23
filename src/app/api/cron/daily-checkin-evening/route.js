import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { getSuperiorIds } from '@/lib/checkinNotify'
import { NextResponse } from 'next/server'

// Cron: setiap hari 20:00 WIB (13:00 UTC) — Senin s/d Jumat
// Notifikasi superior jika anggota tim belum kirim evening progress report
export async function GET(req) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const nowUTC = new Date()
  const nowWIB = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000)
  const dayOfWeek = nowWIB.getUTCDay()
  const todayDate = nowWIB.toISOString().slice(0, 10)

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ skipped: true, reason: 'weekend' })
  }

  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', NOT: { role: 'OWNER' } },
    select: { id: true, name: true, role: true, divisi: true },
  })

  // Cari siapa yang sudah kirim evening report hari ini
  const submitted = await prisma.dailyCheckIn.findMany({
    where: { date: todayDate, eveningAt: { not: null } },
    select: { userId: true },
  })
  const submittedSet = new Set(submitted.map(c => c.userId))

  const allUsers = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: { id: true, name: true, role: true, divisi: true },
  })

  const notifMap = {} // superiorId → [userName]

  for (const user of users) {
    if (submittedSet.has(user.id)) continue

    const superiorIds = getSuperiorIds(user, allUsers)
    for (const supId of superiorIds) {
      if (!notifMap[supId]) notifMap[supId] = []
      notifMap[supId].push(user.name)
    }
  }

  let notified = 0
  for (const [supId, names] of Object.entries(notifMap)) {
    const uniqueNames = [...new Set(names)]
    await notifyUser({
      userId: supId,
      type: 'CHECKIN_EVENING_MISSING',
      title: `${uniqueNames.length} orang belum laporan progress`,
      message: `Belum submit laporan progress sore per pukul 20:00 WIB: ${uniqueNames.join(', ')}.`,
      link: '/my-tasks',
    })
    notified++
  }

  return NextResponse.json({
    date: todayDate,
    totalUsers: users.length,
    submitted: submittedSet.size,
    missing: users.length - submittedSet.size,
    notified,
  })
}
