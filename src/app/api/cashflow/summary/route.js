import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isFinanceDirector } from '@/lib/rbac'
import { getCashSummary } from '@/lib/dashboardData'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role
  const allowed = role === 'OWNER' || role === 'FINANCE' || role === 'DIRECTOR' || isFinanceDirector(session.user)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json(await getCashSummary())
}
