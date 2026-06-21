/**
 * POST /api/admin/audit/fix-value
 * Update project.projectValue to match its linked WON quotation grand total.
 * Body: { projectId, newValue }
 * OWNER only.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { projectId, newValue } = await req.json()
  if (!projectId || newValue == null) {
    return NextResponse.json({ error: 'projectId dan newValue wajib diisi' }, { status: 400 })
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { projectValue: parseFloat(newValue) },
    select: { id: true, name: true, projectValue: true },
  })

  return NextResponse.json(updated)
}
