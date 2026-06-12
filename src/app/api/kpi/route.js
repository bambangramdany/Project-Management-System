import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canScoreKpi, canViewKpiSummary } from '@/lib/rbac'
import { KPI_DEADLINE_DAY } from '@/lib/constants'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const period = searchParams.get('period')

  const where = {}
  if (period) where.period = period

  if (canViewKpiSummary(session.user)) {
    if (userId) where.userId = userId
  } else {
    // Non-HR/management: can only see assessments they gave or received
    where.OR = [{ userId: session.user.id }, { evaluatorId: session.user.id }]
    if (userId) where.AND = [{ userId }]
  }

  const assessments = await prisma.kpiAssessment.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, jobTitle: true, role: true, divisi: true } },
      evaluator: { select: { id: true, name: true, jobTitle: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(assessments)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() // { userId, period, items: [{ kpiKey, score, comment }] }
  if (!body.userId || !body.period || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, name: true, divisi: true, role: true } })
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (!canScoreKpi(session.user, target)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If submitting for the current period after the deadline day, flag as late
  const now = new Date()
  const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isLate = body.period === curPeriod && now.getDate() > KPI_DEADLINE_DAY

  const results = await Promise.all(body.items.map(item =>
    prisma.kpiAssessment.upsert({
      where: {
        userId_evaluatorId_period_kpiKey: {
          userId: body.userId,
          evaluatorId: session.user.id,
          period: body.period,
          kpiKey: item.kpiKey,
        },
      },
      update: { score: item.score, comment: item.comment || null, late: isLate },
      create: {
        userId: body.userId,
        evaluatorId: session.user.id,
        period: body.period,
        kpiKey: item.kpiKey,
        score: item.score,
        comment: item.comment || null,
        late: isLate,
      },
    })
  ))

  return NextResponse.json(results, { status: 201 })
}
