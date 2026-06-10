import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOwnerApprovalThreshold, setOwnerApprovalThreshold } from '@/lib/settings'
import { logAudit } from '@/lib/audit'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const threshold = await getOwnerApprovalThreshold()
  return NextResponse.json({ threshold, canEdit: session.user.role === 'OWNER' })
}

export async function PUT(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const value = parseFloat(body.threshold)
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: 'Nilai tidak valid' }, { status: 400 })
  }

  await setOwnerApprovalThreshold(value)
  await logAudit({
    userId: session.user.id, action: 'SETTING_UPDATE', entity: 'AppSetting', entityId: 'owner_approval_threshold',
    summary: `${session.user.name} mengubah batas approval Direktur Utama menjadi Rp ${Math.round(value).toLocaleString('id-ID')}`,
  })

  return NextResponse.json({ threshold: value })
}
