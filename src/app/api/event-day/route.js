import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

  // Projects where today falls within startDate..endDate AND user is member or PIC
  const projects = await prisma.project.findMany({
    where: {
      startDate: { lte: todayEnd },
      endDate:   { gte: todayStart },
      status:    { in: ['ON_GOING', 'PRODUCTION', 'HOLD'] },
      OR: [
        { picId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      pic: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true, role: true, divisi: true } } },
      },
      rundown: { orderBy: [{ sortOrder: 'asc' }, { time: 'asc' }] },
      issues: {
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        include: { reportedBy: { select: { name: true } } },
      },
    },
  })

  if (projects.length === 0) return NextResponse.json([])

  // Get all crew user IDs across today's events
  const crewIds = new Set()
  projects.forEach(p => {
    if (p.picId) crewIds.add(p.picId)
    p.members.forEach(m => crewIds.add(m.userId))
  })

  // Today's check-in status for each crew member
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { userId: { in: [...crewIds] }, date: { gte: todayStart, lte: todayEnd } },
    select: { userId: true, morningAckAt: true },
  })
  const checkInMap = Object.fromEntries(checkIns.map(c => [c.userId, c]))

  const result = projects.map(p => {
    const allCrew = [
      ...(p.pic ? [{ id: p.pic.id, name: p.pic.name, isPic: true }] : []),
      ...p.members.map(m => ({ id: m.user.id, name: m.user.name, isPic: false })),
    ]
    const uniqueCrew = [...new Map(allCrew.map(c => [c.id, c])).values()]

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      pic: p.pic,
      rundown: p.rundown,
      issues: p.issues,
      crew: uniqueCrew.map(c => ({
        ...c,
        checkedIn: !!checkInMap[c.id]?.morningAckAt,
        checkedInAt: checkInMap[c.id]?.morningAckAt ?? null,
        isMe: c.id === session.user.id,
      })),
    }
  })

  return NextResponse.json(result)
}
