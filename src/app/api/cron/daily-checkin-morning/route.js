import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { getSuperiorIds } from '@/lib/checkinNotify'
import { NextResponse } from 'next/server'

// Cron: setiap hari 09:00 WIB (02:00 UTC) — Senin s/d Jumat
// Notifikasi superior jika anggota tim belum morning check-in
export async function GET(req) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Tanggal hari ini dalam WIB (UTC+7)
  const nowUTC = new Date()
  const nowWIB = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000)
  const dayOfWeek = nowWIB.getUTCDay() // 0=Sun, 6=Sat
  const todayDate = nowWIB.toISOString().slice(0, 10)

  // Hanya hari kerja (Senin–Jumat)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ skipped: true, reason: 'weekend' })
  }

  // Semua user aktif (kecuali OWNER — OWNER tidak harus check-in)
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', NOT: { role: 'OWNER' } },
    select: { id: true, name: true, role: true, divisi: true },
  })

  // Cari siapa yang sudah check-in pagi ini
  const checkedIn = await prisma.dailyCheckIn.findMany({
    where: { date: todayDate, morningAckAt: { not: null } },
    select: { userId: true },
  })
  const checkedInSet = new Set(checkedIn.map(c => c.userId))

  // Semua user aktif (termasuk OWNER) untuk mapping superior
  const allUsers = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: { id: true, name: true, role: true, divisi: true },
  })

  // Untuk setiap user yang BELUM check-in, kirim notif ke superior-nya
  // Kumpulkan notif per superior untuk hindari spam (satu notif berisi banyak nama)
  const notifMap = {} // superiorId → [userName]

  for (const user of users) {
    if (checkedInSet.has(user.id)) continue // sudah check-in, skip

    const superiorIds = getSuperiorIds(user, allUsers)
    for (const supId of superiorIds) {
      if (!notifMap[supId]) notifMap[supId] = []
      notifMap[supId].push(user.name)
    }
  }

  // Kirim satu notifikasi per superior (berisi daftar nama yang belum check-in)
  let notified = 0
  for (const [supId, names] of Object.entries(notifMap)) {
    const uniqueNames = [...new Set(names)]
    await notifyUser({
      userId: supId,
      type: 'CHECKIN_MORNING_MISSING',
      title: `${uniqueNames.length} orang belum check-in pagi`,
      message: `Belum check-in per pukul 09:00 WIB hari ini: ${uniqueNames.join(', ')}.`,
      link: '/my-tasks',
    })
    notified++
  }

  return NextResponse.json({
    date: todayDate,
    totalUsers: users.length,
    checkedIn: checkedInSet.size,
    missing: users.length - checkedInSet.size,
    notified,
  })
}
