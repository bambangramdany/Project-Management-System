import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'
import { NextResponse } from 'next/server'

// Daily cron: ingatkan PM/Producer yang punya project aktif belum isi Finance
// (projectValue & estimasiBudget masih null) setelah grace period 3 hari.
// Satu notif rangkuman per orang per hari.
// Jadwal: 08:00 WIB = 01:00 UTC (vercel.json)

const ACTIVE_STATUSES = ['HOLD', 'PITCHING', 'WAITING_RESULT', 'PREPARATION', 'PROJECT_DAY', 'REPORTING', 'INVOICING']
const GRACE_DAYS = 3
const PM_ROLES = ['PROJECT_MANAGER', 'PRODUCER', 'OWNER', 'DIRECTOR']

export async function GET(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - GRACE_DAYS)

  // Ambil semua project aktif yang belum ada finance data, sudah melewati grace period
  const projects = await prisma.project.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
      createdAt: { lte: cutoff },
      projectValue: null,
      estimasiBudget: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      picId: true,
      pic: { select: { id: true, name: true, role: true } },
      members: { select: { user: { select: { id: true, name: true, role: true } } } },
    },
  })

  if (projects.length === 0) {
    return NextResponse.json({ notified: 0, projects: 0 })
  }

  // Kumpulkan project per user yang perlu diingatkan (PIC + member PM/Producer)
  const userProjects = new Map() // userId → { name, projects: [projectName,...] }

  for (const p of projects) {
    const recipients = new Set()

    // PIC selalu diingatkan (apapun rolenya)
    if (p.picId) recipients.add(JSON.stringify({ id: p.picId, name: p.pic?.name || '' }))

    // Member dengan role PM/Producer
    for (const m of p.members) {
      if (PM_ROLES.includes(m.user.role)) {
        recipients.add(JSON.stringify({ id: m.user.id, name: m.user.name }))
      }
    }

    for (const raw of recipients) {
      const user = JSON.parse(raw)
      if (!userProjects.has(user.id)) {
        userProjects.set(user.id, { name: user.name, projects: [] })
      }
      userProjects.get(user.id).projects.push(`${p.code} – ${p.name}`)
    }
  }

  let notified = 0
  for (const [userId, { projects: list }] of userProjects) {
    const count = list.length
    const preview = list.slice(0, 3).join(', ')
    const extra = count > 3 ? ` (+${count - 3} lainnya)` : ''

    await notifyUser({
      userId,
      type: 'FINANCE_REMINDER',
      title: `💰 ${count} project belum diisi data Finance`,
      message: `Harap isi tab Finance (Nilai & Estimasi Budget) untuk: ${preview}${extra}. Data ini dibutuhkan untuk laporan keuangan.`,
      link: '/projects',
    }).catch(() => {})

    notified++
  }

  return NextResponse.json({ notified, projects: projects.length })
}
