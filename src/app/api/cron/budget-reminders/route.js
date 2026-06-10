import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

// Daily job: notify PM, Finance, and Direksi (same division) about upcoming vendor
// payment needs (ProjectBudgetItem.neededDate) so funds can be prepared in advance.
// Triggered by Vercel Cron (see vercel.json) — protect with CRON_SECRET if set.
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
  horizon.setDate(horizon.getDate() + 3) // H-3
  const horizonEnd = new Date(horizon)
  horizonEnd.setDate(horizonEnd.getDate() + 1)

  // Items due today or in 3 days, not yet reminded
  const items = await prisma.projectBudgetItem.findMany({
    where: {
      reminderSentAt: null,
      OR: [
        { neededDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } }, // H-0
        { neededDate: { gte: horizon, lt: horizonEnd } }, // H-3
      ],
    },
    include: {
      project: {
        select: {
          id: true, code: true, name: true, division: true, picId: true,
          pic: { select: { id: true } },
        },
      },
    },
  })

  if (items.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  const financeAndDirectors = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE', OR: [{ role: 'FINANCE' }, { role: 'DIRECTOR' }, { role: 'OWNER' }] },
    select: { id: true, role: true, divisi: true },
  })

  let notified = 0
  for (const item of items) {
    const isToday = item.neededDate < new Date(todayStart.getTime() + 86400000)
    const when = isToday ? 'HARI INI' : '3 hari lagi'
    const title = `Kebutuhan dana vendor ${when}`
    const message = `${item.project.code} — ${item.project.name}: "${item.label}" sebesar Rp ${Math.round(item.quotedAmount).toLocaleString('id-ID')} dibutuhkan ${when.toLowerCase()}.`
    const link = `/finance`

    const recipients = new Set()
    if (item.project.picId) recipients.add(item.project.picId)
    for (const u of financeAndDirectors) {
      if (u.role === 'OWNER' || u.role === 'FINANCE') recipients.add(u.id)
      else if (u.role === 'DIRECTOR' && u.divisi === item.project.division) recipients.add(u.id)
    }

    await Promise.all([...recipients].map(userId =>
      notifyUser({ userId, type: 'BUDGET_REMINDER', title, message, link })
    ))

    await prisma.projectBudgetItem.update({ where: { id: item.id }, data: { reminderSentAt: now } })
    notified++
  }

  return NextResponse.json({ notified })
}
