import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BUCKET = 'quotations'
const ALLOWED_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER']
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ALLOWED_ROLES.includes(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const supabase = getSupabase()
  if (!supabase)
    return NextResponse.json({ error: 'Penyimpanan file belum dikonfigurasi.' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: 'Hanya file PDF atau Excel yang diperbolehkan' }, { status: 400 })

  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: 'Ukuran file maksimal 10 MB' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `quotation-files/${params.id}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Hapus file lama dari storage jika ada
  if (project.quotationFileUrl) {
    const oldPath = project.quotationFileUrl.split(`${BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  })
  if (uploadError)
    return NextResponse.json({ error: `Gagal upload: ${uploadError.message}` }, { status: 500 })

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
  if (!ALLOWED_ROLES.includes(session.user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 })

  const supabase = getSupabase()
  if (supabase && project.quotationFileUrl) {
    const oldPath = project.quotationFileUrl.split(`${BUCKET}/`)[1]
    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  }

  await prisma.project.update({
    where: { id: params.id },
    data: { quotationFileUrl: null, quotationFileName: null },
  })

  return NextResponse.json({ ok: true })
}
