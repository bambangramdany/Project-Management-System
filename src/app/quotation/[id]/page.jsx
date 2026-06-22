'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import QuotationForm from '@/components/QuotationForm'
import CreateInvoiceModal from '@/components/CreateInvoiceModal'
import PDFPreviewModal from '@/components/PDFPreviewModal'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

const STATUS_META = {
  DRAFT:            { label: 'Draft',             color: 'bg-gray-100 text-gray-600', next: 'submit' },
  PENDING_WULAN:    { label: 'Menunggu Wulan',    color: 'bg-yellow-100 text-yellow-700' },
  PENDING_DIRECTOR: { label: 'Menunggu Direktur', color: 'bg-orange-100 text-orange-700' },
  APPROVED:         { label: 'Approved ✓',        color: 'bg-blue-100 text-blue-700' },
  WON:              { label: 'Won ✓',             color: 'bg-green-100 text-green-700' },
  LOST:             { label: 'Lost',              color: 'bg-red-100 text-red-600' },
  CANCELLED:        { label: 'Cancelled',          color: 'bg-gray-100 text-gray-400' },
}

function canManage(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user?.role)
}
// Approve tahap Wulan: hanya OWNER atau Finance/HRGA Director (Wulan)
function canApproveWulan(user) {
  return user?.role === 'OWNER'
    || (user?.role === 'DIRECTOR' && user?.divisi === 'FINANCE_HRGA')
}
// Approve tahap Direktur: OWNER atau semua DIRECTOR
function canApproveDirector(user) {
  return ['OWNER', 'DIRECTOR'].includes(user?.role)
}

function calcTotals(q) {
  let base = 0, agencyBase = 0, hppTotal = 0, hppFilled = 0, itemCount = 0
  for (const sec of q.sections || []) {
    for (const item of sec.items || []) {
      base += item.subtotal || 0
      if (item.includeAgencyFee) agencyBase += item.subtotal || 0
      if (item.rate !== null) {
        itemCount++
        if (item.hppSubtotal != null) { hppTotal += item.hppSubtotal; hppFilled++ }
      }
    }
  }
  const agencyFeeAmt = agencyBase * ((q.agencyFeePercent || 0) / 100)
  const ppn = q.includesPpn ? (base + agencyFeeAmt) * ((q.ppnPercent || 11) / 100) : 0
  const grand = base + agencyFeeAmt + ppn
  const grossMargin = hppFilled > 0 ? grand - hppTotal : null
  const marginPct   = grossMargin != null && grand > 0 ? (grossMargin / grand) * 100 : null
  return { base, agencyFeeAmt, ppn, grand, hppTotal, hppFilled, itemCount, grossMargin, marginPct }
}

export default function QuotationDetailPage() {
  const { data: session, status } = useSession()
  const { id } = useParams()
  const router = useRouter()

  const [q, setQ]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [acting,  setActing]  = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPreview,      setShowPreview]      = useState(false)
  const [editingSig,       setEditingSig]       = useState(false)
  const [sigForm,          setSigForm]          = useState({})
  const [users,            setUsers]            = useState([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status])

  const load = () => {
    setLoading(true)
    fetch(`/api/quotations/${id}`).then(r => r.json()).then(d => {
      setQ(d)
      setLoading(false)
    })
  }

  useEffect(() => { if (id && status === 'authenticated') load() }, [id, status])
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/team').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : (d.users || [])))
    }
  }, [status])

  async function saveSig() {
    setActing(true)
    const res = await fetch(`/api/quotations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_sig', ...sigForm }),
    })
    setActing(false)
    if (res.ok) { setEditingSig(false); load() }
    else { const d = await res.json().catch(()=>({})); alert(d.error || 'Gagal') }
  }

  async function action(actionName, extra = {}) {
    setActing(true)
    const res = await fetch(`/api/quotations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionName, ...extra }),
    })
    setActing(false)
    if (res.ok) load()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal')
    }
  }

  async function deleteQ() {
    if (!confirm('Hapus quotation ini?')) return
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/quotation')
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menghapus')
    }
  }

  if (loading || status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Memuat...</div>
      </div>
    )
  }

  if (!q || q.error) {
    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">
          Quotation tidak ditemukan. <Link href="/quotation" className="text-brand underline">Kembali</Link>
        </div>
      </div>
    )
  }

  if (editing && q.status === 'DRAFT') {
    return (
      <QuotationForm
        initial={q}
        onSaved={() => { setEditing(false); load() }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const st = STATUS_META[q.status] || STATUS_META.DRAFT
  const totals = calcTotals(q)
  const user = session?.user
  const canSeeHpp = ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF'].includes(user?.role)

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link href="/quotation" className="text-gray-400 hover:text-gray-600 mt-1">←</Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-gray-500">{q.quotationNumber}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{q.division === 'PH' ? 'PH' : 'EO'}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">{q.eventName}</h1>
              <p className="text-sm text-gray-600">{q.clientName}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {/* PDF actions — always visible */}
            <button
              onClick={() => setShowPreview(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              👁 Preview PDF
            </button>
            <a
              href={`/api/quotations/${q.id}/pdf`}
              download
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              ⬇ Download PDF
            </a>

            {q.status === 'DRAFT' && canManage(user) && (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm">✏ Edit</button>
                <button onClick={() => action('submit')} disabled={acting} className="btn-primary text-sm">
                  Ajukan Approval →
                </button>
              </>
            )}
            {q.status === 'PENDING_WULAN' && canApproveWulan(user) && (
              <>
                <button onClick={() => action('revert_to_draft')} disabled={acting} className="btn-secondary text-sm">↩ Kembalikan ke Draft</button>
                <button onClick={() => action('approve_wulan')} disabled={acting} className="btn-primary text-sm">✓ Approve (Wulan)</button>
              </>
            )}
            {q.status === 'PENDING_DIRECTOR' && canApproveDirector(user) && (
              <>
                <button onClick={() => action('revert_to_draft')} disabled={acting} className="btn-secondary text-sm">↩ Kembalikan ke Draft</button>
                <button onClick={() => action('approve_director')} disabled={acting} className="btn-primary text-sm">✓ Approve Final (Direktur)</button>
              </>
            )}
            {q.status === 'APPROVED' && canApproveDirector(user) && (
              <>
                <button onClick={() => action('mark_lost')} disabled={acting} className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                  ✗ Lost
                </button>
                <button onClick={() => action('mark_won')} disabled={acting} className="btn-primary text-sm bg-green-600 hover:bg-green-700">
                  🏆 Won
                </button>
              </>
            )}
            {q.status === 'WON' && (canManage(user) || ['FINANCE','FINANCE_STAFF'].includes(user?.role)) && (
              <button onClick={() => setShowInvoiceModal(true)}
                className="btn-primary text-sm bg-emerald-600 hover:bg-emerald-700">
                📄 Buat Invoice
              </button>
            )}
            {['DRAFT', 'LOST', 'CANCELLED'].includes(q.status) && canManage(user) && (
              <button onClick={deleteQ} className="text-xs text-red-400 hover:text-red-600 ml-2">Hapus</button>
            )}
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-4 space-y-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Info Event</p>
            {q.eventDate && <div className="text-sm"><span className="text-gray-500">Tanggal:</span> <span className="font-medium">{q.eventDate}</span></div>}
            {q.venue     && <div className="text-sm"><span className="text-gray-500">Venue:</span> <span className="font-medium">{q.venue}</span></div>}
            {q.location  && <div className="text-sm"><span className="text-gray-500">Lokasi:</span> <span className="font-medium">{q.location}</span></div>}
          </div>
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Tanda Tangan Dokumen</p>
              {canManage(user) && !editingSig && (
                <button onClick={() => {
                  setSigForm({
                    picQuotationId: q.picQuotationId || '',
                    approver1Id:    q.approver1Id    || '',
                    approver2Id:    q.approver2Id    || '',
                  })
                  setEditingSig(true)
                }} className="text-xs text-brand hover:underline">✏ Edit</button>
              )}
              {editingSig && (
                <div className="flex gap-2">
                  <button onClick={saveSig} disabled={acting} className="text-xs text-white bg-brand px-2 py-0.5 rounded hover:opacity-90">Simpan</button>
                  <button onClick={() => setEditingSig(false)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
                </div>
              )}
            </div>

            {editingSig ? (
              <div className="space-y-2 pt-1">
                {[
                  { label: 'Prepared by', key: 'picQuotationId' },
                  { label: 'Approved by #1', key: 'approver1Id' },
                  { label: 'Approved by #2', key: 'approver2Id' },
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{label}:</span>
                    <select
                      className="select text-xs py-1 flex-1"
                      value={sigForm[key] || ''}
                      onChange={e => setSigForm(f => ({ ...f, [key]: e.target.value }))}
                    >
                      <option value="">— tidak diisi —</option>
                      {users.filter(u => ['OWNER','DIRECTOR','PROJECT_MANAGER','PRODUCER','FINANCE','FINANCE_STAFF'].includes(u.role)).map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {q.picQuotation && <div className="text-sm"><span className="text-gray-500">Prepared by:</span> <span className="font-medium">{q.picQuotation.name}</span></div>}
                {q.approver1    && <div className="text-sm"><span className="text-gray-500">Approved by #1:</span> <span className="font-medium">{q.approver1.name}</span></div>}
                {q.approver2    && <div className="text-sm"><span className="text-gray-500">Approved by #2:</span> <span className="font-medium">{q.approver2.name}</span></div>}
                {!q.picQuotation && !q.approver1 && !q.approver2 && (
                  <p className="text-xs text-amber-500">Belum diisi — klik Edit untuk menentukan siapa yang prepared dan approve.</p>
                )}
              </>
            )}
            <div className="text-xs text-gray-400 pt-1">Dibuat oleh {q.createdBy?.name}</div>
          </div>
        </div>

        {/* Budget sections */}
        <div className="card divide-y divide-gray-100">
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Rincian Budget</p>
          </div>
          {(q.sections || []).map(sec => (
            <div key={sec.id}>
              {/* Section header */}
              <div className="px-5 py-2.5 bg-indigo-50/50">
                <span className="text-sm font-bold text-indigo-700">{sec.letter}. {sec.name}</span>
              </div>
              {/* Items */}
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-gray-400 border-b border-gray-100">
                        <th className="px-5 py-2 text-left w-6">#</th>
                        <th className="px-2 py-2 text-left">Item</th>
                        <th className="px-2 py-2 text-right w-28 hidden md:table-cell">Rate</th>
                        <th className="px-2 py-2 text-center w-20">Unit</th>
                        <th className="px-2 py-2 text-center w-14">Qty</th>
                        <th className="px-2 py-2 text-center w-14 hidden md:table-cell">Days</th>
                        <th className="px-5 py-2 text-right w-36">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sec.items || []).map(item => (
                        <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-5 py-2 text-gray-400 align-top">{item.no}</td>
                          <td className="px-2 py-2 align-top">
                            <p className="font-medium text-gray-800">{item.description}</p>
                            {item.detailText && (
                              <p className="text-xs text-gray-400 whitespace-pre-line mt-0.5">{item.detailText}</p>
                            )}
                            <div className="flex gap-2 mt-0.5">
                              {item.includeAgencyFee && q.agencyFeePercent > 0 && (
                                <span className="text-[10px] text-purple-500">AF</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right text-gray-700 align-top hidden md:table-cell">
                            {item.rate == null ? <span className="text-amber-600 font-medium text-xs">by client</span> : fmt(item.rate)}
                          </td>
                          <td className="px-2 py-2 text-center text-gray-500 align-top">{item.unitType}</td>
                          <td className="px-2 py-2 text-center text-gray-700 align-top">{item.qty}</td>
                          <td className="px-2 py-2 text-center text-gray-700 align-top hidden md:table-cell">{item.days}</td>
                          <td className="px-5 py-2 text-right font-medium text-gray-800 align-top">
                            {item.rate == null ? '—' : fmt(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div className="px-5 py-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sub Total</span>
              <span className="font-medium">{fmt(totals.base)}</span>
            </div>
            {q.agencyFeePercent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Agency Fee ({q.agencyFeePercent}%)</span>
                <span>{fmt(totals.agencyFeeAmt)}</span>
              </div>
            )}
            {q.includesPpn && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">PPN {q.ppnPercent}%</span>
                <span>{fmt(totals.ppn)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
              <span>Grand Total</span>
              <span className="text-brand">{fmt(totals.grand)}</span>
            </div>
            {q.dpPercent && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Termin DP ({q.dpPercent}%)</span>
                <span>{fmt(totals.grand * q.dpPercent / 100)}</span>
              </div>
            )}
          </div>

          {/* Margin forecast — OWNER & DIRECTOR only, never shown on PDF */}
          {canSeeHpp && totals.hppFilled > 0 && (
            <div className="mx-3 sm:mx-5 mb-4 rounded-lg border border-dashed border-rose-200 bg-rose-50/40 p-3 sm:p-4 space-y-1.5">
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">🔒 Forecast Margin (Internal)</p>
              <div className="flex justify-between text-sm gap-2">
                <span className="text-gray-500 min-w-0">Total HPP ({totals.hppFilled}/{totals.itemCount} item diisi)</span>
                <span className="font-medium text-red-600 shrink-0">{fmt(totals.hppTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-rose-200 gap-2">
                <span className="text-gray-700">Gross Margin</span>
                <span className={`shrink-0 ${totals.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(totals.grossMargin)}
                  <span className="font-normal text-xs ml-1">({totals.marginPct?.toFixed(1)}%)</span>
                </span>
              </div>
              {totals.hppFilled < totals.itemCount && (
                <p className="text-[11px] text-amber-600">⚠ {totals.itemCount - totals.hppFilled} item belum diisi HPP</p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {q.notes && (
          <div className="card p-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Catatan Internal</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{q.notes}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {q.termsConditions && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Terms &amp; Conditions (PDF)</p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{q.termsConditions}</pre>
          </div>
        )}

        {/* Invoices (if any) */}
        {q.invoices?.length > 0 && (
          <div className="card divide-y divide-gray-100">
            <p className="px-5 py-3 text-sm font-semibold text-gray-700">Invoice</p>
            {q.invoices.map(inv => (
              <Link key={inv.id} href={`/invoice/${inv.id}`}
                className="px-5 py-3 flex items-center justify-between text-sm hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{inv.invoiceNumber}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                    inv.status === 'ISSUED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'}`}>{inv.status}</span>
                  {inv.isDP && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">DP</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{fmt(inv.totalAmount)}</span>
                  <span className="text-gray-400 text-xs">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>

      {showInvoiceModal && q && (
        <CreateInvoiceModal
          quotation={q}
          onClose={() => setShowInvoiceModal(false)}
          onCreated={() => { setShowInvoiceModal(false); load() }}
        />
      )}

      {showPreview && q && (
        <PDFPreviewModal
          url={`/api/quotations/${q.id}/pdf`}
          title={q.quotationNumber}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
