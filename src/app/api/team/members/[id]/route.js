import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const EDITABLE_FIELDS = [
  'name', 'jobTitle', 'divisi', 'employeeStatus', 'phone', 'teamOrder',
  'birthDate', 'birthPlace', 'gender', 'joinDate', 'npk',
  'personalEmail', 'maritalStatus', 'education', 'educationMajor',
  'emergencyContact', 'emergencyContactRel', 'bankName', 'bankAccount',
  'addressKtp', 'addressDomicili', 'hobby', 'motherName', 'fatherName',
  'ktpNumber', 'npwpNumber',
]

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'OWNER') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (params.id === session.user.id) {
      return Response.json({ error: 'Tidak bisa menghapus akun sendiri' }, { status: 400 })
    }

    const id = params.id

    // Lepas relasi yang tidak cascade, hapus data yang perlu dihapus
    await prisma.projectMember.deleteMany({ where: { userId: id } })
    await prisma.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } })
    await prisma.progressUpdate.deleteMany({ where: { userId: id } })
    await prisma.personalTask.deleteMany({ where: { userId: id } })
    await prisma.dailyCheckIn.deleteMany({ where: { userId: id } })
    await prisma.kpiAssessment.deleteMany({ where: { userId: id } })
    await prisma.hrdMonthlyEvaluation.deleteMany({ where: { userId: id } })
    await prisma.notification.deleteMany({ where: { userId: id } })
    await prisma.auditLog.deleteMany({ where: { userId: id } })
    await prisma.sharingSession.deleteMany({ where: { userId: id } })
    await prisma.eventRundown.deleteMany({ where: { createdById: id } })
    await prisma.eventIssue.deleteMany({ where: { reportedById: id } })

    await prisma.user.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.canHrdEvaluate && session.user.role !== 'OWNER') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const data = {}
    for (const key of EDITABLE_FIELDS) {
      if (key in body) {
        if ((key === 'birthDate' || key === 'joinDate') && body[key]) {
          data[key] = new Date(body[key])
        } else if ((key === 'birthDate' || key === 'joinDate') && body[key] === null) {
          data[key] = null
        } else {
          data[key] = body[key] ?? null
        }
      }
    }
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, birthDate: true, personalEmail: true },
    })
    return Response.json(user)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
