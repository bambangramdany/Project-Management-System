import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

const ALLOWED_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER']
const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

const STATUS_LABEL = {
  ON_TRACK: 'Berjalan',
  DELAYED:  'Terlambat',
  HOLD:     'Hold',
  PROBLEM:  'Bermasalah',
  DONE:     'Selesai',
}

const DIV_LABEL = {
  EVENT:        'Event Organizer',
  CREATIVE:     'Creative',
  PH:           'Production House',
  FINANCE_HRGA: 'Finance / HR & GA',
}

function todayUTC() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return new Response('Forbidden', { status: 403 })

  const today = todayUTC()
  const todayStr = today.toISOString().slice(0, 10)
  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Fetch semua task aktif beserta update terakhir
  const [allTasks, allPersonalTasks, checkIns, allUsers] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: 'DONE' }, assignee: { email: { notIn: HIDDEN_EMAILS } } },
      include: {
        project: { select: { code: true, name: true, client: { select: { name: true } } } },
        assignee: { select: { id: true, name: true, divisi: true, role: true } },
        progressUpdates: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: [{ assignee: { divisi: 'asc' } }, { assignee: { name: 'asc' } }, { dueDate: 'asc' }],
    }),
    prisma.personalTask.findMany({
      where: { status: { not: 'DONE' }, user: { email: { notIn: HIDDEN_EMAILS } } },
      include: {
        project: { select: { code: true, name: true, client: { select: { name: true } } } },
        user: { select: { id: true, name: true, divisi: true, role: true } },
        progressUpdates: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: [{ user: { divisi: 'asc' } }, { user: { name: 'asc' } }, { dueDate: 'asc' }],
    }),
    prisma.dailyCheckIn.findMany({
      where: { date: todayStr },
      select: { userId: true, morningAckAt: true, eveningAt: true },
    }),
    prisma.user.findMany({
      where: { employeeStatus: 'ACTIVE', email: { notIn: HIDDEN_EMAILS } },
      select: { id: true, name: true, divisi: true },
    }),
  ])

  const checkInMap = {}
  for (const c of checkIns) checkInMap[c.userId] = c

  function fmt(dt) {
    if (!dt) return null
    return new Date(dt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function fmtTime(dt) {
    if (!dt) return '-'
    const wib = new Date(new Date(dt).getTime() + 7 * 60 * 60 * 1000)
    return `${String(wib.getUTCHours()).padStart(2, '0')}:${String(wib.getUTCMinutes()).padStart(2, '0')}`
  }

  // Sheet 1: Progress Update Tim
  const rows = []
  const allItems = [
    ...allTasks.map(t => ({ person: t.assignee, item: t, kind: 'Tugas Project', latest: t.progressUpdates[0] || null })),
    ...allPersonalTasks.map(t => ({ person: t.user, item: t, kind: 'Catatan/To-Do', latest: t.progressUpdates[0] || null })),
  ]

  for (const { person, item, kind, latest } of allItems) {
    const hasToday = latest && new Date(latest.date).toISOString().slice(0, 10) === todayStr
    rows.push({
      'Divisi':        DIV_LABEL[person?.divisi] || person?.divisi || '-',
      'Nama':          person?.name || '-',
      'Jenis':         kind,
      'Judul Tugas':   item.title,
      'Project':       item.project?.name || '-',
      'Klien':         item.project?.client?.name || '-',
      'Deadline':      fmt(item.dueDate) || '-',
      'Status Tugas':  STATUS_LABEL[item.status] || item.status || '-',
      'Sudah Update?': hasToday ? 'Ya' : 'Belum',
      'Status Update': latest ? (STATUS_LABEL[latest.status] || latest.status) : '-',
      'Catatan Update': latest?.note || '-',
      'Tgl Update':    latest ? fmt(latest.date) : '-',
    })
  }

  const wsProgress = XLSX.utils.json_to_sheet(rows)
  // Lebar kolom
  wsProgress['!cols'] = [
    { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 14 },
  ]

  // Sheet 2: Rekap Check-In Harian
  const ciRows = allUsers
    .sort((a, b) => (a.divisi || '').localeCompare(b.divisi || '') || a.name.localeCompare(b.name))
    .map(u => {
      const ci = checkInMap[u.id]
      return {
        'Divisi':         DIV_LABEL[u.divisi] || u.divisi || '-',
        'Nama':           u.name,
        'Morning Check-In': ci?.morningAckAt ? fmtTime(ci.morningAckAt) : '-',
        'Evening Check-In': ci?.eveningAt    ? fmtTime(ci.eveningAt)    : '-',
        'Status':         ci ? (ci.eveningAt ? 'Lengkap' : 'Morning Only') : 'Belum Check-In',
      }
    })

  const wsCheckIn = XLSX.utils.json_to_sheet(ciRows)
  wsCheckIn['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 16 }]

  // Buat workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsProgress, 'Progress Update Tim')
  XLSX.utils.book_append_sheet(wb, wsCheckIn, 'Rekap Check-In')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Monitor_CheckIn_${todayStr}.xlsx`

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
