import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// In serverless (Vercel), limit to 1 connection per instance so pgbouncer
// transaction-mode pool isn't exhausted by parallel queries from many instances.
function makePrismaClient() {
  const base = process.env.DATABASE_URL || ''
  let url = base
  if (base && !base.includes('connection_limit=')) {
    url = base + (base.includes('?') ? '&' : '?') + 'connection_limit=1&pool_timeout=20'
  }
  return new PrismaClient({
    datasources: { db: { url } },
  })
}

export const prisma = globalForPrisma.prisma ?? makePrismaClient()

// Cache in both dev and production so warm Vercel instances reuse the connection
globalForPrisma.prisma = prisma
