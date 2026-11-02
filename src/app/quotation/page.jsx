'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import BackButton from '@/components/BackButton'

const fmt = (n) => n == null ? '-' : 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

const STATUS_LABEL = {
  DRAFT:            { label: 'Draft',              color: 'bg-gray-100 text-gray-600' },
  PENDING_WULAN:    { label: 'Menunggu Wulan',     color: 'bg-yellow-100 text-yellow-700' },
  PENDING_DIRECTOR: { label: 'Menunggu Direktur',  color: 'bg-orange-100 text-orange-700' },
  APPROVED:         { label: 'Approved',            color: 'bg-blue-100 text-blue-700' },
  WON:              { label: 'Won ✓',              color: 'bg-green-100 text-green-700' },
  LOST:             { label: 'Lost',               color: 'bg-red-100 text-red-600' },
  CANCELLED:        { label: 'Cancelled',           color: 'bg-gray-100 text-gray-400' },
}

function canManage(user) {
  return ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(user?.role)
}

export default function QuotationListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: 'all', division: 'all' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status])

  const load = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (filter.status   !== 'all') q.set('status', filter.status)
    if (filter.division !== 'all') q.set('division', filter.division)
    fetch(`/api/quotations?${q}`).then(r => r.json()).then(d => {
      setQuotations(d.quotations || [])
      setLoading(false)
    })
  }

  useEffect(() => { if (status === 'authenticated') load() }, [status, filter])

  // Compute totals per quotation
  function calcTotal(q) {
    let sub = 0
    for (const sec of q.sections || []) {
      for (const item of sec.items || []) sub += item.subtotal || 0
    }
    const agencyFee = sub * ((q.agencyFeePercent || 0) / 100)
    const ppn = q.includesPpn ? (sub + agencyFee) * ((q.ppnPercent || 11) / 100) : 0
    return sub + agencyFee + ppn
  }

  if (status !== 'authenticated') return null

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
            <div>
          <BackButton />
              <h1 className="text-xl font-bold text-gray-900">Quotation</h1>
              <p className="text-sm text-gray-500">Penawaran harga kepada klien</p>
            </div>
          </div>
          {canManage(session?.user) && (
            <div className="flex items-center gap-2">
              <Link href="/quotation/import" className="btn-secondary text-sm">⬆ Import Lama</Link>
              <Link href="/quotation/new" className="btn-primary text-sm">+ Buat Quotation</Link>
            </div>
          )}
        </div>

        {/* Search + Filter bar */}
        <div className="card p-3 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              className="input text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama project atau klien…"
            />
          </div>
          <div>
            <label className="label text-xs">Status</label>
            <select className="select text-sm py-1.5" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="all">Semua Status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {['PROJECT_MANAGER', 'PRODUCER'].includes(session?.user?.role) ? null : (
          <div>
            <label className="label text-xs">Divisi</label>
            <select className="select text-sm py-1.5" value={filter.division} onChange={e => setFilter(f => ({ ...f, division: e.target.value }))}>
              <option value="all">Semua Divisi</option>
              <option value="EVENT">EO</option>
              <option value="PH">PH</option>
            </select>
          </div>
          )}
        </div>

        {/* List */}
        <div className="card divide-y divide-gray-100">
          {loading && <div className="py-12 text-center text-sm text-gray-400">Memuat...</div>}
          {!loading && quotations.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">Belum ada quotation</div>
          )}
          {!loading && quotations.length > 0 && search.trim() && (() => {
            const q_s = search.trim().toLowerCase()
            const match = quotations.filter(q =>
              q.eventName?.toLowerCase().includes(q_s) ||
              q.clientName?.toLowerCase().includes(q_s) ||
              q.quotationNumber?.toLowerCase().includes(q_s)
            )
            if (match.length === 0) return (
              <div className="py-12 text-center text-sm text-gray-400">
                Tidak ditemukan hasil untuk <strong>"{search}"</strong>
              </div>
            )
            return null
          })()}
          {!loading && (() => {
            const q_search = search.trim().toLowerCase()
            const filtered = q_search
              ? quotations.filter(q =>
                  q.eventName?.toLowerCase().includes(q_search) ||
                  q.clientName?.toLowerCase().includes(q_search) ||
                  q.quotationNumber?.toLowerCase().includes(q_search)
                )
              : quotations

            // Pisahkan parent (bukan sub) dan sub — render parent dulu lalu sub-nya langsung di bawah
            const subs = new Map() // parentId → [sub, ...]
            const parents = []
            for (const q of filtered) {
              if (q.parentQuotationId) {
                if (!subs.has(q.parentQuotationId)) subs.set(q.parentQuotationId, [])
                subs.get(q.parentQuotationId).push(q)
              } else {
                parents.push(q)
              }
            }
            // Sub yang induknya tidak ada di halaman ini (misal disaring filter) — tampilkan sendiri
            const orphanSubs = filtered.filter(q => q.parentQuotationId && !filtered.find(p => p.id === q.parentQuotationId))

            const renderRow = (q, isSubRow = false) => {
              const st = STATUS_LABEL[q.status] || STATUS_LABEL.DRAFT
              const total = calcTotal(q)
              return (
                <Link key={q.id} href={`/quotation/${q.id}`}
                  className={`flex items-start justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${isSubRow ? 'bg-violet-50/50 border-l-2 border-violet-200 ml-4' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isSubRow && <span className="text-violet-300 text-xs">↳</span>}
                      <span className="font-mono text-xs text-gray-400">{q.quotationNumber}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{q.division === 'PH' ? 'PH' : 'EO'}</span>
                      {q.isAddCost && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Add Cost</span>}
                      {!isSubRow && subs.has(q.id) && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
                          {subs.get(q.id).length} sub-quot
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mt-0.5">{q.eventName}</p>
                    <p className="text-sm text-gray-500">
                      {q.clientName}
                      {q.location ? ` · ${q.location}` : ''}
                      {q.eventDate ? ` · ${q.eventDate}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dibuat oleh {q.createdBy?.name}
                      {q.picQuotation && q.picQuotation.id !== q.createdBy?.id && ` · Prepared by: ${q.picQuotation.name}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">{fmt(total)}</p>
                    {q.includesPpn && <p className="text-[11px] text-gray-400">incl. PPN</p>}
                    {q._count?.invoices > 0 && (
                      <p className="text-[11px] text-blue-500 mt-0.5">{q._count.invoices} invoice</p>
                    )}
                  </div>
                </Link>
              )
            }

            return [
              ...parents.flatMap(q => [
                renderRow(q, false),
                ...(subs.get(q.id) || []).map(sub => renderRow(sub, true)),
              ]),
              ...orphanSubs.map(q => renderRow(q, false)),
            ]
          })()}
        </div>
      </main>
    </div>
  )
}
