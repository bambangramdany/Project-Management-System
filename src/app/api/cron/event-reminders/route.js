/**
 * Daily cron: kirim notifikasi H-7, H-3, H-1 sebelum event day (endDate project)
 * dan H-3 sebelum milestone deadline.
 * Trigger via Vercel Cron — protected by CRON_SECRET.
 */
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000)
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const horizon = new Date(todayStart)
  horizon.setDate(horizon.getDate() + 7)  // look 7 days ahead

  // ── 1. Project event reminders ──────────────────────────────────────────
  const activeProjects = await prisma.project.findMany({
    where: {
      status: { in: ['PREPARATION', 'EVENT_DAY'] },
      endDate: { gte: todayStart, lte: horizon },
    },
    select: {
      id: true, code: true, name: true, division: true, endDate: true,
      pic: { select: { id: true } },
      members: { select: { userId: true } },
    },
  })

  let notifCount = 0
  const REMIND_DAYS = [7, 3, 1]

  for (const p of activeProjects) {
    if (!p.endDate) continue
    const daysLeft = daysBetween(todayStart, new Date(p.endDate))
    if (!REMIND_DAYS.includes(daysLeft)) continue

    const label = daysLeft === 1 ? 'BESOK' : `H-${daysLeft}`
    const recipients = new Set()
    if (p.pic?.id) recipients.add(p.pic.id)
    p.members.forEach(m => recipients.add(m.userId))

    for (const userId of recipients) {
      // Deduplicate: skip if notif same type+link already sent today
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'EVENT_REMINDER',
          link: `/projects/${p.id}`,
          createdAt: { gte: todayStart },
        },
      })
      if (existing) continue

      await notifyUser({
        userId,
        type: 'EVENT_REMINDER',
        title: `⚡ Event ${label}: ${p.name}`,
        message: `Project ${p.code} berlangsung ${label}. Pastikan semua persiapan sudah selesai.`,
        link: `/projects/${p.id}`,
      })
      notifCount++
    }
  }

  // ── 2. Milestone reminders ───────────────────────────────────────────────
  const milestones = await prisma.projectMilestone.findMany({
    where: {
      done: false,
      date: { gte: todayStart, lte: horizon },
    },
    include: {
      project: {
        select: {
          id: true, code: true, name: true,
          pic: { select: { id: true } },
          members: { select: { userId: true } },
        },
      },
    },
  })

  for (const m of milestones) {
    const daysLeft = daysBetween(todayStart, new Date(m.date))
    if (![3, 1, 0].includes(daysLeft)) continue

    const label = daysLeft === 0 ? 'HARI INI' : daysLeft === 1 ? 'BESOK' : `H-${daysLeft}`
    const p = m.project
    const recipients = new Set()
    if (p.pic?.id) recipients.add(p.pic.id)
    p.members.forEach(mem => recipients.add(mem.userId))

    for (const userId of recipients) {
      const existing = await prisma.notification.findFirst({
        where: { userId, type: 'MILESTONE_REMINDER', link: `/projects/${p.id}`, message: { contains: m.title }, createdAt: { gte: todayStart } },
      })
      if (existing) continue

      await notifyUser({
        userId,
        type: 'MILESTONE_REMINDER',
        title: `📌 Milestone ${label}: ${m.title}`,
        message: `${p.name} — milestone "${m.title}" jatuh tempo ${label}.`,
        link: `/projects/${p.id}`,
      })
      notifCount++
    }
  }

  return NextResponse.json({ ok: true, notifCount })
}
