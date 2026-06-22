import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewAllProjects, isFinanceDirector } from '@/lib/rbac'
import { computeProjectHealth } from '@/lib/health'
import { getCashflowForecast, getMarginReport, getProfitability, getReceivables } from '@/lib/financeData'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR']

// Combined Finance page payload for Owner/Finance/Direksi — cashflow forecast,
// margin report, profitability, and receivables in one request instead of four.
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role) && !isFinanceDirector(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [cashflow, marginReport, profitability, receivables] = await Promise.all([
    getCashflowForecast(session.user),
    getMarginReport(session.user),
    getProfitability(),
    getReceivables(),
  ])

  return NextResponse.json({ cashflow, marginReport, profitability, receivables })
}
