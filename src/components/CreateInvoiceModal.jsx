'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// Modal to create an Invoice from a WON Quotation.
// Props:
//   quotation — full quotation object (with sections + items)
//   onClose   — called when modal should close
//   onCreated — called with the new invoice object after creation
export default function CreateInvoiceModal({ quotation, onClose, onCreated }) {
  const router = useRouter()

  // Compute base totals
  function computeTotals(items, agFee, pvn, ppnPct) {
    let sub = 0, agBase = 0
    items.forEach(it => { sub += it.subtotal||0; if (it.includeAgencyFee) agBase += it.subtotal||0 })
    const agencyFeeAmt = agBase * ((agFee||0)/100)
    const ppnAmt = pvn ? (sub + agencyFeeAmt) * ((ppnPct||11)/100) : 0
    return { sub, agencyFeeAmt, ppnAmt, grand: sub + agencyFeeAmt + ppnAmt }
  }

  const allItems = (quotation.sections || []).flatMap(s => s.items || [])
  const totals   = computeTotals(allItems, quotation.agencyFeePercent, quotation.includesPpn, quotation.ppnPercent)

  const [mode,              setMode]              = useState('DETAIL')
  const [invoiceNumber,     setInvoiceNumber]     = useState('')          // kosong = auto-generate
  const [loadingNum,        setLoadingNum]        = useState(true)
  const [financeClientName, setFinanceClientName] = useState(quotation.clientName || '')
  const [financeEventName,  setFinanceEventName]  = useState(quotation.eventName  || '')
  const [poNumber,          setPoNumber]          = useState('')
  const [taxInvoiceNumber,  setTaxInvoiceNumber]  = useState('')
  const [picFinanceName,    setPicFinanceName]     = useState('')
  const [picFinancePhone,   setPicFinancePhone]    = useState('')
  const [issueDate,         setIssueDate]         = useState(new Date().toISOString().slice(0,10))
  const [dueDate,           setDueDate]           = useState('')
  const [notes,             setNotes]             = useState('')

  // DP options
  const [isDP,          setIsDP]          = useState(!!quotation.dpPercent || !!quotation.dpAmount)
  const [dpExcludePpn,  setDpExcludePpn]  = useState(false)
  const [dpAmount,      setDpAmount]       = useState(() => {
    if (quotation.dpAmount) return String(quotation.dpAmount)
    if (quotation.dpPercent) return String(Math.round(totals.grand * quotation.dpPercent / 100))
    return ''
  })

  // Total override (default = full grand total, or DP amount if DP)
  const [totalOverride, setTotalOverride] = useState('')

  const effectiveTotal = totalOverride
    ? parseFloat(totalOverride)
    : isDP && dpAmount
      ? parseFloat(dpAmount)
      : totals.grand

  // Ambil nomor invoice berikutnya saat modal dibuka
  useEffect(() => {
    const div = quotation.division === 'PH' ? 'PH' : 'EO'
    fetch(`/api/invoices?nextNumber=${div}`)
      .then(r => r.json())
      .then(d => { setInvoiceNumber(d.nextNumber || ''); setLoadingNum(false) })
      .catch(() => setLoadingNum(false))
  }, [])

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function submit() {
    setError('')
    if (!financeClientName.trim()) { setError('Nama klien wajib diisi'); return }
    setSaving(true)

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quotationId:       quotation.id,
        invoiceNumber:     invoiceNumber.trim() || undefined,  // undefined = auto-generate
        mode,
        isDP,
        dpAmount:          isDP ? parseFloat(dpAmount) || null : null,
        dpExcludePpn:      isDP ? dpExcludePpn : false,
        totalAmount:       effectiveTotal,
        financeClientName: financeClientName.trim(),
        financeEventName:  financeEventName.trim(),
        poNumber:          poNumber          || null,
        taxInvoiceNumber:  taxInvoiceNumber  || null,
        picFinanceName:    picFinanceName     || null,
        picFinancePhone:   picFinancePhone    || null,
        issueDate:         issueDate || null,
        dueDate:           dueDate   || null,
        notes:             notes     || null,
      }),
    })

    setSaving(false)

    if (res.ok) {
      const inv = await res.json()
      onCreated?.(inv)
      router.push(`/invoice/${inv.id}`)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal membuat invoice')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Buat Invoice</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{quotation.quotationNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Nomor Invoice — editable */}
          <div>
            <label className="label">
              Nomor Invoice
              <span className="text-gray-400 font-normal ml-1">(otomatis urut — ubah jika perlu)</span>
            </label>
            <input
              className="input font-mono"
              value={loadingNum ? 'Memuat...' : invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              disabled={loadingNum}
              placeholder="WTM/EO/INV/2026/001"
            />
          </div>

          {/* Totals summary */}
          <div className="bg-gray-50 rounded-lg p-3 flex flex-wrap gap-4 text-sm">
            <div><span className="text-gray-500">Sub Total:</span> <span className="font-medium">{fmt(totals.sub)}</span></div>
            {quotation.agencyFeePercent > 0 && <div><span className="text-gray-500">Agency Fee:</span> <span className="font-medium">{fmt(totals.agencyFeeAmt)}</span></div>}
            {quotation.includesPpn && <div><span className="text-gray-500">PPN:</span> <span className="font-medium">{fmt(totals.ppnAmt)}</span></div>}
            <div className="ml-auto"><span className="text-gray-500">Grand Total:</span> <span className="font-bold text-brand">{fmt(totals.grand)}</span></div>
          </div>

          {/* Mode */}
          <div>
            <label className="label">Mode PDF Invoice</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
              {['DETAIL','SUMMARY'].map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mode === m ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  {m === 'DETAIL' ? '📋 Detail (item per item)' : '📄 Summary (1 baris)'}
                </button>
              ))}
            </div>
          </div>

          {/* DP option */}
          <div className="border border-amber-200 rounded-lg p-3 space-y-2 bg-amber-50/40">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDP} onChange={e => { setIsDP(e.target.checked); if (!e.target.checked) setDpExcludePpn(false) }} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-700">Invoice ini adalah termin DP (Down Payment)</span>
            </label>
            {isDP && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="label">Nominal DP</label>
                    <input type="number" className="input" value={dpAmount}
                      onChange={e => setDpAmount(e.target.value)}
                      placeholder={`contoh: ${Math.round(totals.grand * 0.3)}`} />
                  </div>
                  {quotation.dpPercent && (
                    <div className="text-xs text-gray-400 pt-5">
                      Saran: {quotation.dpPercent}% = {fmt(totals.grand * quotation.dpPercent / 100)}
                    </div>
                  )}
                </div>
                {quotation.includesPpn && (
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input type="checkbox" checked={dpExcludePpn} onChange={e => setDpExcludePpn(e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs text-gray-600">
                      DP ini <strong>tidak termasuk PPN</strong>
                      <span className="text-gray-400 ml-1">(PPN dibayar saat pelunasan — contoh: Panorama)</span>
                    </span>
                  </label>
                )}
              </>
            )}
          </div>

          {/* Finance names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Klien (versi Finance / klien) *</label>
              <input className="input" value={financeClientName}
                onChange={e => setFinanceClientName(e.target.value)} />
            </div>
            <div>
              <label className="label">Nama Event / Project (versi Finance)</label>
              <input className="input" value={financeEventName}
                onChange={e => setFinanceEventName(e.target.value)} />
            </div>
            <div>
              <label className="label">No. PO Klien <span className="text-gray-400">(opsional)</span></label>
              <input className="input font-mono" value={poNumber}
                onChange={e => setPoNumber(e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="label">No. Faktur Pajak <span className="text-gray-400">(opsional)</span></label>
              <input className="input font-mono" value={taxInvoiceNumber}
                onChange={e => setTaxInvoiceNumber(e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="label">PIC Finance (nama di dokumen)</label>
              <input className="input" value={picFinanceName}
                onChange={e => setPicFinanceName(e.target.value)} placeholder="Contoh: Antoni" />
            </div>
            <div>
              <label className="label">No. HP PIC Finance</label>
              <input className="input" value={picFinancePhone}
                onChange={e => setPicFinancePhone(e.target.value)} placeholder="0812-xxxx" />
            </div>
            <div>
              <label className="label">Tanggal Invoice</label>
              <input type="date" className="input" value={issueDate}
                onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Jatuh Tempo</label>
              <input type="date" className="input" value={dueDate}
                onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Total override */}
          <div>
            <label className="label">
              Total Invoice <span className="text-gray-400">(default: {isDP && dpAmount ? `DP ${fmt(parseFloat(dpAmount))}` : fmt(totals.grand)}{' — ubah jika ada penyesuaian'})</span>
            </label>
            <input type="number" className="input" value={totalOverride}
              onChange={e => setTotalOverride(e.target.value)}
              placeholder={String(Math.round(isDP && dpAmount ? parseFloat(dpAmount)||0 : totals.grand))} />
          </div>

          <div>
            <label className="label">Catatan</label>
            <textarea className="input h-16 resize-none" value={notes}
              onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Final total */}
          <div className="bg-brand/5 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total yang akan ditagihkan:</span>
            <span className="text-xl font-bold text-brand">{fmt(effectiveTotal)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary text-sm">Batal</button>
          <button onClick={submit} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Membuat...' : '+ Buat Invoice & Piutang'}
          </button>
        </div>
      </div>
    </div>
  )
}
