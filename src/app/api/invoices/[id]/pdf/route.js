// src/app/api/invoices/[id]/pdf/route.js
// Returns a PDF for the given Invoice.
// GET /api/invoices/:id/pdf

import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import React                from 'react'
import { renderToBuffer }   from '@react-pdf/renderer'
import { InvoicePDF }       from '@/components/InvoicePDF'

export const runtime = 'nodejs'   // react-pdf cannot run in Edge runtime
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id } = params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      quotation: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              items: { orderBy: { order: 'asc' } },
            },
          },
          approver1: { select: { id: true, name: true, jobTitle: true } },
          approver2: { select: { id: true, name: true, jobTitle: true } },
        },
      },
      items: { orderBy: { order: 'asc' } },
    },
  })

  if (!invoice) return new Response('Invoice tidak ditemukan', { status: 404 })

  // Role check: only Finance, Director, Owner, PM can download
  const role = session.user.role
  const allowed = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PROJECT_MANAGER', 'PRODUCER']
  if (!allowed.includes(role)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Cari Direktur Keuangan (FINANCE_HRGA) untuk tanda tangan invoice
  const financeDirector = await prisma.user.findFirst({
    where: { role: 'DIRECTOR', divisi: 'FINANCE_HRGA', employeeStatus: 'ACTIVE' },
    select: { name: true, jobTitle: true },
  })

  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, { invoice, financeDirector })
    )

    const safeNumber = invoice.invoiceNumber.replace(/\//g, '-')
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
    console.error('[PDF] render error:', err)
    return new Response(
      JSON.stringify({ error: 'Gagal generate PDF', detail: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
