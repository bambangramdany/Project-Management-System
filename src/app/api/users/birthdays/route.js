import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const users = await prisma.user.findMany({
      where: { role: { not: 'OWNER' } },
      select: { id: true, name: true, birthDate: true, jobTitle: true, divisi: true },
      orderBy: { name: 'asc' },
    })
    return Response.json(users)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (!session.user.canHrdEvaluate && session.user.role !== 'OWNER') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, birthDate } = await req.json()
    if (!userId) return Response.json({ error: 'userId wajib diisi' }, { status: 400 })

    const user = await prisma.user.update({
      where: { id: userId },
      data: { birthDate: birthDate ? new Date(birthDate) : null },
      select: { id: true, name: true, birthDate: true },
    })
    return Response.json(user)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
