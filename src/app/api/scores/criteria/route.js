import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PROJECT_SCORE_CRITERIA } from '@/lib/constants'
import { isFinanceDirector } from '@/lib/rbac'
import { NextResponse } from 'next/server'

function canManage(user, division) {
  if (user.role === 'OWNER' || isFinanceDirector(user)) return true
  if (user.role === 'DIRECTOR') return user.divisi === division
  return false
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const division = searchParams.get('division')

  if (division === null) {
    const all = await prisma.scoreCriterion.findMany({ orderBy: [{ division: 'asc' }, { order: 'asc' }] })
    return NextResponse.json(all)
  }

  const rows = await prisma.scoreCriterion.findMany({
    where: { OR: [{ division: division || null }, { division: null }], active: true },
    orderBy: { order: 'asc' },
  })

  let result
  if (rows.length > 0) {
    const specific = rows.filter(r => r.division === (division || null))
    result = (specific.length > 0 ? specific : rows.filter(r => r.division === null))
      .map(r => ({ key: r.key, label: r.label }))
  } else {
    result = PROJECT_SCORE_CRITERIA
  }

  return NextResponse.json(result)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { division, key, label, order } = body
  if (!key || !label) return NextResponse.json({ error: 'key, label required' }, { status: 400 })

  if (!canManage(session.user, division || null)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const criterion = await prisma.scoreCriterion.upsert({
    where: { division_key: { division: division || null, key } },
    update: { label, order: order ?? 0, active: true },
    create: { division: division || null, key, label, order: order ?? 0 },
  })

  return NextResponse.json(criterion)
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const criterion = await prisma.scoreCriterion.findUnique({ where: { id } })
  if (!criterion) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!canManage(session.user, criterion.division)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.scoreCriterion.update({ where: { id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
