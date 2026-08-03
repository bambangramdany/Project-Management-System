import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getPeriods(period, type) {
  const [year, month] = period.split('-').map(Number)
  if (type === 'yearly') {
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  }
  if (type === 'quarterly') {
    const q = Math.floor((month - 1) / 3)
    const start = q * 3 + 1
    return Array.from({ length: 3 }, (_, i) => `${year}-${String(start + i).padStart(2, '0')}`)
  }
  return [period]
}

function attendancePctToScore(pct) {
  if (pct == null) return null
  if (pct >= 95) return 5
  if (pct >= 85) return 4
  if (pct >= 70) return 3
  if (pct >= 55) return 2
  return 1
}

function avg(arr) {
  const vals = arr.filter(v => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.canHrdEvaluate && session.user.role !== 'OWNER') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const now = new Date()
    const period = searchParams.get('period') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const type = searchParams.get('type') || 'monthly'
    const periods = getPeriods(period, type)

    // Weights
    const weightsRec = await prisma.evaluationWeight.findFirst({ orderBy: { updatedAt: 'desc' } })
    const W = {
      kpi: weightsRec?.kpiWeight ?? 40,
      attendance: weightsRec?.attendanceWeight ?? 20,
      sharing: weightsRec?.sharingWeight ?? 15,
      attitude: weightsRec?.attitudeWeight ?? 15,
      skill: weightsRec?.skillWeight ?? 10,
    }

    // All team members (exclude OWNER)
    const users = await prisma.user.findMany({
      where: { role: { not: 'OWNER' } },
      select: { id: true, name: true, role: true, jobTitle: true, divisi: true },
      orderBy: { name: 'asc' },
    })

    // Bulk fetch HRD monthly evaluations
    const hrdEvals = await prisma.hrdMonthlyEvaluation.findMany({
      where: { period: { in: periods } },
    })

    // Bulk fetch sharing sessions with scores
    const startDate = new Date(`${periods[0]}-01`)
    const lastPeriod = periods[periods.length - 1]
    const [endYear, endMonth] = lastPeriod.split('-').map(Number)
    const endDate = new Date(endYear, endMonth, 0) // last day of last month
    const sharingSessions = await prisma.sharingSession.findMany({
      where: {
        scheduledDate: { gte: startDate, lte: endDate },
        scoreMateri: { not: null },
      },
    })

    // Bulk fetch KPI assessments
    const kpiAssessments = await prisma.kpiAssessment.findMany({
      where: { period: { in: periods } },
    })

    // Bulk fetch daily check-ins
    const startStr = `${periods[0]}-01`
    const endStr = `${lastPeriod}-31`
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: { date: { gte: startStr, lte: endStr } },
    })

    // Compute per-user scores
    const results = users.map(user => {
      // Attitude & skill from HRD monthly evals
      const userEvals = hrdEvals.filter(e => e.userId === user.id)
      const attitudeScore = avg(userEvals.map(e => e.attitudeScore))
      const skillScore = avg(userEvals.map(e => e.skillScore))

      // Sharing session
      const userSessions = sharingSessions.filter(s => s.userId === user.id)
      const sharingScore = userSessions.length
        ? avg(userSessions.map(s => (s.scoreMateri + s.scorePenyampaian + s.scoreInteraksi + s.scoreWaktu) / 4))
        : null

      // KPI
      const userKpi = kpiAssessments.filter(a => a.userId === user.id)
      const kpiScore = avg(userKpi.map(a => a.score))

      // Attendance
      const userCheckIns = checkIns.filter(c => c.userId === user.id)
      let attendanceScore = null
      if (userCheckIns.length > 0) {
        const onTime = userCheckIns.filter(c => {
          if (!c.morningAckAt) return false
          const ack = new Date(c.morningAckAt)
          const cutoff = new Date(c.morningAckAt)
          cutoff.setUTCHours(2, 30, 0, 0)
          return ack <= cutoff
        }).length
        attendanceScore = attendancePctToScore((onTime / userCheckIns.length) * 100)
      }

      // Weighted final score
      const components = { kpi: kpiScore, attendance: attendanceScore, sharing: sharingScore, attitude: attitudeScore, skill: skillScore }
      const weightKeys = { kpi: W.kpi, attendance: W.attendance, sharing: W.sharing, attitude: W.attitude, skill: W.skill }
      let totalWeight = 0, weightedSum = 0
      for (const [key, score] of Object.entries(components)) {
        if (score != null) { totalWeight += weightKeys[key]; weightedSum += score * weightKeys[key] }
      }
      const finalScore = totalWeight > 0 ? weightedSum / totalWeight : null

      return { user, components, finalScore }
    })

    return Response.json({ period, type, weights: W, results })
  } catch (e) {
    console.error('accumulation/team error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
