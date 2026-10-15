export const dynamic = 'force-dynamic'
import { sendWhatsapp } from '@/lib/whatsapp'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Test endpoint — dilindungi CRON_SECRET
// GET /api/test-whatsapp?phone=08xxx  → kirim WA ke nomor tertentu
// GET /api/test-whatsapp              → cek user mana yang punya nomor HP
export async function GET(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')

  if (phone) {
    const result = await sendWhatsapp({
      phone,
      message: 'Halo! Ini adalah pesan test dari Watermark PM. Notifikasi WhatsApp berhasil terhubung. ✅',
    })
    return NextResponse.json({ phone, result })
  }

  // Tanpa phone param: tampilkan user mana yang punya nomor HP
  const users = await prisma.user.findMany({
    where: { employeeStatus: 'ACTIVE' },
    select: { id: true, name: true, phone: true, role: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    total: users.length,
    withPhone: users.filter(u => u.phone).length,
    users: users.map(u => ({ name: u.name, role: u.role, hasPhone: !!u.phone, phone: u.phone || null })),
  })
}
