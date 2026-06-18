import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isFinanceDirector } from '@/lib/rbac'
import { getFinanceOverview } from '@/lib/dashboardData'
import { NextResponse } from 'next/server'

// High-level company-wide financial overview for Direksi/Management — shown
// only to Owner, Finance, and Directors (incl. Finance Director).
const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR']

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role) && !isFinanceDirector(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const data = await getFinanceOverview(searchParams.get('from'), searchParams.get('to'))
  return NextResponse.json(data)
}
