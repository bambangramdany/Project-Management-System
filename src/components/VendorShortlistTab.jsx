'use client'
/**
 * Tab Vendor Shortlist pada Project Detail.
 * Tampilkan semua budget items, beri PM kemudahan link vendor dari AVL (Approved Vendor List).
 * Setiap budget item bisa di-assign vendor (dengan tier badge + scorecard).
 */
import { useState, useEffect, useCallback } from 'react'
import { VENDOR_TIER_COLOR, EXPENSE_CATEGORY_LABEL } from '@/lib/constants'
import Link from 'next/link'

const tierStyle = t => VENDOR_TIER_COLOR?.[t] ?? { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-300 text-white' }

function TierBadge({ tier }) {
  if (!tier) return null
  const s = tierStyle(tier)
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>Tier {tier}</span>
}

// Simple vendor search & pick popup
function VendorPickerPopup({ budgetItem, projectId, onClose, onLinked }) {
  const [q, setQ] = useState('')
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)

  const search = useCallback(async (query) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: query || '' })
      const res = await fetch(`/api/vendors?${params}`)
      if (res.ok) {
        const data = await res.json()
        setVendors(data.slice(0, 30))
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { search('') }, [search])

  async function handleLink(vendor) {
    setLinking(true)
    try {
      // Fetch current budget items, patch the target one
      const res = await fetch(`/api/projects/${projectId}/budget`)
      if (!res.ok) return
      const { items } = await res.json()

      const updated = items.map(b =>
        b.id === budgetItem.id
          ? { ...b, vendorId: vendor.id, vendorName: vendor.name }
          : b
      )
      await fetch(`/api/projects/${projectId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      })
      onLinked(vendor)
    } finally { setLinking(false) }
  }

  async function handleUnlink() {
    setLinking(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`)
      if (!res.ok) return
      const { items } = await res.json()
      const updated = items.map(b =>
        b.id === budgetItem.id ? { ...b, vendorId: null, vendorName: null } : b
      )
      await fetch(`/api/projects/${projectId}/budget`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      })
      onLinked(null)
    } finally { setLinking(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-sm">Pilih Vendor dari AVL</p>
            <p className="text-xs text-gray-500 truncate">untuk: {budgetItem.label}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-4 pt-3">
          <input
            className="input w-full"
            placeholder="Cari nama vendor, kota…"
            value={q}
            onChange={e => { setQ(e.target.value); search(e.target.value) }}
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {loading && <p className="text-xs text-gray-400 text-center py-4">Mencari…</p>}
          {!loading && vendors.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Tidak ditemukan</p>}
          {vendors.map(v => (
            <button
              key={v.id}
              onClick={() => handleLink(v)}
              disabled={linking}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">{v.name}</span>
                    <TierBadge tier={v.qualityTier} />
                  </div>
                  <p className="text-[11px] text-gray-500">{v.vendorType}{v.subCategory ? ` · ${v.subCategory}` : ''}{v.city ? ` · ${v.city}` : ''}</p>
                </div>
                {v.scorecardAvg != null && (
                  <span className="text-xs font-semibold text-amber-600 shrink-0">★ {v.scorecardAvg.toFixed(1)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
        {budgetItem.vendorId && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            <button onClick={handleUnlink} disabled={linking} className="w-full text-xs py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
              Lepas vendor yang terpilih ({budgetItem.vendorName})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VendorShortlistTab({ project }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pickerFor, setPickerFor] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/budget`)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data.items) ? data.items : [])
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [project.id])

  function handleLinked(budgetItem, vendor) {
    setItems(prev => prev.map(b =>
      b.id === budgetItem.id
        ? { ...b, vendorId: vendor?.id ?? null, vendorName: vendor?.name ?? null, vendor: vendor ?? null }
        : b
    ))
    setPickerFor(null)
  }

  const linked = items.filter(b => b.vendorId)
  const unlinked = items.filter(b => !b.vendorId)

  const formatRp = n => n == null ? '–' : `Rp ${Number(n).toLocaleString('id-ID')}`

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-500">Total Budget Items</p>
          <p className="text-xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Sudah Assign Vendor</p>
          <p className="text-xl font-bold text-green-700">{linked.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Belum Assign</p>
          <p className={`text-xl font-bold ${unlinked.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{unlinked.length}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500">Klik <strong>Pilih Vendor</strong> pada setiap budget item untuk menghubungkan dengan vendor dari AVL (Approved Vendor List). Vendor yang sudah di-assign akan otomatis ter-link saat membuat pengajuan pembayaran.</p>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Memuat data…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-400">
          <p>Belum ada budget item. Buat budget terlebih dahulu di halaman Finance.</p>
          <Link href="/finance" className="text-violet-600 text-sm hover:underline mt-2 inline-block">→ Buka Finance</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget Item</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategori</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Nilai</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor AVL</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(b => {
                const v = b.vendor
                const tier = v?.qualityTier
                return (
                  <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[200px]">
                      <p className="truncate">{b.label || '–'}</p>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                      {EXPENSE_CATEGORY_LABEL[b.category] || b.category}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {formatRp(b.quotedAmount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {b.vendorId ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{b.vendorName}</span>
                            <TierBadge tier={tier} />
                          </div>
                          {v?.scorecardAvg != null && (
                            <span className="text-[11px] text-amber-600">★ {v.scorecardAvg.toFixed(1)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Belum dipilih</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setPickerFor(b)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${b.vendorId ? 'border-violet-200 text-violet-600 hover:bg-violet-50' : 'border-orange-200 text-orange-600 hover:bg-orange-50'}`}
                      >
                        {b.vendorId ? 'Ganti' : 'Pilih Vendor'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pickerFor && (
        <VendorPickerPopup
          budgetItem={pickerFor}
          projectId={project.id}
          onClose={() => setPickerFor(null)}
          onLinked={v => handleLinked(pickerFor, v)}
        />
      )}
    </div>
  )
}
