import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditProject, canDeleteProject } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      pic: { select: { id: true, name: true, email: true, role: true, jobTitle: true } },
      members: { include: { user: { select: { id: true, name: true, role: true, jobTitle: true, divisi: true } } } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          dependencies: { include: { requiredTask: { select: { id: true, title: true, status: true } } } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canEditProject(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { memberIds, ...fields } = body

  const data = {}
  const allowed = ['name','status','pitchStatus','pitchResult','wonLossReason','vendorWinner','category',
    'budgetTier','eventComplexity','recommendation','picId','clientId','briefDate','submitDate',
    'pitchDuration','startDate','endDate','projectDuration','projectValue','notes']

  for (const key of allowed) {
    if (key in fields) {
      if (['briefDate','submitDate','startDate','endDate'].includes(key)) {
        data[key] = fields[key] ? new Date(fields[key]) : null
      } else {
        data[key] = fields[key]
      }
    }
  }

  const project = await prisma.project.update({
    where: { id: params.id },
    data,
    include: { client: true, pic: true },
  })

  // Sync members if provided
  if (Array.isArray(memberIds)) {
    await prisma.projectMember.deleteMany({ where: { projectId: params.id } })
    if (memberIds.length > 0) {
      await prisma.projectMember.createMany({
        data: memberIds.map(userId => ({ projectId: params.id, userId })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json(project)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDeleteProject(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
