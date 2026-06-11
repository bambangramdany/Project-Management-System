import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { DEFAULT_WORKLOAD_WEIGHTS, STATUS_PIPELINE } from '@/lib/constants'

function canEditWeights(role) {
  return role === 'OWNER' || role === 'DIRECTOR'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.workloadWeight.findMany()
  const byStatus = {}
  rows.forEach(r => { byStatus[r.status] = { picWeight: r.picWeight, memberWeight: r.memberWeight } })

  const weights = {}
  for (const status of STATUS_PIPELINE) {
    weights[status] = byStatus[status] || DEFAULT_WORKLOAD_WEIGHTS[status]
  }

  return NextResponse.json(weights)
}

export async function PUT(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canEditWeights(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const entries = Object.entries(body).filter(([status]) => STATUS_PIPELINE.includes(status))

  for (const [status, w] of entries) {
    const picWeight = parseFloat(w.picWeight)
    const memberWeight = parseFloat(w.memberWeight)
    if (!Number.isFinite(picWeight) || !Number.isFinite(memberWeight)) continue
    await prisma.workloadWeight.upsert({
      where: { status },
      update: { picWeight, memberWeight },
      create: { status, picWeight, memberWeight },
    })
  }

  const rows = await prisma.workloadWeight.findMany()
  const byStatus = {}
  rows.forEach(r => { byStatus[r.status] = { picWeight: r.picWeight, memberWeight: r.memberWeight } })
  const weights = {}
  for (const status of STATUS_PIPELINE) {
    weights[status] = byStatus[status] || DEFAULT_WORKLOAD_WEIGHTS[status]
  }

  return NextResponse.json(weights)
}
