import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE']
const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

// Urutan divisi sesuai sistem
const DIV_ORDER = ['EVENT', 'CREATIVE', 'PH', 'FINANCE_HRGA']
const DIV_LABEL = {
  EVENT: 'Event Organizer (EO)',
  CREATIVE: 'Creative',
  PH: 'Production House (PH)',
  FINANCE_HRGA: 'Finance / HR & GA',
}

function calcTHP(r) {
  const income = (r.gajiPokok || 0) + (r.tunjanganJabatan || 0) + (r.tunjanganKinerja || 0)
    + (r.tunjanganTransport || 0) + (r.tunjanganProject || 0) + (r.bonusProject || 0) + (r.thrBonus || 0)
  const deduct = (r.bpjsTk || 0) + (r.bpjsKes || 0) + (r.bpjsKesKeluarga || 0)
    + (r.pph21 || 0) + (r.kasbon || 0) + (r.absen || 0)
  return income - deduct
}

// GET /api/salary?period=2026-06
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const period = new URL(req.url).searchParams.get('period') || (() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  // Semua user aktif (kecuali hidden)
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', email: { notIn: HIDDEN_EMAILS } },
    select: { id: true, name: true, divisi: true, role: true, jobTitle: true },
    orderBy: [{ divisi: 'asc' }, { name: 'asc' }],
  })

  // Semua salary record untuk period ini
  const records = await prisma.salaryRecord.findMany({
    where: { period },
    include: { user: { select: { id: true, name: true, divisi: true, jobTitle: true } } },
  })
  const recordMap = Object.fromEntries(records.map(r => [r.userId, r]))

  // Score bulan ini & bulan lalu (ambil 3 bulan terakhir)
  const [py, pm] = period.split('-').map(Number)
  const threeMonthsAgo = new Date(py, pm - 4, 1) // 3 bulan lalu
  const scores = await prisma.projectScore.findMany({
    where: { createdAt: { gte: threeMonthsAgo } },
    select: { userId: true, score: true, createdAt: true },
  })
  const scoreMap = {}
  for (const s of scores) {
    if (!scoreMap[s.userId]) scoreMap[s.userId] = []
    scoreMap[s.userId].push(s.score)
  }
  const avgScoreMap = Object.fromEntries(
    Object.entries(scoreMap).map(([uid, arr]) => [uid, Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10])
  )

  // Group per divisi
  const groups = DIV_ORDER.map(div => {
    const members = users.filter(u => u.divisi === div)
    const rows = members.map(u => {
      const r = recordMap[u.id] || {}
      return {
        userId: u.id,
        name: u.name,
        divisi: u.divisi,
        jobTitle: u.jobTitle,
        role: u.role,
        recordId: r.id || null,
        employeeId: r.employeeId || null,
        employeeStatus: r.employeeStatus || null,
        gajiPokok: r.gajiPokok || 0,
        tunjanganJabatan: r.tunjanganJabatan || 0,
        tunjanganKinerja: r.tunjanganKinerja || 0,
        tunjanganTransport: r.tunjanganTransport || 0,
        tunjanganProject: r.tunjanganProject || 0,
        bonusProject: r.bonusProject || 0,
        thrBonus: r.thrBonus || 0,
        bpjsTk: r.bpjsTk || 0,
        bpjsKes: r.bpjsKes || 0,
        bpjsKesKeluarga: r.bpjsKesKeluarga || 0,
        pph21: r.pph21 || 0,
        kasbon: r.kasbon || 0,
        absen: r.absen || 0,
        bank: r.bank || '',
        nomorRekening: r.nomorRekening || '',
        notes: r.notes || '',
        thp: r.id ? calcTHP(r) : null,
        avgScore: avgScoreMap[u.id] || null,
      }
    })
    return { divisi: div, label: DIV_LABEL[div], rows }
  }).filter(g => g.rows.length > 0)

  // Total summary
  const allRows = groups.flatMap(g => g.rows).filter(r => r.thp !== null)
  const summary = {
    totalTHP: allRows.reduce((s, r) => s + r.thp, 0),
    totalGajiPokok: allRows.reduce((s, r) => s + r.gajiPokok, 0),
    totalTunjangan: allRows.reduce((s, r) => s + r.tunjanganJabatan + r.tunjanganKinerja + r.tunjanganTransport + r.tunjanganProject + r.bonusProject + r.thrBonus, 0),
    totalPotongan: allRows.reduce((s, r) => s + r.bpjsTk + r.bpjsKes + r.bpjsKesKeluarga + r.pph21 + r.kasbon + r.absen, 0),
    totalBonusProject: allRows.reduce((s, r) => s + r.bonusProject, 0),
    recordCount: allRows.length,
  }

  return NextResponse.json({ period, groups, summary })
}

// POST /api/salary — upsert satu record
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, period, ...fields } = body
  if (!userId || !period) return NextResponse.json({ error: 'userId dan period wajib diisi' }, { status: 400 })

  const record = await prisma.salaryRecord.upsert({
    where: { userId_period: { userId, period } },
    update: fields,
    create: { userId, period, ...fields },
  })

  return NextResponse.json({ ...record, thp: calcTHP(record) })
}
