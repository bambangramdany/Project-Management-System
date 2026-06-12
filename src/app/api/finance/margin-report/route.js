import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMarginReport } from '@/lib/financeData'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

// Margin summary across won/active projects, grouped by division — gives Direksi/Owner
// a forward view of expected margin (project value vs. forecast/actual cost).
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(await getMarginReport(session.user))
}
