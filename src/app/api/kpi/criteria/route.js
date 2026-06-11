import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { KPI_BY_ROLE } from '@/lib/constants'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

// Can this user manage KPI criteria for the given role/division?
function canManage(user, role, division) {
  if (user.role === 'OWNER' || isFinanceDirector(user)) return true
  if (user.role === 'DIRECTOR' && ['OWNER', 'DIRECTOR'].includes(role) === false) {
    return user.divisi === division
  }
  return false
}

// Resolve effective criteria for a (role, division) pair: division-specific
// overrides first, falling back to global (division=null) entries, falling
// back to the static KPI_BY_ROLE defaults if nothing in DB yet.
export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
  const division = searchParams.get('division') || null

  if (!role) {
    // Return all criteria (for admin UI)
    const all = await prisma.kpiCriterion.findMany({ orderBy: [{ role: 'asc' }, { division: 'asc' }, { order: 'asc' }] })
    return NextResponse.json(all)
  }

  const rows = await prisma.kpiCriterion.findMany({
    where: { role, OR: [{ division }, { division: null }], active: true },
    orderBy: { order: 'asc' },
  })

  let result
  if (rows.length > 0) {
    const specific = rows.filter(r => r.division === division)
    result = (specific.length > 0 ? specific : rows.filter(r => r.division === null))
      .map(r => ({ key: r.key, label: r.label }))
  } else {
    result = KPI_BY_ROLE[role] || []
  }

  return NextResponse.json(result)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { role, division, key, label, order } = body
  if (!role || !key || !label) return NextResponse.json({ error: 'role, key, label required' }, { status: 400 })

  if (!canManage(session.user, role, division || null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const criterion = await prisma.kpiCriterion.upsert({
    where: { role_division_key: { role, division: division || null, key } },
    update: { label, order: order ?? 0, active: true },
    create: { role, division: division || null, key, label, order: order ?? 0 },
  })

  return NextResponse.json(criterion)
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const criterion = await prisma.kpiCriterion.findUnique({ where: { id } })
  if (!criterion) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!canManage(session.user, criterion.role, criterion.division)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.kpiCriterion.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
