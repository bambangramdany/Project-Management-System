import { prisma } from '@/lib/prisma'

// Records an entry in the global audit log. Never throws — logging failures
// must not break the underlying operation.
export async function logAudit({ userId, action, entity, entityId, summary, meta }) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        summary,
        meta: meta || undefined,
      },
    })
  } catch (e) {
    console.error('logAudit failed', e)
    return null
  }
}
