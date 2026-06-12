import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canScoreProject, canScoreProjectMember, canViewAllScores } from '@/lib/rbac'
import { notifyManagement } from '@/lib/notify'
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

  // Only Owner/HR can see who gave a score; everyone else only sees their own submissions
  const visible = canViewAllScores(session.user)
    ? scores
    : scores.filter(s => s.evaluatorId === session.user.id)

  return NextResponse.json(visible)
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

  const target = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, name: true, role: true, divisi: true } })
  if (!target) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (!canScoreProjectMember(session.user, target, project)) {
    return NextResponse.json({ error: 'Anda tidak berhak menilai anggota ini' }, { status: 403 })
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

  await notifyManagement({
    excludeUserId: session.user.id,
    division: target.divisi || project.division,
    type: 'PROJECT_SCORE',
    title: 'Penilaian Per-Project Baru',
    message: `${session.user.name} menilai ${target.name} untuk project ${project.code} - ${project.name}`,
    link: `/projects/${project.id}`,
  })

  return NextResponse.json(results, { status: 201 })
}
