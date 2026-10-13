export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Lightweight ping to keep the Vercel function warm and the DB connection alive.
// Runs every 5 minutes via vercel.json cron.
export async function GET(req) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Minimal query — just enough to keep the connection warm
  await prisma.$queryRaw`SELECT 1`

  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}
