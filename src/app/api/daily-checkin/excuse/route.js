/**
 * PUT  /api/daily-checkin/excuse — karyawan submit alasan telat/absen
 * GET  /api/daily-checkin/excuse — Director ambil daftar pending excuses
 * PATCH /api/daily-checkin/excuse — Director approve/reject excuse
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function todayWIB() {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().slice(0, 10)
}

// Divisi Director mapping (David/Guna/Fakhril untuk divisi masing-masing, Anung selalu di-notify)
// Logic: director yang bisa review adalah Director divisi yang sama ATAU Finance_HRGA Director (Anung)
function canReviewExcuse(reviewer, targetUser) {
  if (reviewer.role !== 'DIRECTOR') return false
  // Finance_HRGA Director (Anung) bisa review semua
  if (reviewer.divisi === 'FINANCE_HRGA') return true
  // Director divisi yang sama dengan karyawan
  if (reviewer.divisi === targetUser.divisi) return true
  return false
}

// PUT: karyawan submit alasan
export async function PUT(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, reason, date } = body // type: 'morning' | 'evening'

  if (!type || !['morning', 'evening'].includes(type)) {
    return NextResponse.json({ error: 'type harus morning atau evening' }, { status: 400 })
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Alasan tidak boleh kosong' }, { status: 400 })
  }

  const targetDate = date || todayWIB()

  // Ensure record exists
  const existing = await prisma.dailyCheckIn.findUnique({
    where: { userId_date: { userId: session.user.id, date: targetDate } },
  })

  const updateData = type === 'morning'
    ? { morningReason: reason.trim(), morningReasonStatus: 'PENDING', morningReasonReviewerId: null, morningReasonNote: null, morningReasonReviewedAt: null }
    : { eveningReason: reason.trim(), eveningReasonStatus: 'PENDING', eveningReasonReviewerId: null, eveningReasonNote: null, eveningReasonReviewedAt: null }

  const record = await prisma.dailyCheckIn.upsert({
    where: { userId_date: { userId: session.user.id, date: targetDate } },
    update: updateData,
    create: { userId: session.user.id, date: targetDate, ...updateData },
  })

  return NextResponse.json(record)
}

// GET: Director ambil daftar excuses pending (atau semua untuk history)
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'DIRECTOR' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING' // PENDING | APPROVED | REJECTED | all

  // Ambil check-ins yang punya alasan
  const where = {
    OR: [
      { morningReason: { not: null } },
      { eveningReason: { not: null } },
    ],
  }
  if (status !== 'all') {
    where.OR = [
      { morningReason: { not: null }, morningReasonStatus: status },
      { eveningReason: { not: null }, eveningReasonStatus: status },
    ]
  }

  // Director divisi hanya lihat timnya, FINANCE_HRGA Director lihat semua
  const isHRGA = session.user.divisi === 'FINANCE_HRGA'
  const isOwner = session.user.role === 'OWNER'

  const checkins = await prisma.dailyCheckIn.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, divisi: true, jobTitle: true, role: true } },
      morningReasonReviewer: { select: { id: true, name: true } },
      eveningReasonReviewer: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: 200,
  })

  // Filter by divisi jika bukan HRGA Director dan bukan Owner
  const filtered = (isHRGA || isOwner) ? checkins : checkins.filter(c => c.user.divisi === session.user.divisi)

  return NextResponse.json(filtered)
}

// PATCH: Director approve/reject
export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'DIRECTOR' && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { checkinId, type, decision, note } = body // decision: 'APPROVED' | 'REJECTED'

  if (!checkinId || !type || !decision) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return NextResponse.json({ error: 'decision harus APPROVED atau REJECTED' }, { status: 400 })
  }

  const checkin = await prisma.dailyCheckIn.findUnique({
    where: { id: checkinId },
    include: { user: { select: { id: true, name: true, divisi: true, role: true } } },
  })
  if (!checkin) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Permission check
  if (!canReviewExcuse(session.user, checkin.user)) {
    return NextResponse.json({ error: 'Forbidden: bukan Director divisi yang bersangkutan' }, { status: 403 })
  }

  const updateData = type === 'morning'
    ? { morningReasonStatus: decision, morningReasonReviewerId: session.user.id, morningReasonNote: note || null, morningReasonReviewedAt: new Date() }
    : { eveningReasonStatus: decision, eveningReasonReviewerId: session.user.id, eveningReasonNote: note || null, eveningReasonReviewedAt: new Date() }

  const updated = await prisma.dailyCheckIn.update({
    where: { id: checkinId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true } },
      morningReasonReviewer: { select: { id: true, name: true } },
      eveningReasonReviewer: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}
