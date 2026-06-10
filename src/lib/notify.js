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
