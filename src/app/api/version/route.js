import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({ v: 'nov02-b', ts: Date.now() })
}
