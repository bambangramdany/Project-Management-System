import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Parse "YYYY-MM" and return array of period strings covered by viewType
function getPeriods(period, type) {
  const [year, month] = period.split('-').map(Number)
  if (type === 'yearly') {
    return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  }
  if (type === 'quarterly') {
    // Quarter of given month: Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12
    const q = Math.floor((month - 1) / 3)
    const start = q * 3 + 1
    return Array.from({ length: 3 }, (_, i) => `${year}-${String(start + i).padStart(2, '0')}`)
  }
  return [period]
}

function periodLabel(period, type) {
  const [year, month] = period.split('-').map(Number)
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long' })
  if (type === 'yearly') return `Tahun ${year}`
  if (type === 'quarterly') {
    const q = Math.floor((month - 1) / 3) + 1
    return `Kuartal ${q} ${year}`
  }
  return `${monthName} ${year}`
}

// Convert attendance percentage to 1-5 scale
function attendancePctToScore(pct) {
  if (pct == null) return null
  if (pct >= 95) return 5
  if (pct >= 85) return 4
  if (pct >= 70) return 3
  if (pct >= 55) return 2
  return 1
}

// Average sharing session score across sessions in given periods
async function getSharingScore(userId, periods) {
  const sessions = await prisma.sharingSession.findMany({
    where: {
      userId,
      scheduledDate: {
        gte: new Date(`${periods[0]}-01`),
        lte: new Date(`${periods[periods.length - 1]}-31`),
      },
      scoreMateri: { not: null },
    },
  })
  if (sessions.length === 0) return null
  const avgs = sessions.map(s => (s.scoreMateri + s.scorePenyampaian + s.scoreInteraksi + s.scoreWaktu) / 4)
  return avgs.reduce((a, b) => a + b, 0) / avgs.length
}

// Average KPI score from kpi assessments for periods
async function getKpiScore(userId, periods) {
  // KPI period stored as "YYYY-MM" in assessments
  const assessments = await prisma.kpiAssessment.findMany({
    where: { userId, period: { in: periods } },
  })
  if (assessments.length === 0) return null
  const allScores = assessments.map(a => a.score).filter(v => v != null)
  if (allScores.length === 0) return null
  // KpiAssessment scores are 1-5; return average directly
  return allScores.reduce((a, b) => a + b, 0) / allScores.length
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId') || session.user.id
  const period = searchParams.get('period') || (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()
  const type = searchParams.get('type') || 'monthly' // monthly | quarterly | yearly

  // Only self or HRD/Owner can view others
  if (targetUserId !== session.user.id && !session.user.canHrdEvaluate && session.user.role !== 'OWNER') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const periods = getPeriods(period, type)

  // Get evaluation weights
  const weightsRec = await prisma.evaluationWeight.findFirst({ orderBy: { updatedAt: 'desc' } })
  const weights = {
    kpi: weightsRec?.kpiWeight ?? 40,
    attendance: weightsRec?.attendanceWeight ?? 20,
    sharing: weightsRec?.sharingWeight ?? 15,
    attitude: weightsRec?.attitudeWeight ?? 15,
    skill: weightsRec?.skillWeight ?? 10,
  }

  // Get HrdMonthlyEvaluation records for all periods
  const hrdEvals = await prisma.hrdMonthlyEvaluation.findMany({
    where: { userId: targetUserId, period: { in: periods } },
    orderBy: { period: 'asc' },
  })

  // Attitude: average across periods
  const attitudeScores = hrdEvals.map(e => e.attitudeScore).filter(v => v != null)
  const attitudeScore = attitudeScores.length ? attitudeScores.reduce((a, b) => a + b, 0) / attitudeScores.length : null

  // Skill: average across periods
  const skillScores = hrdEvals.map(e => e.skillScore).filter(v => v != null)
  const skillScore = skillScores.length ? skillScores.reduce((a, b) => a + b, 0) / skillScores.length : null

  // Sharing session average
  const sharingScore = await getSharingScore(targetUserId, periods)

  // KPI average — try to get from KPIAssessment if model exists, else null
  let kpiScore = null
  try {
    kpiScore = await getKpiScore(targetUserId, periods)
  } catch {
    // KPIAssessment table might not exist or have different shape
    kpiScore = null
  }

  // Attendance from morning check-in. date is YYYY-MM-DD string.
  let attendanceScore = null
  try {
    const startDate = `${periods[0]}-01`
    const endYear = periods[periods.length - 1].split('-')[0]
    const endMonth = periods[periods.length - 1].split('-')[1]
    const endDate = `${endYear}-${endMonth}-31`
    const checkIns = await prisma.dailyCheckIn.findMany({
      where: { userId: targetUserId, date: { gte: startDate, lte: endDate } },
    })
    if (checkIns.length > 0) {
      const withMorning = checkIns.filter(c => c.morningAckAt != null)
      const onTime = withMorning.filter(c => {
        const ack = new Date(c.morningAckAt)
        // 09:30 WIB = 02:30 UTC
        const cutoff = new Date(c.morningAckAt)
        cutoff.setUTCHours(2, 30, 0, 0)
        return ack <= cutoff
      }).length
      const pct = (onTime / checkIns.length) * 100
      attendanceScore = attendancePctToScore(pct)
    }
  } catch {
    attendanceScore = null
  }

  // Compute weighted final score — only from components that have data
  let totalWeight = 0, weightedSum = 0
  const components = { kpi: kpiScore, attendance: attendanceScore, sharing: sharingScore, attitude: attitudeScore, skill: skillScore }
  const weightKeys = { kpi: weights.kpi, attendance: weights.attendance, sharing: weights.sharing, attitude: weights.attitude, skill: weights.skill }
  for (const [key, score] of Object.entries(components)) {
    if (score != null) {
      totalWeight += weightKeys[key]
      weightedSum += score * weightKeys[key]
    }
  }
  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : null

  // Collect HRD notes
  const notes = hrdEvals.flatMap(e => [e.attitudeNotes, e.skillNotes, e.skillActivities ? `Skill activities: ${e.skillActivities}` : null].filter(Boolean))

  return Response.json({
    userId: targetUserId,
    period,
    type,
    periodLabel: periodLabel(period, type),
    finalScore,
    weights,
    components,
    notes,
  })
}
