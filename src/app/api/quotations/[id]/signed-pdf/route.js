import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'quotations'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function canUpload(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user?.role)
}

// Upload signed PDF — only allowed after quotation is APPROVED or WON
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUpload(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const quotation = await prisma.quotation.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, quotationNumber: true },
  })
  if (!quotation) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  if (!['APPROVED', 'WON'].includes(quotation.status)) {
    return NextResponse.json({
      error: 'Upload dokumen bertandatangan hanya bisa dilakukan setelah quotation disetujui Direktur (status APPROVED atau WON)',
    }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Penyimpanan file belum dikonfigurasi.' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Hanya file PDF yang diperbolehkan' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `signed/${params.id}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (uploadError) {
    return NextResponse.json({ error: `Gagal upload: ${uploadError.message}` }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  await prisma.quotation.update({
    where: { id: params.id },
    data: { signedPdfUrl: pub.publicUrl, signedPdfName: file.name },
  })

  return NextResponse.json({ signedPdfUrl: pub.publicUrl, signedPdfName: file.name })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canUpload(session.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.quotation.update({
    where: { id: params.id },
    data: { signedPdfUrl: null, signedPdfName: null },
  })

  return NextResponse.json({ ok: true })
}
