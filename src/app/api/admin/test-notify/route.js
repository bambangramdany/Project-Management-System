import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/notify'

export async function POST(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: 'bambang@watermark.co.id' },
    select: { id: true, name: true, phone: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await notifyUser({
    userId: user.id,
    type: 'CHECKIN_EVENING_REMINDER',
    title: 'Test Notifikasi — Watermark PM',
    message: 'Ini adalah pesan test untuk memverifikasi format notifikasi WhatsApp sudah benar.',
    link: '/my-tasks',
  })

  return NextResponse.json({ ok: true, sentTo: user.name, phone: user.phone })
}
