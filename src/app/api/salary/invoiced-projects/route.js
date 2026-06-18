// GET /api/salary/invoiced-projects?period=2026-06
// Ambil project yang sudah masuk status INVOICING di bulan tersebut,
// beserta anggota tim dan PIC-nya — untuk dasar pemberian bonus project.
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const period = new URL(req.url).searchParams.get('period') || ''
  const [y, m] = (period || '2026-06').split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)

  const projects = await prisma.project.findMany({
    where: {
      status: 'INVOICING',
      updatedAt: { gte: start, lt: end },
    },
    select: {
      id: true, code: true, name: true, division: true,
      client: { select: { name: true } },
      pic: { select: { id: true, name: true, divisi: true } },
      members: { select: { user: { select: { id: true, name: true, divisi: true } } } },
    },
    orderBy: { code: 'asc' },
  })

  // Flatten: per project, kumpulkan semua person (PIC + members, exclude hidden)
  const result = projects.map(p => {
    const people = []
    if (p.pic && !HIDDEN_EMAILS.includes(p.pic.email)) people.push(p.pic)
    for (const m of p.members) {
      if (!HIDDEN_EMAILS.includes(m.user?.email) && !people.find(x => x.id === m.user.id)) {
        people.push(m.user)
      }
    }
    return {
      id: p.id, code: p.code, name: p.name,
      clientName: p.client?.name || '',
      division: p.division,
      people,
    }
  })

  return NextResponse.json(result)
}
