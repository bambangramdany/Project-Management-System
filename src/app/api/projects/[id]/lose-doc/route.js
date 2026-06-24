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

// Upload (or replace) the loss announcement document for a project.
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

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

  const path = `lose-docs/${params.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (uploadError) {
    return NextResponse.json({ error: `Gagal upload: ${uploadError.message}` }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  await prisma.project.update({
    where: { id: params.id },
    data: { loseDocUrl: pub.publicUrl, loseDocName: file.name },
  })

  return NextResponse.json({ loseDocUrl: pub.publicUrl, loseDocName: file.name })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  await prisma.project.update({
    where: { id: params.id },
    data: { loseDocUrl: null, loseDocName: null },
  })

  return NextResponse.json({ ok: true })
}
