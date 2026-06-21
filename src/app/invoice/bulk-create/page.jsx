'use client'
import { useEffect, useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const ALLOWED = ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR']

const DIVISION_LABEL = { EVENT: 'EO', CREATIVE: 'Creative', PH: 'PH' }

// Mirror server logic — generates the default invoice number from quotation number
function buildInvoiceNumber(quotationNumber) {
  // WTM/EVENT/QUOT/2025/177 → WTM/EVENT/INV/2025/177/001
  // Handle both QUOT and QU0T (zero typo) just in case
  const base = quotationNumber.replace(/\/QUOT\//i, '/INV/').replace(/\/QU0T\//i, '/INV/')
  return `${base}/001`
}

function fmt(n) {
  const v = Math.round(n || 0)
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000_000)     return `Rp ${Math.round(abs / 1_000_000)} jt`
  return `Rp ${abs.toLocaleString('id-ID')}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function defaultDue() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export default function BulkCreateInvoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [quotations, setQuotations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [result, setResult]         = useState(null)   // { created, failed }

  // Per-row state: { [quotationId]: { checked, issueDate, dueDate, status, poNumber } }
  const [rows, setRows] = useState({})

  // Global defaults
  const [globalIssueDate, setGlobalIssueDate] = useState(todayStr())
  const [globalDueDate,   setGlobalDueDate]   = useState(defaultDue())
  const [globalStatus,    setGlobalStatus]    = useState('ISSUED')

  // Filter
  const [filterDiv, setFilterDiv] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!ALLOWED.includes(session?.user?.role)) { router.push('/invoice'); return }

    fetch('/api/quotations/without-invoice')
      .then(r => r.json())
      .then(d => {
        const qs = d.quotations || []
        setQuotations(qs)
        // Init row state
        const init = {}
        qs.forEach(q => {
          init[q.id] = {
            checked: true,
            invoiceNumber: buildInvoiceNumber(q.quotationNumber),
            issueDate: todayStr(),
            dueDate: defaultDue(),
            status: 'ISSUED',
            poNumber: '',
          }
        })
        setRows(init)
        setLoading(false)
      })
  }, [status, session, router])

  const displayed = useMemo(() =>
    filterDiv ? quotations.filter(q => q.division === filterDiv) : quotations,
    [quotations, filterDiv]
  )

  const selectedIds  = Object.entries(rows).filter(([, r]) => r.checked).map(([id]) => id)
  const selectedQs   = quotations.filter(q => selectedIds.includes(q.id))
  const totalSelected = selectedQs.reduce((s, q) => s + (q.totalAmount || 0), 0)

  const allChecked = displayed.length > 0 && displayed.every(q => rows[q.id]?.checked)

  function toggleAll(v) {
    setRows(prev => {
      const next = { ...prev }
      displayed.forEach(q => { if (next[q.id]) next[q.id] = { ...next[q.id], checked: v } })
      return next
    })
  }

  function setRow(id, patch) {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  function applyGlobal() {
    setRows(prev => {
      const next = { ...prev }
      displayed.filter(q => next[q.id]?.checked).forEach(q => {
        next[q.id] = { ...next[q.id], issueDate: globalIssueDate, dueDate: globalDueDate, status: globalStatus }
      })
      return next
    })
  }

  async function handleCreate() {
    if (selectedIds.length === 0) { alert('Pilih minimal 1 quotation'); return }

    setCreating(true)
    const payload = selectedIds.map(id => {
      const r = rows[id]
      return {
        quotationId:   id,
        invoiceNumber: r.invoiceNumber?.trim() || null,  // null = auto-generate server-side
        issueDate:     r.issueDate  || null,
        dueDate:       r.dueDate    || null,
        status:        r.status,
        poNumber:      r.poNumber   || null,
      }
    })

    const res = await fetch('/api/invoices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices: payload }),
    })
    const data = await res.json()
    setCreating(false)
    setResult(data)

    // Remove created quotations from list
    if (data.created > 0) {
      const failedIds = new Set((data.failed || []).map(f => f.quotationId))
      const removedIds = new Set(selectedIds.filter(id => !failedIds.has(id)))
      setQuotations(prev => prev.filter(q => !removedIds.has(q.id)))
      setRows(prev => {
        const next = { ...prev }
        removedIds.forEach(id => delete next[id])
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/invoice" className="text-xs text-gray-400 hover:text-gray-600">← Kembali ke Invoice</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Generate Invoice Massal</h1>
            <p className="text-xs text-gray-500">Buat invoice dari semua quotation WON yang belum memiliki invoice</p>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
            result.failed?.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
          }`}>
            <span className="text-2xl">{result.failed?.length > 0 ? '⚠️' : '✅'}</span>
            <div>
              <p className="font-semibold text-gray-800">{result.created} invoice berhasil dibuat</p>
              {result.failed?.length > 0 && (
                <>
                  <p className="text-red-600 mt-0.5">{result.failed.length} gagal:</p>
                  <ul className="mt-1 space-y-0.5">
                    {result.failed.map((f, i) => (
                      <li key={i} className="text-red-500 text-xs">• {f.quotationId}: {f.error}</li>
                    ))}
                  </ul>
                </>
              )}
              {result.created > 0 && (
                <Link href="/invoice" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                  Lihat semua invoice →
                </Link>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-gray-400 text-sm">Memuat daftar quotation...</div>
        ) : quotations.length === 0 ? (
          <div className="card py-16 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-700 font-medium">Semua quotation WON sudah memiliki invoice!</p>
            <Link href="/invoice" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Lihat semua invoice →</Link>
          </div>
        ) : (
          <>
            {/* Global settings */}
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">⚡ Atur Semua Sekaligus</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tgl Invoice</label>
                  <input type="date" value={globalIssueDate} onChange={e => setGlobalIssueDate(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Jatuh Tempo</label>
                  <input type="date" value={globalDueDate} onChange={e => setGlobalDueDate(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select value={globalStatus} onChange={e => setGlobalStatus(e.target.value)}
                    className="border rounded-lg px-3 py-1.5 text-sm">
                    <option value="DRAFT">Draft</option>
                    <option value="ISSUED">Issued (Terbit)</option>
                    <option value="PAID">Paid (Lunas)</option>
                  </select>
                </div>
                <button onClick={applyGlobal}
                  className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  Terapkan ke Semua yang Dipilih
                </button>
                {/* Division filter */}
                <div className="flex gap-2 flex-wrap">
                  <label className="text-xs text-gray-500 self-center">Filter:</label>
                  {['', 'EVENT', 'CREATIVE', 'PH'].map(d => (
                    <button key={d} onClick={() => setFilterDiv(d)}
                      className={`text-xs px-2.5 py-1 rounded-full border ${filterDiv === d ? 'bg-brand text-white border-brand' : 'border-gray-200 hover:bg-gray-50'}`}>
                      {d || 'Semua'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="text-xs text-gray-500 bg-gray-50 border-b">
                      <th className="px-4 py-3 w-8">
                        <input type="checkbox" checked={allChecked} onChange={e => toggleAll(e.target.checked)} className="rounded" />
                      </th>
                      <th className="px-4 py-3 text-left">No. Quotation</th>
                      <th className="px-4 py-3 text-left">No. Invoice <span className="font-normal text-gray-400">(bisa diubah)</span></th>
                      <th className="px-4 py-3 text-left">Klien</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Event</th>
                      <th className="px-4 py-3 text-center hidden sm:table-cell">Div</th>
                      <th className="px-4 py-3 text-right">Total Invoice</th>
                      <th className="px-4 py-3 text-center">Tgl Invoice</th>
                      <th className="px-4 py-3 text-center">Jatuh Tempo</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayed.map(q => {
                      const row = rows[q.id] || {}
                      return (
                        <tr key={q.id} className={`hover:bg-gray-50 transition-colors ${!row.checked ? 'opacity-40' : ''}`}>
                          <td className="px-4 py-2.5 text-center">
                            <input type="checkbox" checked={!!row.checked}
                              onChange={e => setRow(q.id, { checked: e.target.checked })} className="rounded" />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">{q.quotationNumber}</td>
                          <td className="px-4 py-2.5">
                            <input
                              value={row.invoiceNumber || ''}
                              onChange={e => setRow(q.id, { invoiceNumber: e.target.value })}
                              disabled={!row.checked}
                              placeholder="No. Invoice"
                              className="border rounded px-2 py-1 text-xs font-mono w-52 disabled:bg-gray-50 disabled:text-gray-400 focus:border-indigo-400 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[160px] truncate" title={q.clientName}>{q.clientName}</td>
                          <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate hidden md:table-cell" title={q.eventName}>{q.eventName}</td>
                          <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {DIVISION_LABEL[q.division] || q.division}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-800 whitespace-nowrap">{fmt(q.totalAmount)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="date" value={row.issueDate || ''}
                              onChange={e => setRow(q.id, { issueDate: e.target.value })}
                              disabled={!row.checked}
                              className="border rounded px-2 py-1 text-xs w-32 disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="date" value={row.dueDate || ''}
                              onChange={e => setRow(q.id, { dueDate: e.target.value })}
                              disabled={!row.checked}
                              className="border rounded px-2 py-1 text-xs w-32 disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <select value={row.status || 'ISSUED'}
                              onChange={e => setRow(q.id, { status: e.target.value })}
                              disabled={!row.checked}
                              className="border rounded px-2 py-1 text-xs disabled:bg-gray-50 disabled:text-gray-400">
                              <option value="DRAFT">Draft</option>
                              <option value="ISSUED">Issued</option>
                              <option value="PAID">Paid</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer action bar */}
            <div className="sticky bottom-4 z-10">
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedIds.length} quotation dipilih
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    Total: <span className="font-semibold text-indigo-600">{fmt(totalSelected)}</span>
                  </span>
                </div>
                <div className="flex gap-3">
                  <Link href="/invoice" className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
                    Batal
                  </Link>
                  <button
                    onClick={handleCreate}
                    disabled={creating || selectedIds.length === 0}
                    className="px-6 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {creating
                      ? `Membuat ${selectedIds.length} invoice...`
                      : `⚡ Generate ${selectedIds.length} Invoice`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
