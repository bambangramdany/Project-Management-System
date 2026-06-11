import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CROSS_TEAM_PM_EMAIL, canViewAllScores } from '@/lib/rbac'
import { PROJECT_SCORE_CRITERIA } from '@/lib/constants'
import { NextResponse } from 'next/server'

function aggregate(scores, criteria) {
  const byCriteria = {}
  criteria.forEach(c => { byCriteria[c.key] = { sum: 0, count: 0 } })
  scores.forEach(s => {
    if (!byCriteria[s.criteria]) byCriteria[s.criteria] = { sum: 0, count: 0 }
    byCriteria[s.criteria].sum += s.score
    byCriteria[s.criteria].count += 1
  })
  const result = {}
  let totalSum = 0, totalCount = 0
  Object.entries(byCriteria).forEach(([key, { sum, count }]) => {
    result[key] = count ? sum / count : null
    totalSum += sum
    totalCount += count
  })
  return { byCriteria: result, overall: totalCount ? totalSum / totalCount : null, count: totalCount }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const me = session.user

  // Union of default + custom-defined criteria, for column rendering and aggregation
  const customCriteria = await prisma.scoreCriterion.findMany({ where: { active: true }, orderBy: { order: 'asc' } })
  const criteriaMap = new Map(PROJECT_SCORE_CRITERIA.map(c => [c.key, c]))
  customCriteria.forEach(c => criteriaMap.set(c.key, { key: c.key, label: c.label }))
  const criteria = Array.from(criteriaMap.values())

  // 1. My own received scores (anonymous to me)
  const myScores = await prisma.projectScore.findMany({
    where: { userId: me.id },
    include: { project: { select: { id: true, code: true, name: true } } },
  })
  const mine = aggregate(myScores, criteria)

  // 2. Anonymous notes addressed to me (if I'm a director)
  let myNotes = []
  if (me.role === 'DIRECTOR' || me.role === 'OWNER') {
    const notes = await prisma.directorNote.findMany({
      where: { directorId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, message: true, createdAt: true },
    })
    myNotes = notes
  }

  // 3. Team summary — depends on role
  let team = []
  let allUsers = null

  if (canViewAllScores(me) || me.role === 'OWNER') {
    allUsers = await prisma.user.findMany({ where: { role: { notIn: ['OWNER'] } }, select: { id: true, name: true, jobTitle: true, role: true, divisi: true } })
  } else if (me.email === CROSS_TEAM_PM_EMAIL) {
    allUsers = await prisma.user.findMany({ where: { role: { notIn: ['OWNER', 'DIRECTOR'] }, id: { not: me.id } }, select: { id: true, name: true, jobTitle: true, role: true, divisi: true } })
  } else if (me.role === 'DIRECTOR') {
    allUsers = await prisma.user.findMany({ where: { divisi: me.divisi, role: { notIn: ['OWNER', 'DIRECTOR'] } }, select: { id: true, name: true, jobTitle: true, role: true, divisi: true } })
  } else if (me.role === 'PROJECT_MANAGER') {
    // members of projects where I'm PIC
    const myProjects = await prisma.project.findMany({
      where: { picId: me.id },
      select: { members: { include: { user: { select: { id: true, name: true, jobTitle: true, role: true, divisi: true } } } } },
    })
    const map = {}
    myProjects.forEach(p => p.members.forEach(m => {
      if (m.user.id !== me.id && m.user.role !== 'PROJECT_MANAGER') map[m.user.id] = m.user
    }))
    allUsers = Object.values(map)
  }

  if (allUsers) {
    const userIds = allUsers.map(u => u.id)
    const allScores = await prisma.projectScore.findMany({ where: { userId: { in: userIds } } })
    team = allUsers.map(u => ({
      user: u,
      summary: aggregate(allScores.filter(s => s.userId === u.id), criteria),
    }))
  }

  return NextResponse.json({ mine, myNotes, team, criteria })
}
