import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canScoreProject } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const scores = await prisma.projectScore.findMany({
    where: { projectId: params.id },
    include: {
      user: { select: { id: true, name: true, jobTitle: true, role: true } },
      evaluator: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(scores)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (!canScoreProject(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() // { userId, items: [{ criteria, score, comment }] }
  if (!body.userId || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const results = await Promise.all(body.items.map(item =>
    prisma.projectScore.upsert({
      where: {
        projectId_userId_evaluatorId_criteria: {
          projectId: params.id,
          userId: body.userId,
          evaluatorId: session.user.id,
          criteria: item.criteria,
        },
      },
      update: { score: item.score, comment: item.comment || null },
      create: {
        projectId: params.id,
        userId: body.userId,
        evaluatorId: session.user.id,
        criteria: item.criteria,
        score: item.score,
        comment: item.comment || null,
      },
    })
  ))

  return NextResponse.json(results, { status: 201 })
}
