import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProfitability } from '@/lib/financeData'
import { NextResponse } from 'next/server'

const ALLOWED_ROLES = ['OWNER', 'FINANCE', 'DIRECTOR']

// Profitability analysis grouped by client and by category — helps Direksi
// identify which clients/event types are most profitable.
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(await getProfitability())
}
