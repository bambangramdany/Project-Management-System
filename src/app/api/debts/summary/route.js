import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isFinanceDirector } from '@/lib/rbac'
import { getDebtSummary } from '@/lib/dashboardData'
import { NextResponse } from 'next/server'

function canViewDebt(user) {
  return user.role === 'OWNER' || user.role === 'FINANCE' || isFinanceDirector(user) || user.role === 'DIRECTOR'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canViewDebt(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(await getDebtSummary())
}
