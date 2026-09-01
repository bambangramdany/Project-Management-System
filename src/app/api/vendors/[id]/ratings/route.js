/**
 * GET    /api/vendors/:id/ratings              — list ratings for a vendor
 * POST   /api/vendors/:id/ratings              — add a rating (any authenticated user)
 * DELETE /api/vendors/:id/ratings?ratingId=xxx — delete a rating (creator or OWNER)
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeScorecardAvg, SCORECARD_DIMENSIONS } from '@/lib/constants'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function calcWeightedRating(dims) {
  let total = 0, weightSum = 0
  for (const d of SCORECARD_DIMENSIONS) {
    const val = dims[d.key]
    if (val != null) { total += val * d.weight; weightSum += d.weight }
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 3
}

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

  // Compute per-dimension averages
  const dimAvgs = {}
  for (const d of SCORECARD_DIMENSIONS) {
    const vals = ratings.map(r => r[d.key]).filter(v => v != null)
    dimAvgs[d.key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
  }

  return NextResponse.json({ ratings, avg, count: ratings.length, dimAvgs })
}

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Support both scorecard mode and legacy single-rating mode
  const dims = {
    ratingQuality:       body.ratingQuality       != null ? parseInt(body.ratingQuality)       : null,
    ratingTimeliness:    body.ratingTimeliness     != null ? parseInt(body.ratingTimeliness)    : null,
    ratingCommunication: body.ratingCommunication  != null ? parseInt(body.ratingCommunication) : null,
    ratingValue:         body.ratingValue          != null ? parseInt(body.ratingValue)         : null,
    ratingFlexibility:   body.ratingFlexibility    != null ? parseInt(body.ratingFlexibility)   : null,
  }

  // Validate each dimension in range 1-5 if provided
  for (const [key, val] of Object.entries(dims)) {
    if (val != null && (val < 1 || val > 5)) {
      return NextResponse.json({ error: `${key} harus antara 1–5` }, { status: 400 })
    }
  }

  const hasScorecard = Object.values(dims).some(v => v != null)
  let overallRating = body.rating ? parseInt(body.rating) : null

  if (hasScorecard) {
    overallRating = calcWeightedRating(dims)
  } else if (!overallRating || overallRating < 1 || overallRating > 5) {
    return NextResponse.json({ error: 'Isi minimal satu dimensi penilaian (1–5)' }, { status: 400 })
  }

  const created = await prisma.vendorRating.create({
    data: {
      vendorId:    params.id,
      projectId:   body.projectId   || null,
      projectName: body.projectName || null,
      ...dims,
      rating: overallRating,
      review:    body.review?.trim()    || null,
      usageDate: body.usageDate ? new Date(body.usageDate) : null,
      createdById: session.user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  // Recompute vendor scorecardAvg and totalProjectsUsed
  const allRatings = await prisma.vendorRating.findMany({ where: { vendorId: params.id } })
  const scorecardAvg = allRatings.length > 0
    ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
    : null
  const totalProjectsUsed = allRatings.length

  await prisma.vendor.update({
    where: { id: params.id },
    data: {
      scorecardAvg: scorecardAvg != null ? Math.round(scorecardAvg * 10) / 10 : null,
      totalProjectsUsed,
      lastUsedDate: created.usageDate ?? created.createdAt,
    },
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

  // Recompute after delete
  const allRatings = await prisma.vendorRating.findMany({ where: { vendorId: params.id } })
  const scorecardAvg = allRatings.length > 0
    ? allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
    : null

  await prisma.vendor.update({
    where: { id: params.id },
    data: {
      scorecardAvg: scorecardAvg != null ? Math.round(scorecardAvg * 10) / 10 : null,
      totalProjectsUsed: allRatings.length,
    },
  })

  return NextResponse.json({ ok: true })
}
