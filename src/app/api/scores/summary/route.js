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

const HIDDEN_EMAILS = ['hrdwatermark@gmail.com']

function getUsersPromise(me) {
  if (canViewAllScores(me) || me.role === 'OWNER') {
    return prisma.user.findMany({
      where: { role: { notIn: ['OWNER', 'DIRECTOR'] }, email: { notIn: HIDDEN_EMAILS } },
      select: { id: true, name: true, jobTitle: true, role: true, divisi: true },
    })
  }
  if (me.email === CROSS_TEAM_PM_EMAIL) {
    return prisma.user.findMany({
      where: { role: { notIn: ['OWNER', 'DIRECTOR'] }, id: { not: me.id }, email: { notIn: HIDDEN_EMAILS } },
      select: { id: true, name: true, jobTitle: true, role: true, divisi: true },
    })
  }
  if (me.role === 'DIRECTOR') {
    return prisma.user.findMany({
      where: { divisi: me.divisi, role: { notIn: ['OWNER', 'DIRECTOR'] }, email: { notIn: HIDDEN_EMAILS } },
      select: { id: true, name: true, jobTitle: true, role: true, divisi: true },
    })
  }
  if (me.role === 'PROJECT_MANAGER') {
    return prisma.project.findMany({
      where: { picId: me.id },
      select: { members: { include: { user: { select: { id: true, name: true, jobTitle: true, role: true, divisi: true } } } } },
    }).then(myProjects => {
      const map = {}
      myProjects.forEach(p => p.members.forEach(m => {
        if (m.user.id !== me.id && m.user.role !== 'PROJECT_MANAGER') map[m.user.id] = m.user
      }))
      return Object.values(map)
    })
  }
  return Promise.resolve(null)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const me = session.user

  // Round 1: all independent queries in parallel
  const [customCriteria, myScores, myNotesRaw, allUsers] = await Promise.all([
    prisma.scoreCriterion.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
    prisma.projectScore.findMany({
      where: { userId: me.id },
      include: { project: { select: { id: true, code: true, name: true } } },
    }),
    (me.role === 'DIRECTOR' || me.role === 'OWNER')
      ? prisma.directorNote.findMany({
          where: { directorId: me.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true, message: true, createdAt: true },
        })
      : Promise.resolve([]),
    getUsersPromise(me),
  ])

  const criteriaMap = new Map(PROJECT_SCORE_CRITERIA.map(c => [c.key, c]))
  customCriteria.forEach(c => criteriaMap.set(c.key, { key: c.key, label: c.label }))
  const criteria = Array.from(criteriaMap.values())
  const mine = aggregate(myScores, criteria)

  let team = []
  if (allUsers) {
    const userIds = allUsers.map(u => u.id)
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    // Round 2: team-level queries all in parallel
    const [allScores, allKpi, monthUpdates] = await Promise.all([
      prisma.projectScore.findMany({
        where: { userId: { in: userIds } },
        include: { project: { select: { id: true, code: true, name: true } } },
      }),
      prisma.kpiAssessment.findMany({
        where: { userId: { in: userIds }, NOT: { kpiKey: { startsWith: '_masukan_' } } },
      }),
      prisma.progressUpdate.findMany({
        where: { userId: { in: userIds }, date: { gte: monthStart } },
        select: { userId: true, status: true, note: true, date: true, late: true },
      }),
    ])

    team = allUsers.map(u => {
      const userScores = allScores.filter(s => s.userId === u.id)
      const project = aggregate(userScores, criteria)

      const byProjectMap = {}
      userScores.forEach(s => {
        const pid = s.project?.id || s.projectId
        if (!byProjectMap[pid]) byProjectMap[pid] = { project: s.project, scores: [] }
        byProjectMap[pid].scores.push(s)
      })
      const byProject = Object.values(byProjectMap)
        .map(({ project: p, scores }) => ({ project: p, ...aggregate(scores, criteria) }))
        .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))

      const kpiForUser = allKpi.filter(a => a.userId === u.id)
      const kpiSum = kpiForUser.reduce((sum, a) => sum + a.score, 0)
      const kpiCount = kpiForUser.length
      const kpiOverall = kpiCount ? kpiSum / kpiCount : null
      const combinedSum = (project.overall ?? 0) * project.count + kpiSum
      const combinedCount = project.count + kpiCount
      const combinedOverallRaw = combinedCount ? combinedSum / combinedCount : null

      const userUpdates = monthUpdates.filter(m => m.userId === u.id)
      const delayedNotes = userUpdates.filter(m => ['DELAYED', 'HOLD', 'PROBLEM'].includes(m.status))
      const lateCount = userUpdates.filter(m => m.late).length
      const deduction = delayedNotes.length * 0.5 + lateCount * 1
      const combinedOverall = combinedOverallRaw != null ? Math.max(0, combinedOverallRaw - deduction) : combinedOverallRaw

      return {
        user: u,
        summary: {
          ...project,
          byProject,
          kpiOverall,
          kpiCount,
          combinedOverall,
          deduction,
          delayedCount: delayedNotes.length,
          lateUpdateCount: lateCount,
          delayedNotes: delayedNotes.map(n => ({ status: n.status, note: n.note, date: n.date })),
        },
      }
    })
  }

  team.sort((a, b) => (a.user.divisi || '').localeCompare(b.user.divisi || '') || a.user.name.localeCompare(b.user.name))

  return NextResponse.json({ mine, myNotes: myNotesRaw, team, criteria })
}
