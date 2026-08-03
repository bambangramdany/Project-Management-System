import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function canEvaluate(user) {
  return user?.canHrdEvaluate || user?.role === 'OWNER'
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')
  const userId = searchParams.get('userId')

  const where = {}
  if (period) where.period = period
  if (userId) where.userId = userId

  const evals = await prisma.hrdMonthlyEvaluation.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, role: true, jobTitle: true, divisi: true } },
      evaluator: { select: { id: true, name: true } },
    },
    orderBy: [{ period: 'desc' }, { user: { name: 'asc' } }],
  })
  return Response.json(evals)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canEvaluate(session.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { userId, period, attitudeScore, attitudeNotes, skillScore, skillNotes, skillActivities } = body
  if (!userId || !period) return Response.json({ error: 'userId dan period wajib diisi' }, { status: 400 })

  const record = await prisma.hrdMonthlyEvaluation.upsert({
    where: { userId_period: { userId, period } },
    create: {
      userId, period,
      attitudeScore: attitudeScore ?? null,
      attitudeNotes: attitudeNotes || null,
      skillScore: skillScore ?? null,
      skillNotes: skillNotes || null,
      skillActivities: skillActivities || null,
      evaluatorId: session.user.id,
    },
    update: {
      attitudeScore: attitudeScore ?? null,
      attitudeNotes: attitudeNotes || null,
      skillScore: skillScore ?? null,
      skillNotes: skillNotes || null,
      skillActivities: skillActivities || null,
      evaluatorId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, role: true, jobTitle: true } },
      evaluator: { select: { id: true, name: true } },
    },
  })
  return Response.json(record)
}
