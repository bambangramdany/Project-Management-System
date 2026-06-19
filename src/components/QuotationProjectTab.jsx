'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

const STATUS_META = {
  DRAFT:            { label: 'Draft',             color: 'bg-gray-100 text-gray-600' },
  PENDING_WULAN:    { label: 'Menunggu Wulan',    color: 'bg-yellow-100 text-yellow-700' },
  PENDING_DIRECTOR: { label: 'Menunggu Direktur', color: 'bg-orange-100 text-orange-700' },
  APPROVED:         { label: 'Approved',           color: 'bg-blue-100 text-blue-700' },
  WON:              { label: 'Won ✓',             color: 'bg-green-100 text-green-700' },
  LOST:             { label: 'Lost',              color: 'bg-red-100 text-red-600' },
  CANCELLED:        { label: 'Cancelled',          color: 'bg-gray-100 text-gray-400' },
}

function calcTotals(q) {
  let base = 0, agencyBase = 0
  for (const sec of q.sections || []) {
    for (const item of sec.items || []) {
      base += item.subtotal || 0
      if (item.includeAgencyFee) agencyBase += item.subtotal || 0
    }
  }
  const agencyFeeAmt = agencyBase * ((q.agencyFeePercent || 0) / 100)
  const ppn = q.includesPpn ? (base + agencyFeeAmt) * ((q.ppnPercent || 11) / 100) : 0
  return { base, agencyFeeAmt, ppn, grand: base + agencyFeeAmt + ppn }
}

export default function QuotationProjectTab({ project, session, onProjectUpdated }) {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [allQuotations, setAllQuotations]   = useState([])  // for link picker
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [linkSearch, setLinkSearch]         = useState('')
  const [linking, setLinking]               = useState(false)

  const canManage = ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(session?.user?.role)
  const canApprove = ['OWNER', 'DIRECTOR'].includes(session?.user?.role)

  const load = () => {
    setLoading(true)
    fetch(`/api/quotations?projectId=${project.id}`)
      .then(r => r.json())
      .then(d => {
        // Filter only quotations linked to this project
        setQuotations((d.quotations || []).filter(q => q.projectId === project.id))
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [project.id])

  // Fetch all WON/APPROVED quotations for linking
  function openLinkPicker() {
    setShowLinkPicker(true)
    fetch('/api/quotations?status=all')
      .then(r => r.json())
      .then(d => {
        const linkable = (d.quotations || []).filter(q =>
          ['WON', 'APPROVED', 'DRAFT', 'PENDING_WULAN', 'PENDING_DIRECTOR'].includes(q.status)
          && q.projectId == null
        )
        setAllQuotations(linkable)
      })
  }

  async function linkQuotation(quotationId) {
    setLinking(true)
    const res = await fetch(`/api/quotations/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id }),
    })
    setLinking(false)
    if (res.ok) {
      setShowLinkPicker(false)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menghubungkan')
    }
  }

  async function approveAction(quotationId, action) {
    const res = await fetch(`/api/quotations/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) load()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal')
    }
  }

  async function markWon(quotationId) {
    const res = await fetch(`/api/quotations/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_won', projectId: project.id }),
    })
    if (res.ok) load()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal')
    }
  }

  async function markLost(quotationId) {
    if (!confirm('Tandai quotation ini sebagai Lost?')) return
    const res = await fetch(`/api/quotations/${quotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_lost' }),
    })
    if (res.ok) load()
    else alert('Gagal')
  }

  async function syncToForecast(quotationId, mode = 'replace') {
    setSyncing(true)
    setSyncResult(null)
    const res = await fetch(`/api/projects/${project.id}/budget-from-quotation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotationId, mode }),
    })
    const d = await res.json().catch(() => ({}))
    setSyncing(false)
    if (res.ok) {
      setSyncResult({ ok: true, created: d.created, grandTotal: d.grandTotal })
      onProjectUpdated?.()
    } else {
      setSyncResult({ ok: false, error: d.error })
    }
  }

  const filtered = allQuotations.filter(q =>
    linkSearch === '' ||
    q.clientName.toLowerCase().includes(linkSearch.toLowerCase()) ||
    q.eventName.toLowerCase().includes(linkSearch.toLowerCase()) ||
    q.quotationNumber.toLowerCase().includes(linkSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">

      {/* Actions bar */}
      {canManage && (
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={openLinkPicker}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            🔗 Hubungkan Quotation
          </button>
          <Link
            href={`/quotation/new?projectId=${project.id}`}
            className="btn-primary text-sm">
            + Buat Quotation Baru
          </Link>
        </div>
      )}

      {/* Link picker modal */}
      {showLinkPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-800">Hubungkan Quotation ke Project ini</h3>
              <button onClick={() => setShowLinkPicker(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4">
              <input className="input mb-3 text-sm" placeholder="Cari nama klien / event / nomor..."
                value={linkSearch} onChange={e => setLinkSearch(e.target.value)} />
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Tidak ada quotation yang bisa dihubungkan</p>
                )}
                {filtered.map(q => {
                  const st = STATUS_META[q.status] || STATUS_META.DRAFT
                  const totals = calcTotals(q)
                  return (
                    <div key={q.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{q.quotationNumber}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{q.eventName}</p>
                        <p className="text-xs text-gray-500">{q.clientName} · {fmt(totals.grand)}</p>
                      </div>
                      <button onClick={() => linkQuotation(q.id)} disabled={linking}
                        className="shrink-0 text-sm px-3 py-1 rounded-lg bg-brand text-white hover:bg-brand-600">
                        Pilih
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quotation list */}
      {loading && <div className="py-8 text-center text-sm text-gray-400">Memuat...</div>}

      {!loading && quotations.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-gray-400 text-sm">Belum ada quotation untuk project ini.</p>
          {canManage && (
            <p className="text-xs text-gray-400">
              Buat quotation baru atau hubungkan quotation yang sudah ada.
            </p>
          )}
        </div>
      )}

      {!loading && quotations.map(q => {
        const st     = STATUS_META[q.status] || STATUS_META.DRAFT
        const totals = calcTotals(q)

        return (
          <div key={q.id} className="card border-t-4 border-indigo-300 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-400">{q.quotationNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <h3 className="font-semibold text-gray-800 mt-0.5">{q.eventName}</h3>
                <p className="text-sm text-gray-500">{q.clientName}</p>
                {q.eventDate && <p className="text-xs text-gray-400 mt-0.5">{q.eventDate}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{fmt(totals.grand)}</p>
                {q.includesPpn && <p className="text-[11px] text-gray-400">incl. PPN {q.ppnPercent}%</p>}
                <Link href={`/quotation/${q.id}`} className="text-xs text-brand hover:underline mt-1 block">
                  Lihat Detail →
                </Link>
              </div>
            </div>

            {/* Summary sections */}
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {(q.sections || []).map(sec => {
                const secTotal = (sec.items || []).reduce((s, i) => s + (i.subtotal || 0), 0)
                return (
                  <div key={sec.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      <span className="font-semibold text-indigo-600 mr-1">{sec.letter}.</span>
                      {sec.name}
                      <span className="text-gray-400 text-xs ml-1">({(sec.items || []).length} item)</span>
                    </span>
                    <span className="font-medium text-gray-800">{fmt(secTotal)}</span>
                  </div>
                )
              })}
              {/* Totals */}
              <div className="px-5 py-2.5 bg-gray-50 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sub Total</span>
                  <span>{fmt(totals.base)}</span>
                </div>
                {q.agencyFeePercent > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Agency Fee ({q.agencyFeePercent}%)</span>
                    <span>{fmt(totals.agencyFeeAmt)}</span>
                  </div>
                )}
                {q.includesPpn && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>PPN {q.ppnPercent}%</span>
                    <span>{fmt(totals.ppn)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
                  <span>Grand Total</span>
                  <span className="text-brand">{fmt(totals.grand)}</span>
                </div>
              </div>
            </div>

            {/* Approval buttons */}
            <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-2 items-center">
              {q.status === 'DRAFT' && canManage && (
                <button onClick={() => approveAction(q.id, 'submit')}
                  className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                  Ajukan Approval →
                </button>
              )}
              {q.status === 'PENDING_WULAN' && canApprove && (
                <>
                  <button onClick={() => approveAction(q.id, 'revert_to_draft')}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    ↩ Kembalikan Draft
                  </button>
                  <button onClick={() => approveAction(q.id, 'approve_wulan')}
                    className="text-sm px-3 py-1.5 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700">
                    ✓ Approve (Wulan)
                  </button>
                </>
              )}
              {q.status === 'PENDING_DIRECTOR' && canApprove && (
                <>
                  <button onClick={() => approveAction(q.id, 'revert_to_draft')}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    ↩ Kembalikan Draft
                  </button>
                  <button onClick={() => approveAction(q.id, 'approve_director')}
                    className="text-sm px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700">
                    ✓ Approve Final (Direktur)
                  </button>
                </>
              )}
              {q.status === 'APPROVED' && canApprove && (
                <>
                  <button onClick={() => markLost(q.id)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    ✗ Lost
                  </button>
                  <button onClick={() => markWon(q.id)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                    🏆 Won
                  </button>
                </>
              )}

              {/* WON → Sync to Forecast */}
              {q.status === 'WON' && canManage && (
                <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const existing = confirm(
                          'Sinkronkan item quotation ke Forecast Budget?\n\n' +
                          '• Item yang sudah ada DAN belum ada payment request akan diganti.\n' +
                          '• Item yang sudah ada payment request tidak akan dihapus.\n\n' +
                          'Lanjutkan?'
                        )
                        if (existing) syncToForecast(q.id, 'replace')
                      }}
                      disabled={syncing}
                      className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                      {syncing ? 'Menyinkronkan...' : '↻ Sinkron ke Forecast Budget'}
                    </button>
                  </div>
                  {syncResult && (
                    <div className={`text-xs px-2 py-1 rounded ${syncResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {syncResult.ok
                        ? `✓ ${syncResult.created} item disinkronkan · Grand total ${fmt(syncResult.grandTotal)}`
                        : `✗ ${syncResult.error}`}
                    </div>
                  )}
                </div>
              )}

              {/* Signature info */}
              <div className="ml-auto text-xs text-gray-400 text-right">
                {q.picQuotation && <span>Prepared by: {q.picQuotation.name}</span>}
                {q.approver1 && <span className="ml-2">· {q.approver1.name}</span>}
                {q.approver2 && <span className="ml-1">· {q.approver2.name}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
