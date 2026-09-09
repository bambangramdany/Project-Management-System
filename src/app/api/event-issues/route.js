import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, title, urgency, note } = await req.json()
  if (!projectId || !title) return NextResponse.json({ error: 'projectId dan title wajib' }, { status: 400 })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      pic: { select: { id: true, name: true } },
      members: { where: { role: { in: ['PM', 'PIC', 'PRODUCER'] } }, include: { user: { select: { id: true } } } },
    },
  })
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })

  const issue = await prisma.eventIssue.create({
    data: { projectId, reportedById: session.user.id, title, urgency: urgency || 'MEDIUM', note: note || null },
    include: { reportedBy: { select: { name: true } } },
  })

  // Notify PIC + all OWNER/DIRECTOR roles
  const urgencyLabel = { LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi', CRITICAL: '🚨 KRITIS' }
  const notifTitle = `Laporan Masalah Event: ${project.name}`
  const notifMsg = `[${urgencyLabel[urgency] || urgency}] ${title} — dilaporkan oleh ${session.user.name}${note ? `. Catatan: ${note}` : ''}`

  const toNotify = new Set()
  if (project.pic) toNotify.add(project.pic.id)
  project.members.forEach(m => toNotify.add(m.user.id))

  const owners = await prisma.user.findMany({
    where: { role: { in: ['OWNER', 'DIRECTOR'] } },
    select: { id: true },
  })
  owners.forEach(u => toNotify.add(u.id))
  toNotify.delete(session.user.id)

  await Promise.all([...toNotify].map(uid =>
    notifyUser({ userId: uid, type: 'EVENT_ISSUE', title: notifTitle, message: notifMsg, link: `/projects/${projectId}` })
  ))

  return NextResponse.json(issue, { status: 201 })
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId wajib' }, { status: 400 })

  const issues = await prisma.eventIssue.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: { reportedBy: { select: { name: true } } },
  })
  return NextResponse.json(issues)
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, resolved } = await req.json()
  const issue = await prisma.eventIssue.update({
    where: { id },
    data: { resolved, resolvedAt: resolved ? new Date() : null },
  })
  return NextResponse.json(issue)
}
