import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditProject, canDeleteProject, canQuickEditProjects } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
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
          _count: { select: { comments: true } },
        },
        orderBy: { order: 'asc' },
      },
      briefItems: { orderBy: { order: 'asc' } },
      quotations: { select: { id: true, status: true, quotationNumber: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existingProject = await prisma.project.findUnique({ where: { id: params.id } })
  if (!existingProject) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { memberIds, ...fields } = body

  // Evaluation notes on closed projects can be added by any authenticated team
  // member (for shared post-mortem learning), even without general edit rights.
  const isEvaluationOnly = Object.keys(fields).every(k => k === 'evaluationNote')
  // Quick-edit on the projects list (divisi/status/tanggal pelaksanaan) is
  // allowed for designated team leads even without general edit rights.
  const isQuickEditOnly = Object.keys(fields).every(k => ['division', 'status', 'startDate', 'picId'].includes(k))
  if (!isEvaluationOnly && !canEditProject(session.user, existingProject)) {
    if (!(isQuickEditOnly && canQuickEditProjects(session.user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const data = {}
  const allowed = ['name','status','pitchStatus','pitchResult','wonLossReason','vendorWinner','category',
    'budgetTier','eventComplexity','recommendation','picId','clientId','briefDate','submitDate',
    'pitchDuration','startDate','endDate','projectDuration','projectValue','notes','evaluationNote','division',
    'quotationNumber','invoiceNumber']

  for (const key of allowed) {
    if (key in fields) {
      if (['briefDate','submitDate','startDate','endDate'].includes(key)) {
        data[key] = fields[key] ? new Date(fields[key]) : null
      } else {
        data[key] = fields[key]
      }
    }
  }

  // ── Auto-sinkronisasi pitchResult ↔ status ──────────────────────────────
  // Jika pitchResult diubah, sesuaikan status secara otomatis
  if ('pitchResult' in fields) {
    const currentStatus = existingProject.status
    if (fields.pitchResult === 'WIN') {
      // Menang pitch → jangan biarkan di FAILED/CANCELED; pindah ke PREPARATION
      if (['FAILED', 'CANCELED'].includes(data.status ?? currentStatus)) {
        data.status = 'PREPARATION'
      }
    } else if (fields.pitchResult === 'LOSE') {
      // Kalah pitch → status jadi FAILED (kecuali sudah DONE)
      if (!['DONE'].includes(data.status ?? currentStatus)) {
        data.status = 'FAILED'
      }
    }
  }
  // Jika status diubah ke FAILED tapi pitchResult masih WIN → clear pitchResult
  if (('status' in fields) && fields.status === 'FAILED') {
    const currentPitchResult = existingProject.pitchResult
    if ((data.pitchResult ?? currentPitchResult) === 'WIN') {
      data.pitchResult = null
    }
  }
  // ────────────────────────────────────────────────────────────────────────

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
    await logAudit({
      userId: session.user.id, action: 'PROJECT_MEMBERS_CHANGE', entity: 'Project', entityId: project.id,
      summary: `${session.user.name} mengubah anggota project ${project.name}`,
      meta: { memberIds },
    })
  }

  // Log notable field changes
  if (data.status && data.status !== existingProject.status) {
    await logAudit({
      userId: session.user.id, action: 'PROJECT_STATUS_CHANGE', entity: 'Project', entityId: project.id,
      summary: `${session.user.name} mengubah status project ${project.name} dari ${existingProject.status} ke ${data.status}`,
      meta: { from: existingProject.status, to: data.status },
    })
  }
  if ('projectValue' in data && data.projectValue !== existingProject.projectValue) {
    await logAudit({
      userId: session.user.id, action: 'PROJECT_VALUE_CHANGE', entity: 'Project', entityId: project.id,
      summary: `${session.user.name} mengubah nilai project ${project.name} dari ${existingProject.projectValue ?? '-'} ke ${data.projectValue ?? '-'}`,
      meta: { from: existingProject.projectValue, to: data.projectValue },
    })
  }
  if ('picId' in data && data.picId !== existingProject.picId) {
    await logAudit({
      userId: session.user.id, action: 'PROJECT_PIC_CHANGE', entity: 'Project', entityId: project.id,
      summary: `${session.user.name} mengubah PIC project ${project.name}`,
      meta: { from: existingProject.picId, to: data.picId },
    })
  }

  return NextResponse.json(project)
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canDeleteProject(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Cegah delete jika ada quotation aktif (WON/APPROVED) atau invoice
  const activeQuotations = await prisma.quotation.count({
    where: { projectId: params.id, status: { in: ['WON', 'APPROVED', 'PENDING_DIRECTOR', 'PENDING_WULAN'] } },
  })
  if (activeQuotations > 0) {
    return NextResponse.json({ error: 'Project memiliki quotation aktif dan tidak bisa dihapus' }, { status: 400 })
  }
  const activeInvoices = await prisma.invoice.count({
    where: { projectId: params.id, status: { not: 'CANCELLED' } },
  })
  if (activeInvoices > 0) {
    return NextResponse.json({ error: 'Project memiliki invoice aktif dan tidak bisa dihapus' }, { status: 400 })
  }

  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
