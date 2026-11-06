import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const MEETING_LABEL = {
  FINANCE_EVENT: 'Finance × Event',
  FINANCE_PH:    'Finance × PH',
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allowed = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF']
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const logs = await prisma.financeMeetingLog.findMany({
    orderBy: [{ weekDate: 'desc' }, { meetingType: 'asc' }],
    include: {
      author: { select: { name: true } },
      attendeeRecords: { include: { user: { select: { name: true, divisi: true } } } },
    },
  })

  const DIV_LABEL = {
    EVENT: 'Event',
    CREATIVE: 'Creative',
    PH: 'PH',
    FINANCE_HRGA: 'Finance/HRGA',
  }

  const rows = logs.map(l => {
    const attendees = l.attendeeRecords.map(a => a.user)
    const byDiv = {}
    attendees.forEach(u => {
      const d = DIV_LABEL[u.divisi] || u.divisi
      if (!byDiv[d]) byDiv[d] = []
      byDiv[d].push(u.name)
    })
    const attendeeStr = Object.entries(byDiv).map(([d, names]) => `${d}: ${names.join(', ')}`).join(' | ')

    return {
      'Tanggal Meeting': new Date(l.weekDate + 'T12:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      'Tipe Meeting': MEETING_LABEL[l.meetingType] || l.meetingType,
      'Yang Hadir': attendeeStr,
      'A/R Minggu Ini': l.arSummary || '',
      'A/P Minggu Depan': l.apPlan || '',
      'Catatan & Tindak Lanjut': l.notes || '',
      'Dicatat oleh': l.author?.name || '',
      'Tanggal Input': new Date(l.submittedAt).toLocaleDateString('id-ID'),
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // Tanggal
    { wch: 20 }, // Tipe
    { wch: 50 }, // Yang Hadir
    { wch: 50 }, // A/R
    { wch: 50 }, // A/P
    { wch: 60 }, // Catatan
    { wch: 15 }, // Dicatat oleh
    { wch: 15 }, // Tanggal Input
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Finance Meeting')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Finance_Meeting_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  })
}
