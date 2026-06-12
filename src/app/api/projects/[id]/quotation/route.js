import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canEditProjectValue } from '@/lib/rbac'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'quotations'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Upload (or replace) the quotation document for a project.
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (!canEditProjectValue(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Penyimpanan file belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di server).' }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
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

  await prisma.project.update({
    where: { id: params.id },
    data: { quotationFileUrl: pub.publicUrl, quotationFileName: file.name },
  })

  return NextResponse.json({ quotationFileUrl: pub.publicUrl, quotationFileName: file.name })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })
  if (!canEditProjectValue(session.user, project)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.project.update({
    where: { id: params.id },
    data: { quotationFileUrl: null, quotationFileName: null },
  })

  return NextResponse.json({ ok: true })
}
