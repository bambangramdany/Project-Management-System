import { prisma } from '@/lib/prisma'

export async function notifyUser({ userId, type, title, message, link }) {
  if (!userId) return null
  try {
    return await prisma.notification.create({
      data: { userId, type, title, message: message || null, link: link || null },
    })
  } catch (e) {
    console.error('notifyUser failed', e)
    return null
  }
}

// Send a notification to leadership: Owner(s), the Finance & HRGA Director
// (Anung — overall HR oversight), and the division director of `division`
// (if any). Used so performance-review summaries (KPI & per-project scores)
// reach the people responsible for follow-up, without the evaluator having
// to forward anything manually.
export async function notifyManagement({ excludeUserId, division, type, title, message, link }) {
  const recipients = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'OWNER' },
        { role: 'DIRECTOR', divisi: 'FINANCE_HRGA' },
        ...(division ? [{ role: 'DIRECTOR', divisi: division }] : []),
      ],
    },
    select: { id: true },
  })
  const ids = new Set(recipients.map(r => r.id))
  if (excludeUserId) ids.delete(excludeUserId)
  await Promise.all([...ids].map(userId => notifyUser({ userId, type, title, message, link })))
}
