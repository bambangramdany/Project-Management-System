import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'avatars'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.impersonating) {
    return NextResponse.json({ error: 'Tidak bisa upload avatar saat mode pengawasan.' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Storage belum dikonfigurasi.' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 2 MB.` }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg'
  const path = `${session.user.id}/avatar.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  })
  if (uploadErr) return NextResponse.json({ error: 'Gagal upload: ' + uploadErr.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Tambahkan cache-bust agar browser tidak cache foto lama
  const avatarUrl = publicUrl + '?t=' + Date.now()

  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: publicUrl } })

  return NextResponse.json({ avatarUrl })
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Storage belum dikonfigurasi.' }, { status: 500 })

  // Hapus semua kemungkinan ekstensi
  const paths = ['jpg', 'png', 'webp', 'gif'].map(ext => `${session.user.id}/avatar.${ext}`)
  await supabase.storage.from(BUCKET).remove(paths)
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } })

  return NextResponse.json({ ok: true })
}
