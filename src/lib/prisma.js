import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Cache in both dev and production so warm Vercel instances reuse the connection
globalForPrisma.prisma = prisma
