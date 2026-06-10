import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canSubmitDirectorNote, canViewDirectorNoteAuthors, canViewAllScores } from '@/lib/rbac'
import { NextResponse } from 'next/server'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const directorId = searchParams.get('directorId')

  let where = {}
  if (canViewAllScores(session.user)) {
    // Owner / HR sees everything (optionally filtered to one director)
    if (directorId) where.directorId = directorId
  } else if (session.user.role === 'DIRECTOR') {
    // A director only sees notes addressed to them, anonymized
    where.directorId = session.user.id
  } else {
    return NextResponse.json([])
  }

  const notes = await prisma.directorNote.findMany({
    where,
    include: {
      director: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, jobTitle: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const showAuthor = canViewDirectorNoteAuthors(session.user)
  const result = notes.map(n => ({
    id: n.id,
    directorId: n.directorId,
    director: n.director,
    message: n.message,
    createdAt: n.createdAt,
    author: showAuthor ? n.author : null,
  }))

  return NextResponse.json(result)
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canSubmitDirectorNote(session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() // { directorId, message }
  if (!body.directorId || !body.message?.trim()) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const director = await prisma.user.findUnique({ where: { id: body.directorId } })
  if (!director || director.role !== 'DIRECTOR') {
    return NextResponse.json({ error: 'Direktur tidak ditemukan' }, { status: 404 })
  }

  const note = await prisma.directorNote.create({
    data: {
      directorId: body.directorId,
      authorId: session.user.id,
      message: body.message.trim(),
    },
  })

  return NextResponse.json({ id: note.id }, { status: 201 })
}
