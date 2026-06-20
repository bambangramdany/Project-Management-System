/**
 * GET    /api/vendors/:id/ratings              — list ratings for a vendor
 * POST   /api/vendors/:id/ratings              — add a rating (any authenticated user)
 * DELETE /api/vendors/:id/ratings?ratingId=xxx — delete a rating (creator or OWNER)
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ratings = await prisma.vendorRating.findMany({
    where: { vendorId: params.id },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const avg = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
    : null

  return NextResponse.json({ ratings, avg, count: ratings.length })
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const rating = parseInt(body.rating)
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating harus antara 1–5 bintang' }, { status: 400 })
  }

  const created = await prisma.vendorRating.create({
    data: {
      vendorId:    params.id,
      projectId:   body.projectId   || null,
      projectName: body.projectName || null,
      rating,
      review:    body.review?.trim()    || null,
      usageDate: body.usageDate ? new Date(body.usageDate) : null,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ratingId = searchParams.get('ratingId')
  if (!ratingId) return NextResponse.json({ error: 'ratingId required' }, { status: 400 })

  const existing = await prisma.vendorRating.findUnique({ where: { id: ratingId } })
  if (!existing || existing.vendorId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.createdById !== session.user.id && session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.vendorRating.delete({ where: { id: ratingId } })
  return NextResponse.json({ ok: true })
}
