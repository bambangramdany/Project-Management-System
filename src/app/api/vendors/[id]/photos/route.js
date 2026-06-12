import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'vendor-files'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Upload a photo/document for a vendor (appends to the vendor's photo list).
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await prisma.vendor.findUnique({ where: { id: params.id } })
  if (!vendor) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Penyimpanan file belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di server).' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  const path = `${params.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: true,
  })
  if (uploadError) {
    return NextResponse.json({ error: `Gagal upload: ${uploadError.message}` }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const photos = Array.isArray(vendor.photos) ? vendor.photos : []
  photos.push({ url: pub.publicUrl, name: file.name })

  const updated = await prisma.vendor.update({
    where: { id: params.id },
    data: { photos },
    include: { enteredBy: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}

// Remove a photo by url (passed in body)
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await prisma.vendor.findUnique({ where: { id: params.id } })
  if (!vendor) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const { url } = await req.json()
  const photos = (Array.isArray(vendor.photos) ? vendor.photos : []).filter(p => p.url !== url)

  const updated = await prisma.vendor.update({
    where: { id: params.id },
    data: { photos },
    include: { enteredBy: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}
