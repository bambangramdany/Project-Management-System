import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

const DIVISIONS = ['EVENT', 'CREATIVE', 'PH', 'FINANCE_HRGA']

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year')) || new Date().getFullYear()

  const targets = await prisma.divisionTarget.findMany({ where: { year } })
  const targetByDivision = {}
  DIVISIONS.forEach(d => {
    const t = targets.find(x => x.division === d)
    targetByDivision[d] = { revenueTarget: t?.revenueTarget || 0, projectCountTarget: t?.projectCountTarget || 0 }
  })

  // Actuals: projects won (pitchResult WIN) with startDate within the year, by division
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const projects = await prisma.project.findMany({
    where: {
      pitchResult: 'WIN',
      OR: [
        { startDate: { gte: start, lt: end } },
        { startDate: null, submitDate: { gte: start, lt: end } },
      ],
    },
    select: { division: true, projectValue: true },
  })

  const actualByDivision = {}
  DIVISIONS.forEach(d => { actualByDivision[d] = { revenue: 0, projectCount: 0 } })
  projects.forEach(p => {
    const d = p.division || 'EVENT'
    if (!actualByDivision[d]) actualByDivision[d] = { revenue: 0, projectCount: 0 }
    actualByDivision[d].revenue += p.projectValue || 0
    actualByDivision[d].projectCount += 1
  })

  return NextResponse.json({
    year,
    targets: targetByDivision,
    actuals: actualByDivision,
    canEdit: session.user.role === 'OWNER',
  })
}

export async function PUT(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() // { year, targets: { EVENT: { revenueTarget, projectCountTarget }, ... } }
  const year = parseInt(body.year) || new Date().getFullYear()

  for (const division of DIVISIONS) {
    const t = body.targets?.[division]
    if (!t) continue
    await prisma.divisionTarget.upsert({
      where: { year_division: { year, division } },
      update: {
        revenueTarget: parseFloat(t.revenueTarget) || 0,
        projectCountTarget: parseInt(t.projectCountTarget) || 0,
      },
      create: {
        year, division,
        revenueTarget: parseFloat(t.revenueTarget) || 0,
        projectCountTarget: parseInt(t.projectCountTarget) || 0,
      },
    })
  }

  await logAudit({
    userId: session.user.id, action: 'TARGET_UPDATE', entity: 'DivisionTarget', entityId: String(year),
    summary: `${session.user.name} memperbarui target tahunan ${year}`,
  })

  return NextResponse.json({ ok: true })
}
