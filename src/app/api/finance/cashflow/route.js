import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCashflowForecast } from '@/lib/financeData'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

// Aggregated vendor-payment cashflow forecast across projects, grouped by month —
// gives Finance/Direksi a forward view of fund needs (Project.budgetItems.neededDate).
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(await getCashflowForecast(session.user))
}
