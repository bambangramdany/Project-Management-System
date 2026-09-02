'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  VENDOR_TYPES, VENDOR_SUBCATEGORIES, VENDOR_STATUSES,
  VENDOR_TIERS, VENDOR_TIER_LABEL, VENDOR_TIER_SHORT, VENDOR_TIER_COLOR, VENDOR_TIER_MIN_SLOTS,
  SCORECARD_DIMENSIONS,
} from '@/lib/constants'

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = n => n == null ? '–' : `${(n / 1_000_000).toFixed(0)} jt`
const star = n => n == null ? '–' : `★ ${n.toFixed(1)}`
const tierStyle = t => VENDOR_TIER_COLOR[t] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', badge: 'bg-gray-300 text-white' }

function TierBadge({ tier }) {
  if (!tier) return <span className="text-[10px] text-gray-400 italic">Belum tier</span>
  const s = tierStyle(tier)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${s.badge}`}>
      Tier {tier}
    </span>
  )
}

function ScoreBar({ value, max = 5 }) {
  if (value == null) return <span className="text-xs text-gray-400">–</span>
  const pct = (value / max) * 100
  const color = value >= 4 ? 'bg-green-400' : value >= 3 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-gray-700 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function SlotProgress({ filled, min = VENDOR_TIER_MIN_SLOTS, tier }) {
  const s = tierStyle(tier)
  const pct = Math.min((filled / min) * 100, 100)
  const isOk = filled >= min
  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isOk ? 'bg-green-200' : 'bg-gray-200'}`}>
        <div
          className={`h-full rounded-full ${isOk ? 'bg-green-500' : 'bg-orange-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-semibold ${isOk ? 'text-green-700' : 'text-orange-600'}`}>
        {filled}/{min}
      </span>
    </div>
  )
}

// ── Vendor card (compact) ─────────────────────────────────────────────────────
function VendorCard({ vendor, onEdit, onRate }) {
  const tier = vendor.qualityTier
  const s = tierStyle(tier)
  return (
    <div className={`rounded-xl border ${tier ? s.border : 'border-gray-200'} bg-white shadow-sm hover:shadow-md transition-shadow group`}>
      <div className={`px-3 py-2 border-b ${tier ? `${s.bg} ${s.border}` : 'border-gray-100 bg-gray-50'} rounded-t-xl flex items-center justify-between`}>
        <TierBadge tier={tier} />
        <span className={`text-[10px] font-semibold ${tier ? s.text : 'text-gray-400'}`}>
          {star(vendor.scorecardAvg)}
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-gray-900 truncate" title={vendor.name}>{vendor.name}</p>
        <p className="text-[11px] text-gray-500 truncate">{vendor.city || '–'}</p>
        {vendor.picContact && <p className="text-[11px] text-gray-400 truncate">{vendor.picContact}</p>}
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${vendor.status === 'Active' ? 'bg-green-100 text-green-700' : vendor.status === 'Blacklist' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
            {vendor.status}
          </span>
          {vendor.totalProjectsUsed > 0 && (
            <span className="text-[10px] text-gray-400">{vendor.totalProjectsUsed}× pakai</span>
          )}
        </div>
      </div>
      <div className="px-3 pb-2 flex gap-1.5">
        <button
          onClick={() => onEdit(vendor)}
          className="flex-1 text-[11px] py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onRate(vendor)}
          className="flex-1 text-[11px] py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
        >
          + Nilai
        </button>
      </div>
    </div>
  )
}

// ── Tier column (inside sub-category grid) ───────────────────────────────────
function TierColumn({ tier, vendors, onEdit, onRate }) {
  const s = tierStyle(tier)
  const label = VENDOR_TIER_SHORT[tier]
  return (
    <div className={`flex-1 min-w-[180px] rounded-xl border-2 ${s.border} ${s.bg} p-2`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-bold ${s.text} uppercase tracking-wide`}>{label}</span>
        <TierBadge tier={tier} />
      </div>
      <SlotProgress filled={vendors.length} tier={tier} />
      <div className="mt-2 space-y-2">
        {vendors.map(v => (
          <VendorCard key={v.id} vendor={v} onEdit={onEdit} onRate={onRate} />
        ))}
        {vendors.length === 0 && (
          <p className="text-[11px] text-gray-400 italic text-center py-3">Belum ada vendor</p>
        )}
      </div>
    </div>
  )
}

// ── Sub-category section ──────────────────────────────────────────────────────
function SubCategorySection({ subCat, vendorType, vendors, onEdit, onRate, isOpen, onToggle }) {
  const byTier = {}
  for (const t of VENDOR_TIERS) byTier[t] = vendors.filter(v => v.qualityTier === t)
  const untiered = vendors.filter(v => !v.qualityTier)
  const total = vendors.length
  const isComplete = VENDOR_TIERS.every(t => byTier[t].length >= VENDOR_TIER_MIN_SLOTS)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 text-sm">{subCat || vendorType}</span>
          <span className="text-xs text-gray-500">{total} vendor</span>
          {isComplete && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ AVL Lengkap</span>}
        </div>
        <div className="flex items-center gap-3">
          {VENDOR_TIERS.map(t => (
            <span key={t} className={`text-[11px] font-semibold ${byTier[t].length >= VENDOR_TIER_MIN_SLOTS ? 'text-green-700' : 'text-orange-500'}`}>
              {t}: {byTier[t].length}/{VENDOR_TIER_MIN_SLOTS}
            </span>
          ))}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {VENDOR_TIERS.map(t => (
              <TierColumn
                key={t}
                tier={t}
                vendors={byTier[t]}
                onEdit={onEdit}
                onRate={onRate}
              />
            ))}
            {untiered.length > 0 && (
              <div className="flex-1 min-w-[160px] rounded-xl border-2 border-dashed border-gray-300 p-2">
                <div className="text-xs font-semibold text-gray-500 mb-2">Belum di-tier ({untiered.length})</div>
                {untiered.map(v => (
                  <VendorCard key={v.id} vendor={v} onEdit={onEdit} onRate={onRate} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Rating modal (5-dimension scorecard) ─────────────────────────────────────
function RatingModal({ vendor, onClose, onSaved }) {
  const [dims, setDims] = useState({ ratingQuality: 3, ratingTimeliness: 3, ratingCommunication: 3, ratingValue: 3, ratingFlexibility: 3 })
  const [projectName, setProjectName] = useState('')
  const [review, setReview] = useState('')
  const [usageDate, setUsageDate] = useState('')
  const [saving, setSaving] = useState(false)

  const weighted = useMemo(() => {
    let total = 0, wSum = 0
    for (const d of SCORECARD_DIMENSIONS) {
      total += dims[d.key] * d.weight
      wSum += d.weight
    }
    return wSum > 0 ? (total / wSum).toFixed(1) : '–'
  }, [dims])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/vendors/${vendor.id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dims, projectName: projectName || null, review: review || null, usageDate: usageDate || null }),
      })
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900">{vendor.name}</p>
            <p className="text-xs text-gray-500">5-Dimension Scorecard</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="label">Nama Project</label>
            <input className="input" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Opsional" />
          </div>
          <div>
            <label className="label">Tanggal Pemakaian</label>
            <input type="date" className="input" value={usageDate} onChange={e => setUsageDate(e.target.value)} />
          </div>
          <div className="border border-gray-200 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Penilaian Dimensi</p>
              <span className="text-sm font-bold text-violet-700">Overall: ★ {weighted}</span>
            </div>
            {SCORECARD_DIMENSIONS.map(d => (
              <div key={d.key}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-gray-600">{d.label}</label>
                  <span className="text-xs font-semibold text-gray-900">{dims[d.key]}/5</span>
                </div>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setDims(p => ({ ...p, [d.key]: n }))}
                      className={`flex-1 h-8 rounded-lg text-sm font-bold border transition-all ${dims[d.key] === n ? 'bg-violet-600 border-violet-600 text-white' : 'border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-500'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="label">Catatan / Review</label>
            <textarea className="input resize-none" rows={3} value={review} onChange={e => setReview(e.target.value)} placeholder="Opsional — ceritakan pengalaman bekerjasama" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Menyimpan...' : 'Simpan Nilai'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Vendor form modal (add / edit) ────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', vendorType: '', subCategory: '', qualityTier: '',
  province: '', city: '', address: '', area: '',
  capacity: '', ballroomCapacity: '', meetingCapacity: '',
  website: '', instagram: '', output: '', productService: '', status: 'Active',
  picContact: '', phone: '', email: '', priceMin: '', priceMax: '', priceNote: '', notes: '',
  bankName: '', bankAccountNumber: '', accountHolder: '', npwp: '',
}

function VendorFormModal({ vendor, onClose, onSaved }) {
  const isEdit = !!vendor
  const [form, setForm] = useState(isEdit ? { ...EMPTY_FORM, ...vendor, qualityTier: vendor.qualityTier || '' } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const subCats = form.vendorType ? (VENDOR_SUBCATEGORIES[form.vendorType] || []) : []

  async function handleSave() {
    if (!form.name.trim()) { alert('Nama vendor wajib diisi'); return }
    if (!form.vendorType) { alert('Jenis vendor wajib dipilih'); return }
    setSaving(true)
    try {
      const url = isEdit ? `/api/vendors/${vendor.id}` : '/api/vendors'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, qualityTier: form.qualityTier || null }),
      })
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
      onSaved()
    } finally { setSaving(false) }
  }

  const F = ({ label, k, type = 'text', placeholder = '' }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-lg">{isEdit ? 'Edit Vendor' : 'Tambah Vendor Baru'}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <div className="col-span-2"><F label="Nama Vendor *" k="name" /></div>

          <div>
            <label className="label">Jenis Vendor *</label>
            <select className="select" value={form.vendorType} onChange={e => { set('vendorType', e.target.value); set('subCategory', '') }}>
              <option value="">— Pilih —</option>
              {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sub-Kategori</label>
            <select className="select" value={form.subCategory} onChange={e => set('subCategory', e.target.value)} disabled={!subCats.length}>
              <option value="">— Pilih —</option>
              {subCats.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Tier Kualitas (SCM)</label>
            <select className="select" value={form.qualityTier} onChange={e => set('qualityTier', e.target.value)}>
              <option value="">— Belum ditentukan —</option>
              {VENDOR_TIERS.map(t => <option key={t} value={t}>{VENDOR_TIER_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
              {VENDOR_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <F label="Kota" k="city" />
          <F label="Provinsi" k="province" />
          <div className="col-span-2"><F label="Alamat" k="address" /></div>
          <F label="Area / Kawasan" k="area" />
          <F label="PIC / Kontak" k="picContact" />
          <F label="Nomor HP / WA" k="phone" type="tel" />
          <F label="Email" k="email" type="email" />
          <F label="Website" k="website" />
          <F label="Instagram" k="instagram" placeholder="@handle" />
          <div className="col-span-2"><F label="Output / Produk & Jasa" k="productService" /></div>
          <F label="Harga Min (Rp)" k="priceMin" type="number" />
          <F label="Harga Max (Rp)" k="priceMax" type="number" />
          <div className="col-span-2"><F label="Catatan Harga" k="priceNote" /></div>
          <div className="col-span-2">
            <label className="label">Catatan Umum</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="col-span-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Info Rekening</p>
          </div>
          <F label="Bank" k="bankName" />
          <F label="No. Rekening" k="bankAccountNumber" />
          <F label="Nama Pemilik Rekening" k="accountHolder" />
          <F label="NPWP" k="npwp" />
        </div>
        <div className="px-5 pb-5 flex gap-2 border-t border-gray-100 pt-3">
          <button onClick={onClose} className="btn-secondary flex-1">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Tambah Vendor')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VendorsPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterTier, setFilterTier] = useState('')
  const [filterStatus, setFilterStatus] = useState('Active')
  const [q, setQ] = useState('')
  const [view, setView] = useState('scm')  // 'scm' | 'table'
  const [openSections, setOpenSections] = useState({})
  const [editVendor, setEditVendor] = useState(null)
  const [rateVendor, setRateVendor] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('vendorType', filterType)
      if (filterTier) params.set('tier', filterTier)
      const res = await fetch(`/api/vendors?${params}`)
      if (res.ok) setVendors(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterType, filterTier])

  function onSaved() {
    setShowAdd(false)
    setEditVendor(null)
    setRateVendor(null)
    load()
  }

  // Filtered list
  const filtered = useMemo(() => {
    let list = vendors
    if (filterStatus) list = list.filter(v => v.status === filterStatus)
    if (q) {
      const lq = q.toLowerCase()
      list = list.filter(v =>
        v.name.toLowerCase().includes(lq) ||
        (v.city ?? '').toLowerCase().includes(lq) ||
        (v.picContact ?? '').toLowerCase().includes(lq)
      )
    }
    return list
  }, [vendors, filterStatus, q])

  // SCM view: group by vendorType → subCategory → tier
  const scmGroups = useMemo(() => {
    const typeList = filterType ? [filterType] : VENDOR_TYPES
    return typeList.map(vt => {
      const vtVendors = filtered.filter(v => v.vendorType === vt)
      if (!vtVendors.length) return null

      const allSubCats = [
        ...(VENDOR_SUBCATEGORIES[vt] ?? []),
        ...[...new Set(vtVendors.map(v => v.subCategory).filter(Boolean))].filter(s => !(VENDOR_SUBCATEGORIES[vt] ?? []).includes(s)),
      ]

      const sections = allSubCats
        .map(sub => ({ sub, vendors: vtVendors.filter(v => v.subCategory === sub) }))
        .filter(s => s.vendors.length > 0)

      // Vendors without subCategory
      const noSub = vtVendors.filter(v => !v.subCategory)
      if (noSub.length) sections.push({ sub: null, vendors: noSub })

      return { vt, sections }
    }).filter(Boolean)
  }, [filtered, filterType])

  function toggleSection(key) {
    setOpenSections(p => ({ ...p, [key]: !p[key] }))
  }

  const totalVendors = filtered.length
  const tieredVendors = filtered.filter(v => v.qualityTier).length
  const avgScore = filtered.filter(v => v.scorecardAvg).length > 0
    ? (filtered.reduce((s, v) => s + (v.scorecardAvg ?? 0), 0) / filtered.filter(v => v.scorecardAvg).length).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-violet-600 transition-colors">← Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Vendor Management</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Approved Vendor List (AVL) · SCM Tier System</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Tambah Vendor
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Vendor', value: totalVendors, color: 'blue' },
            { label: 'Sudah Tier', value: tieredVendors, color: 'violet' },
            { label: 'Avg. Scorecard', value: avgScore ? `★ ${avgScore}` : '–', color: 'amber' },
            { label: 'Belum Tier', value: totalVendors - tieredVendors, color: 'orange' },
          ].map(s => (
            <div key={s.label} className="card p-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-3 mb-4 flex flex-wrap gap-2 items-center">
          <input
            className="input w-48"
            placeholder="Cari nama, kota, PIC…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select className="select w-52" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Semua Jenis</option>
            {VENDOR_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="select w-40" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
            <option value="">Semua Tier</option>
            {VENDOR_TIERS.map(t => <option key={t} value={t}>{VENDOR_TIER_LABEL[t]}</option>)}
            <option value="">— Belum tier</option>
          </select>
          <select className="select w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {VENDOR_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden ml-auto">
            {[{ key: 'scm', label: 'SCM View' }, { key: 'table', label: 'Tabel' }].map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === v.key ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Memuat data vendor…</div>
        ) : view === 'scm' ? (
          /* ── SCM View ───────────────────────────────────────────────────── */
          <div className="space-y-5">
            {scmGroups.length === 0 && (
              <div className="text-center py-16 text-gray-400">Tidak ada vendor ditemukan</div>
            )}
            {scmGroups.map(({ vt, sections }) => (
              <div key={vt} className="card overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                  <h2 className="font-bold text-gray-900">{vt}</h2>
                  <p className="text-xs text-gray-500">{sections.reduce((s, sec) => s + sec.vendors.length, 0)} vendor</p>
                </div>
                <div className="p-3 space-y-2">
                  {sections.map(({ sub, vendors: secVendors }) => {
                    const key = `${vt}__${sub ?? '__nosub'}`
                    return (
                      <SubCategorySection
                        key={key}
                        subCat={sub}
                        vendorType={vt}
                        vendors={secVendors}
                        onEdit={setEditVendor}
                        onRate={setRateVendor}
                        isOpen={openSections[key] ?? (sections.length === 1)}
                        onToggle={() => toggleSection(key)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Table View ─────────────────────────────────────────────────── */
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {['Vendor', 'Jenis', 'Sub-Kategori', 'Tier', 'Score', 'Kota', 'PIC', 'Status', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Tidak ada vendor</td></tr>
                )}
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-gray-900 max-w-[180px] truncate">{v.name}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{v.vendorType}</td>
                    <td className="px-3 py-2.5 text-gray-500">{v.subCategory || '–'}</td>
                    <td className="px-3 py-2.5"><TierBadge tier={v.qualityTier} /></td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{star(v.scorecardAvg)}</td>
                    <td className="px-3 py-2.5 text-gray-500">{v.city || '–'}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[140px] truncate">{v.picContact || '–'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${v.status === 'Active' ? 'bg-green-100 text-green-700' : v.status === 'Blacklist' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => setEditVendor(v)} className="text-[11px] px-2 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50">Edit</button>
                        <button onClick={() => setRateVendor(v)} className="text-[11px] px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">Nilai</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tier legend */}
      <div className="max-w-screen-xl mx-auto px-4 pb-6">
        <div className="card p-4 mt-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Panduan Tier SCM</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {VENDOR_TIERS.map(t => {
              const s = tierStyle(t)
              const desc = { A: 'Output premium, reputasi terbaik, harga kompetitif. Prioritas utama untuk project high-value.', B: 'Kualitas standar terpercaya, harga moderat. Pilihan utama untuk mayoritas project.', C: 'Cadangan strategis, harga lebih terjangkau, cocok untuk project budget-sensitive.' }
              return (
                <div key={t} className={`rounded-xl border ${s.border} ${s.bg} p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TierBadge tier={t} />
                    <span className={`text-xs font-bold ${s.text}`}>{VENDOR_TIER_LABEL[t]}</span>
                  </div>
                  <p className="text-[11px] text-gray-600">{desc[t]}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Min. {VENDOR_TIER_MIN_SLOTS} vendor per sub-kategori</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {(showAdd || editVendor) && (
        <VendorFormModal
          vendor={editVendor}
          onClose={() => { setShowAdd(false); setEditVendor(null) }}
          onSaved={onSaved}
        />
      )}
      {rateVendor && (
        <RatingModal vendor={rateVendor} onClose={() => setRateVendor(null)} onSaved={onSaved} />
      )}
    </div>
  )
}
