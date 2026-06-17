import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']
const WON_STATUSES = ['DONE', 'REPORTING', 'INVOICING', 'PREPARATION', 'EVENT_DAY']

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role) && !isFinanceDirector(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())

  const rangeStart = new Date(year, 0, 1)
  const rangeEnd = new Date(year + 1, 0, 1)

  // Fetch all projects in the year + their budget items
  const [projects, targets, opexEntries] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { startDate: { gte: rangeStart, lt: rangeEnd } },
          { endDate: { gte: rangeStart, lt: rangeEnd } },
          { briefDate: { gte: rangeStart, lt: rangeEnd } },
        ],
        projectValue: { not: null },
      },
      select: {
        id: true,
        projectValue: true,
        status: true,
        pitchResult: true,
        division: true,
        startDate: true,
        endDate: true,
        briefDate: true,
        budgetItems: { select: { quotedAmount: true, actualAmount: true } },
      },
    }),
    prisma.divisionTarget.findMany({ where: { year } }),
    prisma.opexEntry.findMany({
      where: {
        period: {
          in: Array.from({ length: 12 }, (_, i) =>
            `${year}-${String(i + 1).padStart(2, '0')}`
          ),
        },
      },
      select: { period: true, amount: true },
    }),
  ])

  // Build months array Jan–Des
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return `${year}-${String(m).padStart(2, '0')}`
  })

  // Opex per month
  const opexByMonth = {}
  for (const e of opexEntries) opexByMonth[e.period] = (opexByMonth[e.period] || 0) + e.amount

  // Revenue & profit per month per division
  const revenueByMonth = {}
  const profitEkspByMonth = {}
  const profitAktualByMonth = {}

  for (const p of projects) {
    const refDate = p.startDate || p.endDate || p.briefDate
    if (!refDate) continue
    const mk = monthKey(new Date(refDate))
    if (!months.includes(mk)) continue

    const isWon = WON_STATUSES.includes(p.status) || p.pitchResult === 'WIN'
    if (!isWon) continue

    const div = p.division === 'PH' ? 'PH' : 'EO'
    const val = p.projectValue || 0
    const quotedCost = p.budgetItems.reduce((s, b) => s + (b.quotedAmount || 0), 0)
    const aktualCost = p.budgetItems.reduce((s, b) => s + (b.actualAmount ?? b.quotedAmount ?? 0), 0)

    if (!revenueByMonth[mk]) revenueByMonth[mk] = { EO: 0, PH: 0 }
    revenueByMonth[mk][div] += val

    profitEkspByMonth[mk] = (profitEkspByMonth[mk] || 0) + (val - quotedCost)
    profitAktualByMonth[mk] = (profitAktualByMonth[mk] || 0) + (val - aktualCost)
  }

  // Target per month (annual target / 12)
  const eoTarget = targets.find(t => t.division === 'EVENT')
  const phTarget = targets.find(t => t.division === 'PH')
  const totalRevenueTarget = ((eoTarget?.revenueTarget || 0) + (phTarget?.revenueTarget || 0)) / 12
  const totalProfitTarget = ((eoTarget?.profitTarget || 0) + (phTarget?.profitTarget || 0)) / 12

  // Build chart data arrays
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

  const revenueTrend = months.map((mk, i) => ({
    month: MONTH_LABELS[i],
    EO: revenueByMonth[mk]?.EO || 0,
    PH: revenueByMonth[mk]?.PH || 0,
    target: totalRevenueTarget,
  }))

  const profitTrend = months.map((mk, i) => {
    const opex = opexByMonth[mk] || 0
    return {
      month: MONTH_LABELS[i],
      aktual: Math.max(0, (profitAktualByMonth[mk] || 0) - opex),
      ekspektasi: Math.max(0, (profitEkspByMonth[mk] || 0) - opex),
      target: totalProfitTarget,
    }
  })

  return NextResponse.json({ revenueTrend, profitTrend, year })
}
