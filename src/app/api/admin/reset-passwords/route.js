import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hash = await bcrypt.hash('watermark2026', 10)
  const result = await prisma.user.updateMany({
    where: { email: { not: 'bambang@watermark.co.id' } },
    data: { hashedPassword: hash },
  })

  return NextResponse.json({ updated: result.count })
}
