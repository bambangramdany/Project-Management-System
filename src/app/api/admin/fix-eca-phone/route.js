import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await prisma.user.update({
    where: { email: 'eca@watermark.co.id' },
    data: { phone: '+6281919844817' },
    select: { name: true, phone: true },
  })
  return NextResponse.json({ ok: true, ...user })
}
