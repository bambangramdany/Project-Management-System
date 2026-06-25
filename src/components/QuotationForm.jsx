'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Navbar from './Navbar'

// ── helpers ──────────────────────────────────────────────────────────────────

const formatRp = (n) => {
  if (n == null || n === '' || isNaN(n)) return ''
  return Math.round(n).toLocaleString('id-ID')
}

const parseNum = (v) => {
  // Strip titik pemisah ribuan (format Indonesia: 40.000.000 → 40000000)
  const digits = String(v).replace(/\D/g, '')
  const n = parseInt(digits, 10)
  return isNaN(n) ? 0 : n
}

// Format angka saat diketik di field rate/HPP — tampilkan titik pemisah ribuan
function formatInputRp(raw) {
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('id-ID')
}
function handleRateInput(val, cb) {
  const digits = String(val).replace(/\D/g, '')
  cb(digits ? parseInt(digits, 10).toLocaleString('id-ID') : '')
}

const UNIT_TYPES = ['Package', 'Unit', 'Pcs', 'Pax', 'Set', 'Lot', 'Ls', 'Event', 'Hari', 'Bulan', 'Orang']

const DEFAULT_TERMS =
`1. Cancellation within 14 days of events will be subject to 50% of total payment.
2. Any additional cost outside those mentioned above should be settled maximum 7 days after event.
3. Payment can be transferred to:
   Bank Central Asia (BCA) a/n PT SINEMATIK ANAK BANGSA
   No. Rekening: 7061111011
   Please send the receipt to watermark.indonesia@gmail.com`

function emptySection(index) {
  return {
    _key: Math.random().toString(36).slice(2),
    letter: String.fromCharCode(65 + index),
    name: '',
    items: [emptyItem(0)],
  }
}

function emptyItem(index) {
  return {
    _key:             Math.random().toString(36).slice(2),
    no:               index + 1,
    description:      '',
    detailText:       '',
    byClient:         false,  // if true → rate = null
    rate:             '',
    unitType:         'Unit',
    qty:              '1',
    days:             '1',
    subtotal:         0,
    hppRate:          '',     // cost price per unit — internal only
    includeAgencyFee: false,
    showInInvoiceDetail: true,
  }
}

function computeSubtotal(item) {
  if (item.byClient) return 0
  const r = parseNum(item.rate)
  const q = parseNum(item.qty)
  const d = parseNum(item.days)
  return r * q * d
}

function calcTotals(sections, agencyFeePercent, includesPpn, ppnPercent) {
  let baseSubtotal   = 0
  let agencyFeeBase  = 0
  let hppTotal       = 0
  let hppFilled      = 0  // how many items have HPP filled
  let itemCount      = 0
  for (const sec of sections) {
    for (const item of sec.items) {
      if (item.byClient) continue
      const sub = computeSubtotal(item)
      baseSubtotal += sub
      if (item.includeAgencyFee) agencyFeeBase += sub
      itemCount++
      if (item.hppRate !== '' && item.hppRate != null) {
        const hpp = parseNum(item.hppRate) * (parseNum(item.qty) || 1) * (parseNum(item.days) || 1)
        hppTotal += hpp
        hppFilled++
      }
    }
  }
  const agencyFeeAmt = agencyFeeBase * ((agencyFeePercent || 0) / 100)
  const ppnBase      = includesPpn ? (baseSubtotal + agencyFeeAmt) * ((ppnPercent || 11) / 100) : 0
  const grandTotal   = baseSubtotal + agencyFeeAmt + ppnBase
  const grossMargin  = hppFilled > 0 ? grandTotal - hppTotal : null
  const marginPct    = hppFilled > 0 && grandTotal > 0 ? (grossMargin / grandTotal) * 100 : null
  return {
    baseSubtotal,
    agencyFeeAmt,
    ppnBase,
    grandTotal,
    hppTotal,
    hppFilled,
    itemCount,
    grossMargin,
    marginPct,
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuotationForm({ initial = null, onSaved, onCancel }) {
  const { data: session } = useSession()

  // Header fields
  const [division,         setDivision]         = useState(initial?.division         || 'EVENT')
  const [clientName,       setClientName]       = useState(initial?.clientName       || '')
  const [eventName,        setEventName]        = useState(initial?.eventName        || '')
  const [venue,            setVenue]            = useState(initial?.venue            || '')
  const [eventDate,        setEventDate]        = useState(initial?.eventDate        || '')
  const [location,         setLocation]         = useState(initial?.location         || '')
  const [agencyFeePercent, setAgencyFeePercent] = useState(initial?.agencyFeePercent ?? 0)
  const [includesPpn,      setIncludesPpn]      = useState(initial?.includesPpn      ?? false)
  const [ppnPercent,       setPpnPercent]       = useState(initial?.ppnPercent       ?? 11)
  const [dpEnabled,        setDpEnabled]        = useState(!!(initial?.dpPercent || initial?.dpAmount))
  const [dpPercent,        setDpPercent]        = useState(initial?.dpPercent        ?? '')
  const [notes,            setNotes]            = useState(initial?.notes            || '')
  const [termsConditions,  setTermsConditions]  = useState(initial?.termsConditions  ?? DEFAULT_TERMS)
  const [isAddCost,        setIsAddCost]        = useState(initial?.isAddCost        ?? false)

  // PIC & approvers — user IDs
  const [picQuotationId, setPicQuotationId] = useState(initial?.picQuotationId || '')
  const [approver1Id,    setApprover1Id]    = useState(initial?.approver1Id    || '')
  const [approver2Id,    setApprover2Id]    = useState(initial?.approver2Id    || '')

  // Users list for selectors
  const [users, setUsers] = useState([])

  // Sections + items
  const [sections, setSections] = useState(() => {
    if (initial?.sections?.length) {
      return initial.sections.map(sec => ({
        _key:   sec.id || Math.random().toString(36).slice(2),
        letter: sec.letter,
        name:   sec.name,
        items: (sec.items || []).map(item => ({
          _key:             item.id || Math.random().toString(36).slice(2),
          no:               item.no,
          description:      item.description,
          detailText:       item.detailText || '',
          byClient:         item.rate == null,
          rate:             item.rate != null ? parseInt(item.rate, 10).toLocaleString('id-ID') : '',
          unitType:         item.unitType,
          qty:              String(item.qty),
          days:             String(item.days),
          subtotal:         item.subtotal,
          hppRate:          item.hppRate != null ? parseInt(item.hppRate, 10).toLocaleString('id-ID') : '',
          includeAgencyFee: item.includeAgencyFee,
          showInInvoiceDetail: item.showInInvoiceDetail,
        })),
      }))
    }
    return [emptySection(0)]
  })

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/team').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : (d.users || [])))
  }, [])

  // Auto-recalculate subtotals when items change
  const updateItem = useCallback((secIdx, itemIdx, patch) => {
    setSections(prev => {
      const next = prev.map((s, si) => {
        if (si !== secIdx) return s
        return {
          ...s,
          items: s.items.map((item, ii) => {
            if (ii !== itemIdx) return item
            const merged = { ...item, ...patch }
            merged.subtotal = computeSubtotal(merged)
            return merged
          }),
        }
      })
      return next
    })
  }, [])

  // ── Section helpers ────────────────────────────────────────────────────────
  function addSection() {
    setSections(prev => [...prev, emptySection(prev.length)])
  }

  function removeSection(secIdx) {
    setSections(prev => prev.filter((_, i) => i !== secIdx).map((s, i) => ({
      ...s, letter: String.fromCharCode(65 + i),
    })))
  }

  function updateSection(secIdx, patch) {
    setSections(prev => prev.map((s, i) => i === secIdx ? { ...s, ...patch } : s))
  }

  function addItem(secIdx) {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s
      return { ...s, items: [...s.items, emptyItem(s.items.length)] }
    }))
  }

  function removeItem(secIdx, itemIdx) {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s
      const items = s.items.filter((_, ii) => ii !== itemIdx).map((item, ii) => ({ ...item, no: ii + 1 }))
      return { ...s, items }
    }))
  }

  function moveSection(secIdx, dir) {
    setSections(prev => {
      const next = [...prev]
      const target = secIdx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[secIdx], next[target]] = [next[target], next[secIdx]]
      return next.map((s, i) => ({ ...s, letter: String.fromCharCode(65 + i) }))
    })
  }

  function moveItem(secIdx, itemIdx, dir) {
    setSections(prev => prev.map((s, si) => {
      if (si !== secIdx) return s
      const items = [...s.items]
      const target = itemIdx + dir
      if (target < 0 || target >= items.length) return s
      ;[items[itemIdx], items[target]] = [items[target], items[itemIdx]]
      return { ...s, items: items.map((item, ii) => ({ ...item, no: ii + 1 })) }
    }))
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = calcTotals(sections, agencyFeePercent, includesPpn, ppnPercent)

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    setError('')
    if (!clientName.trim()) { setError('Nama klien wajib diisi'); return }
    if (!eventName.trim())  { setError('Nama event wajib diisi');  return }

    setSaving(true)
    const payload = {
      division,
      clientName: clientName.trim(),
      eventName:  eventName.trim(),
      venue:      venue     || null,
      eventDate:  eventDate || null,
      location:   location  || null,
      agencyFeePercent: parseNum(agencyFeePercent),
      includesPpn,
      ppnPercent:      parseNum(ppnPercent),
      dpPercent:  dpEnabled && dpPercent ? parseNum(dpPercent) : null,
      picQuotationId:  picQuotationId  || null,
      approver1Id:     approver1Id     || null,
      approver2Id:     approver2Id     || null,
      projectId:       initial?.projectId || null,
      isAddCost:       isAddCost,
      notes:           notes           || null,
      termsConditions: termsConditions || null,
      sections: sections.map((sec, si) => ({
        letter: sec.letter,
        name:   sec.name,
        order:  si,
        items: sec.items.map((item, ii) => ({
          no:                  item.no,
          description:         item.description,
          detailText:          item.detailText || null,
          rate:                item.byClient ? null : (parseNum(item.rate) || 0),
          unitType:            item.unitType,
          qty:                 parseNum(item.qty) || 1,
          days:                parseNum(item.days) || 1,
          subtotal:            item.subtotal,
          hppRate:             item.hppRate !== '' ? parseNum(item.hppRate) || null : null,
          includeAgencyFee:    item.includeAgencyFee,
          showInInvoiceDetail: item.showInInvoiceDetail,
          order:               ii,
        })),
      })),
    }

    // Jika initial ada .id → EDIT (PATCH), kalau tidak → BUAT BARU (POST)
    const isEdit = !!(initial?.id)
    const url    = isEdit ? `/api/quotations/${initial.id}` : '/api/quotations'
    const method = isEdit ? 'PATCH' : 'POST'
    if (isEdit) payload.action = 'update_content'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      onSaved?.(data)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const staffUsers = users.filter(u =>
    ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER', 'FINANCE', 'FINANCE_STAFF'].includes(u.role)
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{initial ? 'Edit Quotation' : 'Buat Quotation Baru'}</h1>
            {initial && <p className="text-xs font-mono text-gray-400">{initial.quotationNumber}</p>}
          </div>
        </div>

        {/* ── Section 1: Info dasar ── */}
        <div className="card p-5 space-y-4 border-t-4 border-brand">
          <h2 className="font-semibold text-gray-800">Informasi Dasar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Divisi</label>
              <select className="select" value={division} onChange={e => setDivision(e.target.value)}>
                <option value="EVENT">EO (Event Organizer)</option>
                <option value="PH">PH (Production House)</option>
              </select>
            </div>
            <div>
              <label className="label">Nama Klien *</label>
              <input className="input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="PT Contoh Tbk" />
            </div>
            <div>
              <label className="label">Nama Event / Project *</label>
              <input className="input" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Annual Gathering 2026" />
            </div>
            <div>
              <label className="label">Tanggal Event</label>
              <input className="input" value={eventDate} onChange={e => setEventDate(e.target.value)} placeholder="12-14 Juni 2026" />
            </div>
            <div>
              <label className="label">Venue</label>
              <input className="input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Hotel Mulia Jakarta" />
            </div>
            <div>
              <label className="label">Kota / Lokasi</label>
              <input className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="Jakarta" />
            </div>
          </div>
        </div>

        {/* ── Add Cost Flag ── */}
        <div className="flex items-start gap-3 px-1">
          <input
            type="checkbox"
            id="isAddCost"
            checked={isAddCost}
            onChange={e => setIsAddCost(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600"
          />
          <div>
            <label htmlFor="isAddCost" className="text-sm font-medium text-gray-700 cursor-pointer">
              Ini adalah Quotation Add Cost
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Centang jika quotation ini adalah penambahan biaya di luar quotation utama yang sudah WON.
              Item-itemnya akan ditambahkan (append) ke Forecast Budget project tanpa menghapus item dari quotation utama.
              Invoice-nya akan memiliki nomor terpisah.
            </p>
          </div>
        </div>

        {/* ── Section 2: PIC & Approver ── */}
        <div className="card p-5 space-y-4 border-t-4 border-purple-400">
          <h2 className="font-semibold text-gray-800">PIC & Tanda Tangan Dokumen</h2>
          <p className="text-xs text-gray-500">Nama yang tampil di dokumen quotation (bisa berbeda dari pembuat).</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Prepared by (Nama di Dokumen)</label>
              <select className="select" value={picQuotationId} onChange={e => setPicQuotationId(e.target.value)}>
                <option value="">— Pilih nama —</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.jobTitle ? ` (${u.jobTitle})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Approved by #1 (Wulan)</label>
              <select className="select" value={approver1Id} onChange={e => setApprover1Id(e.target.value)}>
                <option value="">— Pilih —</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Approved by #2 (Direktur)</label>
              <select className="select" value={approver2Id} onChange={e => setApprover2Id(e.target.value)}>
                <option value="">— Pilih —</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Section 3: Keuangan ── */}
        <div className="card p-5 space-y-4 border-t-4 border-emerald-400">
          <h2 className="font-semibold text-gray-800">Pengaturan Keuangan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Agency Fee (%)</label>
              <input type="number" min="0" max="100" className="input" value={agencyFeePercent}
                onChange={e => setAgencyFeePercent(e.target.value)}
                placeholder="0 = tidak ada agency fee" />
              <p className="text-[11px] text-gray-400 mt-1">Diterapkan hanya pada item yang di-centang ✓ Agency Fee</p>
            </div>
            <div className="flex flex-col justify-between">
              <label className="label">PPN</label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includesPpn} onChange={e => setIncludesPpn(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm text-gray-700">Include PPN</span>
                </label>
                {includesPpn && (
                  <div className="flex items-center gap-1">
                    <input type="number" className="input w-20" value={ppnPercent} onChange={e => setPpnPercent(e.target.value)} />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <label className="label">Termin DP</label>
              <label className="flex items-center gap-2 mt-1 cursor-pointer">
                <input type="checkbox" checked={dpEnabled} onChange={e => setDpEnabled(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-gray-700">Ada termin DP</span>
              </label>
              {dpEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="number" min="1" max="100" className="input w-20"
                    value={dpPercent} onChange={e => setDpPercent(e.target.value)} placeholder="30" />
                  <span className="text-sm text-gray-500">% DP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 4: Budget Items ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Rincian Budget</h2>
            <button onClick={addSection} className="text-sm text-brand hover:underline">+ Tambah Kategori</button>
          </div>

          {sections.map((sec, si) => (
            <div key={sec._key} className="card border-t-4 border-indigo-300">
              {/* Category header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-indigo-50/40">
                <span className="font-bold text-indigo-700 w-6 shrink-0">{sec.letter}.</span>
                <input
                  className="input flex-1 font-semibold"
                  value={sec.name}
                  onChange={e => updateSection(si, { name: e.target.value })}
                  placeholder="Nama kategori (contoh: VENUE, PRODUCTION, CREATIVE)"
                />
                <div className="flex items-center gap-1">
                  <button onClick={() => moveSection(si, -1)} disabled={si === 0}
                    className="text-gray-400 hover:text-gray-600 px-1 disabled:opacity-30">↑</button>
                  <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1}
                    className="text-gray-400 hover:text-gray-600 px-1 disabled:opacity-30">↓</button>
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(si)} className="text-red-400 hover:text-red-600 px-1 text-xs ml-1">✕</button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50">
                {sec.items.map((item, ii) => (
                  <ItemRow key={item._key}
                    item={item}
                    secIdx={si} itemIdx={ii}
                    totalItems={sec.items.length}
                    onUpdate={(patch) => updateItem(si, ii, patch)}
                    onRemove={() => removeItem(si, ii)}
                    onMoveUp={() => moveItem(si, ii, -1)}
                    onMoveDown={() => moveItem(si, ii, 1)}
                    agencyFeePercent={agencyFeePercent}
                  />
                ))}
              </div>

              <div className="p-3 border-t border-gray-100">
                <button onClick={() => addItem(si)} className="text-sm text-indigo-600 hover:underline">+ Tambah Item</button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 5: Totals ── */}
        <div className="card p-5 border-t-4 border-orange-400">
          <h2 className="font-semibold text-gray-800 mb-3">Ringkasan Harga</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Price summary */}
            <div className="space-y-2 sm:col-start-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sub Total</span>
                <span className="font-medium">Rp {formatRp(totals.baseSubtotal)}</span>
              </div>
              {agencyFeePercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Agency Fee ({agencyFeePercent}%)</span>
                  <span className="text-gray-700">Rp {formatRp(totals.agencyFeeAmt)}</span>
                </div>
              )}
              {includesPpn && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">PPN {ppnPercent}%</span>
                  <span className="text-gray-700">Rp {formatRp(totals.ppnBase)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                <span>Grand Total</span>
                <span className="text-brand">Rp {formatRp(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Margin forecast — only shown if any HPP is filled */}
            {totals.hppFilled > 0 && (
              <div className="sm:row-start-1 sm:col-start-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  🔒 Forecast Margin (Internal)
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total HPP ({totals.hppFilled}/{totals.itemCount} item)</span>
                  <span className="font-medium text-red-600">Rp {formatRp(totals.hppTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Grand Total Jual</span>
                  <span className="font-medium">Rp {formatRp(totals.grandTotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-200">
                  <span>Gross Margin</span>
                  <span className={totals.grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    Rp {formatRp(totals.grossMargin)}
                    {' '}
                    <span className="font-normal text-xs">
                      ({totals.marginPct != null ? totals.marginPct.toFixed(1) : '—'}%)
                    </span>
                  </span>
                </div>
                {totals.hppFilled < totals.itemCount && (
                  <p className="text-[11px] text-amber-600 pt-1">
                    ⚠ {totals.itemCount - totals.hppFilled} item belum diisi HPP — margin belum lengkap
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 6: Catatan ── */}
        <div className="card p-5 border-t-4 border-gray-300 space-y-4">
          <div>
            <label className="label">Catatan Internal <span className="text-gray-400 font-normal">(tidak tampil di dokumen PDF)</span></label>
            <textarea className="input mt-1 h-20 resize-none" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Catatan untuk tim internal..." />
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="label">
              Terms &amp; Conditions
              <span className="text-gray-400 font-normal ml-1">(ditampilkan di bagian bawah PDF — sesuaikan per klien)</span>
            </label>
            <textarea
              className="input mt-1 h-40 resize-y font-mono text-xs"
              value={termsConditions}
              onChange={e => setTermsConditions(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 Template ini akan otomatis terisi. Edit sesuai kebutuhan klien atau tambahkan poin baru di bawahnya.
            </p>
          </div>
        </div>

        {/* ── Actions ── */}
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        <div className="flex justify-end gap-3 pb-8">
          <button onClick={onCancel} className="btn-secondary text-sm">Batal</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Menyimpan...' : initial?.id ? 'Simpan Perubahan' : 'Buat Quotation'}
          </button>
        </div>
      </main>
    </div>
  )
}

// ── Item row component ────────────────────────────────────────────────────────

function ItemRow({ item, secIdx, itemIdx, totalItems, onUpdate, onRemove, onMoveUp, onMoveDown, agencyFeePercent }) {
  const [showDetail, setShowDetail] = useState(!!item.detailText)

  return (
    <div className="p-3 space-y-2">
      {/* Row 1: No + description + controls */}
      <div className="flex items-start gap-2">
        <span className="text-xs text-gray-400 w-6 shrink-0 pt-2.5">{item.no}.</span>
        <div className="flex-1 space-y-1.5">
          <input
            className="input text-sm"
            value={item.description}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Nama / deskripsi item"
          />
          {showDetail && (
            <textarea
              className="input text-xs h-16 resize-none"
              value={item.detailText}
              onChange={e => onUpdate({ detailText: e.target.value })}
              placeholder="Detail / rincian (tampil di dokumen, baris ke-2)"
            />
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
          <button onClick={() => onMoveUp()} disabled={itemIdx === 0} className="text-gray-300 hover:text-gray-500 text-xs disabled:opacity-30">▲</button>
          <button onClick={() => onMoveDown()} disabled={itemIdx === totalItems - 1} className="text-gray-300 hover:text-gray-500 text-xs disabled:opacity-30">▼</button>
          {totalItems > 1 && (
            <button onClick={onRemove} className="text-red-300 hover:text-red-500 text-xs mt-0.5">✕</button>
          )}
        </div>
      </div>

      {/* Row 2: Pricing */}
      <div className="ml-0 sm:ml-8 mt-1">
        {/* By client toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer mb-2">
          <input type="checkbox" checked={item.byClient} onChange={e => onUpdate({ byClient: e.target.checked, rate: '' })} className="w-3.5 h-3.5" />
          <span className="text-xs text-gray-500">By Client (tidak dikenakan biaya)</span>
        </label>

        {!item.byClient && (
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="flex gap-2 items-end min-w-max">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 mb-0.5">Rate</span>
                <input
                  type="text"
                  className="input w-32 text-sm text-right"
                  value={item.rate}
                  onChange={e => handleRateInput(e.target.value, v => onUpdate({ rate: v }))}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 mb-0.5">Unit</span>
                <select className="select text-sm py-1 w-24" value={item.unitType} onChange={e => onUpdate({ unitType: e.target.value })}>
                  {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 mb-0.5">Qty</span>
                <input type="number" min="0" className="input w-16 text-sm text-right"
                  value={item.qty} onChange={e => onUpdate({ qty: e.target.value })} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 mb-0.5">Days</span>
                <input type="number" min="0" className="input w-16 text-sm text-right"
                  value={item.days} onChange={e => onUpdate({ days: e.target.value })} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 mb-0.5">Subtotal</span>
                <div className="text-sm font-semibold text-gray-800 py-2 text-right min-w-[100px]">
                  Rp {formatRp(item.subtotal)}
                </div>
              </div>
              {/* HPP / Modal — internal, never on PDF */}
              <div className="flex flex-col border-l border-dashed border-gray-200 pl-3 ml-1">
                <span className="text-[10px] text-rose-400 mb-0.5">HPP/Modal 🔒</span>
                <input
                  type="text"
                  className="input w-28 text-sm text-right border-rose-200 focus:border-rose-400 bg-rose-50/30 placeholder-rose-200"
                  value={item.hppRate}
                  onChange={e => handleRateInput(e.target.value, v => onUpdate({ hppRate: v }))}
                  placeholder="opsional"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Flags */}
      <div className="flex flex-wrap items-center gap-3 ml-8">
        {agencyFeePercent > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={item.includeAgencyFee} onChange={e => onUpdate({ includeAgencyFee: e.target.checked })} className="w-3.5 h-3.5" />
            <span className="text-[11px] text-gray-500">Kena Agency Fee ({agencyFeePercent}%)</span>
          </label>
        )}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={item.showInInvoiceDetail} onChange={e => onUpdate({ showInInvoiceDetail: e.target.checked })} className="w-3.5 h-3.5" />
          <span className="text-[11px] text-gray-500">Tampil di Invoice Detail</span>
        </label>
        <button onClick={() => setShowDetail(d => !d)} className="text-[11px] text-indigo-500 hover:underline">
          {showDetail ? '↑ sembunyikan detail' : '+ detail teks'}
        </button>
      </div>
    </div>
  )
}
