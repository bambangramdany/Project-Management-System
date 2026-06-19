// src/app/api/quotations/[id]/pdf/route.js
// GET /api/quotations/:id/pdf  →  returns PDF buffer

import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import React                from 'react'
import { renderToBuffer }   from '@react-pdf/renderer'
import { QuotationPDF }     from '@/components/QuotationPDF'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = params

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { items: { orderBy: { order: 'asc' } } },
      },
      picQuotation: { select: { id: true, name: true, jobTitle: true } },
      createdBy:    { select: { id: true, name: true, jobTitle: true } },
      approver1:    { select: { id: true, name: true, jobTitle: true } },
      approver2:    { select: { id: true, name: true, jobTitle: true } },
    },
  })

  if (!quotation) return new Response('Quotation tidak ditemukan', { status: 404 })

  const role = session.user.role
  const allowed = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER', 'PRODUCER']
  if (!allowed.includes(role)) return new Response('Forbidden', { status: 403 })

  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(QuotationPDF, { quotation })
    )

    const safeNumber = quotation.quotationNumber.replace(/\//g, '-')
    const filename   = `${safeNumber}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length':      String(pdfBuffer.byteLength),
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[QuotationPDF] render error:', err)
    return new Response(
      JSON.stringify({ error: 'Gagal generate PDF', detail: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
