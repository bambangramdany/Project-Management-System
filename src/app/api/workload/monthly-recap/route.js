import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER', 'PRODUCER']
const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']
// Rekap hanya untuk staff & PM — Owner dan Direksi tidak perlu masuk tabel ini
const EXCLUDED_ROLES = ['OWNER', 'DIRECTOR']

// Hitung hari kerja (Senin–Jumat) dalam rentang tanggal
function countWorkdays(from, to) {
  let count = 0
  const cur = new Date(from)
  while (cur <= to) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  // Format: YYYY-MM  (default: bulan ini)
  const now = new Date()
  const monthParam = searchParams.get('month') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [y, m] = monthParam.split('-').map(Number)

  const periodStart = new Date(y, m - 1, 1)
  const periodEnd   = new Date(y, m, 0, 23, 59, 59, 999) // akhir bulan

  const workdays = countWorkdays(periodStart, periodEnd)

  // Ambil semua user aktif
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', email: { notIn: HIDDEN_EMAILS }, role: { notIn: EXCLUDED_ROLES } },
    select: { id: true, name: true, role: true, jobTitle: true, divisi: true },
    orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
  })

  // Tasks yang SELESAI di bulan ini (status DONE, diupdate dalam periode)
  const doneTasks = await prisma.task.findMany({
    where: {
      status: 'DONE',
      updatedAt: { gte: periodStart, lte: periodEnd },
      assigneeId: { not: null },
    },
    select: { id: true, assigneeId: true, dueDate: true, title: true, updatedAt: true },
  })
  const donePersonal = await prisma.personalTask.findMany({
    where: {
      status: 'DONE',
      updatedAt: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true, userId: true, dueDate: true, title: true, updatedAt: true },
  })

  // Tasks yang masih OPEN (termasuk yang terlambat)
  const openTasks = await prisma.task.findMany({
    where: {
      status: { not: 'DONE' },
      assigneeId: { not: null },
      createdAt: { lte: periodEnd },
    },
    select: { id: true, assigneeId: true, dueDate: true, status: true, title: true },
  })
  const openPersonal = await prisma.personalTask.findMany({
    where: {
      status: { not: 'DONE' },
      createdAt: { lte: periodEnd },
    },
    select: { id: true, userId: true, dueDate: true, status: true, title: true },
  })

  // Progress updates dalam periode (untuk menghitung kepatuhan update harian)
  const progressUpdates = await prisma.progressUpdate.findMany({
    where: {
      date: { gte: periodStart, lte: periodEnd },
      userId: { in: users.map(u => u.id) },
    },
    select: { userId: true, date: true, status: true, taskId: true, personalTaskId: true },
  })

  // Hitung per-user
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const recap = users.map(user => {
    const uid = user.id

    // Tasks selesai bulan ini
    const doneThisMonth = [
      ...doneTasks.filter(t => t.assigneeId === uid),
      ...donePersonal.filter(t => t.userId === uid),
    ]

    // Tasks masih open
    const openNow = [
      ...openTasks.filter(t => t.assigneeId === uid),
      ...openPersonal.filter(t => t.userId === uid),
    ]

    // Overdue = open tasks dengan dueDate < hari ini
    const overdue = openNow.filter(t => t.dueDate && new Date(t.dueDate) < today)

    // Total tasks yang relevan dalam bulan ini = done + open
    const totalTasks = doneThisMonth.length + openNow.length

    // Tingkat penyelesaian
    const completionRate = totalTasks > 0
      ? Math.round((doneThisMonth.length / totalTasks) * 100)
      : 0

    // Update harian — hitung hari kerja unik di bulan ini yang punya update
    const userUpdates = progressUpdates.filter(p => p.userId === uid)
    const uniqueUpdateDays = new Set(
      userUpdates.map(p => new Date(p.date).toISOString().slice(0, 10))
    ).size

    // Update compliance = hari dengan update / hari kerja bulan ini
    const updateCompliance = workdays > 0
      ? Math.round((uniqueUpdateDays / workdays) * 100)
      : 0

    // Status breakdown dari progress updates bulan ini
    const statusCount = { ON_TRACK: 0, DELAYED: 0, HOLD: 0, PROBLEM: 0, DONE: 0 }
    userUpdates.forEach(p => { if (p.status in statusCount) statusCount[p.status]++ })

    return {
      userId:          uid,
      nama:            user.name,
      jabatan:         user.jobTitle || '-',
      divisi:          user.divisi   || '-',
      role:            user.role,
      // Tugas
      totalTugas:      totalTasks,
      selesai:         doneThisMonth.length,
      belumSelesai:    openNow.length,
      terlambat:       overdue.length,
      completionRate,  // %
      // Update harian
      hariUpdate:      uniqueUpdateDays,
      hariKerja:       workdays,
      updateCompliance, // %
      // Status detail
      onTrack:         statusCount.ON_TRACK,
      delayed:         statusCount.DELAYED,
      hold:            statusCount.HOLD,
      problem:         statusCount.PROBLEM,
      doneUpdates:     statusCount.DONE,
    }
  })

  return NextResponse.json({ month: monthParam, workdays, recap })
}
