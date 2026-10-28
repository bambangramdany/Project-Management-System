/**
 * Cron: setiap hari Senin–Jumat 08:00 WIB (01:00 UTC)
 * Sync antrian invoice → PersonalTask untuk user FINANCE_STAFF.
 * Tiap quotation hanya dibuatkan 1 task (idempotent via [inv-queue:{quotationId}] di description).
 */
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Quotation WON, project sudah selesai, belum ada invoice ISSUED/PAID
  const quotations = await prisma.quotation.findMany({
    where: {
      status: 'WON',
      invoices: { none: { status: { in: ['ISSUED', 'PAID'] } } },
      project: {
        OR: [
          { endDate: { lt: today } },
          { endDate: null, startDate: { lt: today } },
        ],
      },
    },
    include: {
      project: { select: { id: true, code: true, name: true, endDate: true, startDate: true } },
    },
  })

  if (quotations.length === 0) return NextResponse.json({ created: 0, skipped: 0 })

  // Target: semua user FINANCE_STAFF
  const financeStaffs = await prisma.user.findMany({
    where: { role: 'FINANCE_STAFF' },
    select: { id: true },
  })
  if (financeStaffs.length === 0) return NextResponse.json({ created: 0, skipped: 0 })

  let created = 0, skipped = 0

  for (const user of financeStaffs) {
    for (const q of quotations) {
      const marker = `[inv-queue:${q.id}]`

      // Cek apakah task sudah ada (belum selesai)
      const existing = await prisma.personalTask.findFirst({
        where: {
          userId: user.id,
          description: { contains: marker },
          status: { not: 'DONE' },
        },
      })
      if (existing) { skipped++; continue }

      const execDate = q.project?.endDate || q.project?.startDate
      const execStr  = execDate ? new Date(execDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : ''

      await prisma.personalTask.create({
        data: {
          userId:      user.id,
          title:       `Invoice ${q.quotationNumber} — ${q.eventName}`,
          description: `Klien: ${q.clientName}${execStr ? ` · Selesai: ${execStr}` : ''} ${marker}`,
          projectId:   q.project?.id || null,
          projectName: q.project?.name || null,
          clientName:  q.clientName,
          status:      'TODO',
        },
      })
      created++
    }
  }

  return NextResponse.json({ created, skipped })
}
