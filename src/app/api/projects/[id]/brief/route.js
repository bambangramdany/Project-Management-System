import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Replace the entire brief item list for a project with the given rows.
// Body: { items: [{ id?, question, answer, order }] }
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const items = Array.isArray(body.items) ? body.items : []

  await prisma.$transaction([
    prisma.projectBriefItem.deleteMany({ where: { projectId: params.id } }),
    ...items.map((item, i) => prisma.projectBriefItem.create({
      data: {
        projectId: params.id,
        order: i,
        question: (item.question || '').trim(),
        answer: item.answer ?? null,
      },
    })),
  ])

  const briefItems = await prisma.projectBriefItem.findMany({ where: { projectId: params.id }, orderBy: { order: 'asc' } })
  return NextResponse.json(briefItems)
}
