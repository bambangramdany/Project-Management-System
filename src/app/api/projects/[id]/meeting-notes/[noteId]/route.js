import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const CAN_MANAGE = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER', 'PROJECT_OFFICER']

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!CAN_MANAGE.includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.meetingNote.delete({ where: { id: params.noteId } })
  return NextResponse.json({ ok: true })
}
