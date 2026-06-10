import { prisma } from '@/lib/prisma'

// Default Rupiah threshold: payment requests submitted by a division director
// at or below this amount skip the Owner approval stage and go straight to
// the Finance Director (Anung) — who must approve all expenses regardless.
export const DEFAULT_OWNER_APPROVAL_THRESHOLD = 5_000_000

const OWNER_THRESHOLD_KEY = 'owner_approval_threshold'

export async function getOwnerApprovalThreshold() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: OWNER_THRESHOLD_KEY } })
    if (!row) return DEFAULT_OWNER_APPROVAL_THRESHOLD
    const val = parseFloat(row.value)
    return Number.isFinite(val) ? val : DEFAULT_OWNER_APPROVAL_THRESHOLD
  } catch (e) {
    console.error('getOwnerApprovalThreshold failed', e)
    return DEFAULT_OWNER_APPROVAL_THRESHOLD
  }
}

export async function setOwnerApprovalThreshold(value) {
  return prisma.appSetting.upsert({
    where: { key: OWNER_THRESHOLD_KEY },
    update: { value: String(value) },
    create: { key: OWNER_THRESHOLD_KEY, value: String(value) },
  })
}

export { OWNER_THRESHOLD_KEY }
