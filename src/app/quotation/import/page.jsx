'use client'
import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'

const DIVISION_LABEL = { EVENT: 'Event (EO)', CREATIVE: 'Creative', PH: 'Production House (PH)' }
const STATUS_LABEL   = { DRAFT: 'Draft', SENT: 'Terkirim', WON: 'WON', LOST: 'Tidak Jadi' }
const STATUS_COLOR   = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT:  'bg-blue-100 text-blue-700',
  WON:   'bg-emerald-100 text-emerald-700',
  LOST:  'bg-red-100 text-red-500',
}

function formatRupiah(n) {
  if (!n) return 'Rp 0'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

// ── Generate bulk template Excel ──────────────────────────────────────────────
function downloadBulkTemplate() {
  const headers = [
    'No. Quotation',
    'Nama Klien',
    'Nama Event',
    'Divisi (EVENT/CREATIVE/PH)',
    'Status (WON/LOST/SENT/DRAFT)',
    'Tgl Quotation (YYYY-MM-DD)',
    'Tgl Event',
    'Venue',
    // Nilai sebelum agency fee & PPN
    'Nilai Dasar (Rp) — sebelum Agency Fee & PPN',
    // Agency fee opsional
    'Agency Fee % (opsional, cth: 10)',
    // PPN
    'Include PPN 11%? (YA/TIDAK)',
    'Catatan',
  ]
  const examples = [
    // Contoh 1: ada agency fee 10%, ada PPN → grand total = 500jt * 1.10 * 1.11 = 610.5jt
    ['WTM/EO/QUOT/2025/001', 'PT Contoh Klien', 'Annual Gathering 2025', 'EVENT', 'WON', '2025-03-01', '15-16 Maret 2025', 'Hotel Mulia Jakarta', 500000000, 10, 'YA', 'Nilai dasar 500jt + agency 10% + PPN 11%'],
    // Contoh 2: tidak ada agency fee, tidak ada PPN → nilai dasar = final
    ['WTM/EO/QUOT/2025/002', 'CV Maju Bersama', 'Product Launch Maju X1', 'EVENT', 'WON', '2025-04-15', '20 April 2025', 'Grand Hyatt', 300000000, 0, 'TIDAK', ''],
    // Contoh 3: hanya PPN, no agency fee
    ['WTM/PH/QUOT/2025/001', 'PT Video Kreatif', 'Company Profile 2025', 'PH', 'LOST', '2025-05-01', '', '', 150000000, 0, 'YA', 'Kalah dari kompetitor'],
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
  // Column widths
  ws['!cols'] = [18, 22, 28, 20, 22, 18, 16, 22, 18, 24].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'Import Quotation')
  XLSX.writeFile(wb, 'template-import-quotation.xlsx')
}

export default function QuotationImportPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const fileInputBulk = useRef(null)
  const fileInputTemplate = useRef(null)

  const [mode, setMode] = useState('bulk')           // 'bulk' | 'template'
  const [step, setStep] = useState('upload')         // 'upload' | 'preview' | 'done'
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [rows, setRows] = useState([])               // parsed quotations (editable)
  const [result, setResult] = useState(null)         // import result
  const [dragOver, setDragOver] = useState(false)

  const canManage = session && ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER'].includes(session.user.role)

  async function parseFile(file) {
    if (!file) return
    setParsing(true)
    setWarnings([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', mode)
      const res = await fetch('/api/quotations/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal parse')
      setWarnings(data.warnings || [])
      setRows((data.quotations || []).map((q, i) => ({ ...q, _key: i, _include: true })))
      setStep('preview')
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setParsing(false)
    }
  }

  function handleFileChange(e) { parseFile(e.target.files[0]) }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [mode])

  function updateRow(idx, patch) {
    setRows(r => r.map((row, i) => i === idx ? { ...row, ...patch } : row))
  }

  async function doImport() {
    const toImport = rows.filter(r => r._include)
    if (toImport.length === 0) { alert('Pilih minimal satu quotation untuk diimport.'); return }
    setImporting(true)
    try {
      const res = await fetch('/api/quotations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotations: toImport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal import')
      setResult(data)
      setStep('done')
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setImporting(false)
    }
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-700">Akses ditolak</p>
          <p className="text-sm text-gray-400">Halaman ini hanya untuk Project Manager, Direktur, dan Owner.</p>
          <Link href="/quotation" className="text-sm text-violet-600 hover:underline">← Kembali</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/quotation" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Import Quotation Lama</h1>
          <p className="text-xs text-gray-400">Upload quotation sebelum sistem launching agar masuk ke tracker</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Step: Upload ────────────────────────────────────────────────── */}
        {step === 'upload' && (
          <>
            {/* Mode selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('bulk')}
                className={`rounded-2xl border-2 p-5 text-left transition-all ${mode === 'bulk' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300 bg-white'}`}
              >
                <div className="text-2xl mb-2">📊</div>
                <p className="font-bold text-gray-900 text-sm">Import Massal via Template</p>
                <p className="text-xs text-gray-500 mt-1">Satu file Excel berisi banyak quotation — setiap baris = satu quotation. <strong>Cara tercepat</strong> untuk registrasi semua quotation lama sekaligus.</p>
                {mode === 'bulk' && (
                  <button
                    onClick={e => { e.stopPropagation(); downloadBulkTemplate() }}
                    className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium"
                  >
                    ⬇ Unduh Template Excel
                  </button>
                )}
              </button>

              <button
                onClick={() => setMode('template')}
                className={`rounded-2xl border-2 p-5 text-left transition-all ${mode === 'template' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300 bg-white'}`}
              >
                <div className="text-2xl mb-2">📄</div>
                <p className="font-bold text-gray-900 text-sm">Import dari Template Watermark</p>
                <p className="text-xs text-gray-500 mt-1">Upload langsung file Excel quotation format Watermark yang sudah ada. Sistem akan baca otomatis nama klien, event, dan semua item rincian.</p>
                {mode === 'template' && (
                  <p className="mt-2 text-xs text-violet-700 font-medium">Upload satu file per quotation ↓</p>
                )}
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed transition-all p-12 text-center cursor-pointer ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50/40 bg-white'}`}
              onClick={() => (mode === 'bulk' ? fileInputBulk : fileInputTemplate).current?.click()}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Membaca file...</p>
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-3">📂</div>
                  <p className="font-semibold text-gray-700">Drag & drop file Excel di sini</p>
                  <p className="text-sm text-gray-400 mt-1">atau klik untuk pilih file (.xlsx, .xls, .csv)</p>
                </>
              )}
              <input ref={fileInputBulk} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
              <input ref={fileInputTemplate} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Tips */}
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-2">
              <p className="text-xs font-bold text-blue-800">💡 Tips sebelum upload</p>
              {mode === 'bulk' ? (
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Unduh template Excel di atas → isi data quotation lama (satu baris per quotation)</li>
                  <li>Kolom <strong>No. Quotation</strong> bisa dikosongkan (sistem auto-generate) atau diisi dengan nomor asli</li>
                  <li>Kolom <strong>Nilai Total</strong> diisi angka saja tanpa titik/koma ribuan</li>
                  <li>Semua kolom opsional kecuali Nama Klien dan Nama Event</li>
                </ul>
              ) : (
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Upload satu file Excel quotation Watermark per upload</li>
                  <li>Sistem akan baca: nomor quotation, nama klien, nama event, dan semua item</li>
                  <li>Jika ada data yang tidak terbaca, bisa diedit manual di halaman preview</li>
                  <li>Setelah import, buka quotation dan lengkapi data yang kurang</li>
                </ul>
              )}
            </div>
          </>
        )}

        {/* ── Step: Preview ────────────────────────────────────────────────── */}
        {step === 'preview' && (
          <>
            {warnings.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1">
                <p className="text-xs font-bold text-amber-800">⚠ Peringatan</p>
                {warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">{w}</p>)}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-gray-900">Preview hasil parsing — {rows.filter(r => r._include).length} dari {rows.length} dipilih</p>
                <p className="text-xs text-gray-400">Centang quotation yang ingin diimport, edit data yang perlu diperbaiki.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStep('upload'); setRows([]) }} className="btn-secondary text-sm">← Upload Ulang</button>
                <button
                  onClick={doImport}
                  disabled={importing || rows.filter(r => r._include).length === 0}
                  className="btn-primary text-sm disabled:opacity-60"
                >
                  {importing ? 'Mengimport...' : `✓ Import ${rows.filter(r => r._include).length} Quotation`}
                </button>
              </div>
            </div>

            {/* Select all / deselect all */}
            <div className="flex items-center gap-3">
              <button onClick={() => setRows(r => r.map(q => ({ ...q, _include: true })))} className="text-xs text-violet-600 hover:underline">Pilih Semua</button>
              <button onClick={() => setRows(r => r.map(q => ({ ...q, _include: false })))} className="text-xs text-gray-400 hover:underline">Batal Semua</button>
            </div>

            <div className="space-y-4">
              {rows.map((q, idx) => (
                <div key={q._key} className={`rounded-2xl border-2 p-4 transition-all ${q._include ? 'border-violet-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!q._include}
                      onChange={e => updateRow(idx, { _include: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-violet-600 shrink-0"
                    />
                    <div className="flex-1 space-y-3">
                      {/* Row 1: quotation number + division + status */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">No. Quotation</label>
                          <input
                            className="input mt-0.5 text-xs font-mono"
                            value={q.quotationNumber || ''}
                            onChange={e => updateRow(idx, { quotationNumber: e.target.value })}
                            placeholder="Kosongkan = auto-generate"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Divisi</label>
                          <select className="select mt-0.5 text-xs" value={q.division || 'EVENT'} onChange={e => updateRow(idx, { division: e.target.value })}>
                            {Object.entries(DIVISION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</label>
                          <select className="select mt-0.5 text-xs" value={q.status || 'WON'} onChange={e => updateRow(idx, { status: e.target.value })}>
                            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: client + event */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nama Klien *</label>
                          <input
                            className={`input mt-0.5 text-sm ${!q.clientName ? 'border-red-300 bg-red-50' : ''}`}
                            value={q.clientName || ''}
                            onChange={e => updateRow(idx, { clientName: e.target.value })}
                            placeholder="Nama klien (wajib)"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nama Event / Project *</label>
                          <input
                            className={`input mt-0.5 text-sm ${!q.eventName ? 'border-red-300 bg-red-50' : ''}`}
                            value={q.eventName || ''}
                            onChange={e => updateRow(idx, { eventName: e.target.value })}
                            placeholder="Nama event (wajib)"
                          />
                        </div>
                      </div>

                      {/* Row 3: venue + event date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Venue</label>
                          <input className="input mt-0.5 text-xs" value={q.venue || ''} onChange={e => updateRow(idx, { venue: e.target.value })} placeholder="opsional" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tanggal Event</label>
                          <input className="input mt-0.5 text-xs" value={q.eventDate || ''} onChange={e => updateRow(idx, { eventDate: e.target.value })} placeholder="cth. 15-16 Maret 2025" />
                        </div>
                      </div>

                      {/* Agency fee + PPN toggles */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Agency Fee %</label>
                          <input
                            type="number" min="0" max="100" step="0.5"
                            className="input mt-0.5 text-xs"
                            value={q.agencyFeePercent ?? 0}
                            onChange={e => updateRow(idx, { agencyFeePercent: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 text-xs cursor-pointer pb-1">
                            <input type="checkbox" checked={!!q.includesPpn} onChange={e => updateRow(idx, { includesPpn: e.target.checked })} className="accent-violet-600" />
                            <span className="text-gray-700 font-medium">Include PPN 11%</span>
                          </label>
                        </div>
                      </div>

                      {/* Items summary + grand total breakdown */}
                      {q.sections && q.sections.length > 0 && (
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                            Rincian Item ({q.sections.reduce((s, sec) => s + sec.items.length, 0)} item, {q.sections.length} seksi)
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {q.sections.map((sec, si) => (
                              <div key={si}>
                                <p className="text-[11px] font-bold text-violet-700">{sec.letter}. {sec.name}</p>
                                {sec.items.map((item, ii) => (
                                  <div key={ii} className="flex justify-between text-xs text-gray-600 py-0.5 pl-3">
                                    <span className="truncate flex-1 pr-2">{item.description}</span>
                                    <span className="shrink-0 text-gray-500">{item.qty} × {formatRupiah(item.rate)} = <strong>{formatRupiah(item.subtotal)}</strong></span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                          {/* Breakdown: base → agency → PPN → grand total */}
                          {(() => {
                            const base      = q.sections.flatMap(s => s.items).reduce((sum, it) => sum + (it.subtotal || 0), 0)
                            const agencyAmt = base * ((q.agencyFeePercent || 0) / 100)
                            const ppnBase   = base + agencyAmt
                            const ppnAmt    = q.includesPpn ? ppnBase * 0.11 : 0
                            const grand     = ppnBase + ppnAmt
                            return (
                              <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5 text-xs">
                                <div className="flex justify-between text-gray-500">
                                  <span>Nilai Dasar</span>
                                  <span>{formatRupiah(base)}</span>
                                </div>
                                {agencyAmt > 0 && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Agency Fee {q.agencyFeePercent}%</span>
                                    <span>{formatRupiah(agencyAmt)}</span>
                                  </div>
                                )}
                                {ppnAmt > 0 && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>PPN 11%</span>
                                    <span>{formatRupiah(ppnAmt)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                                  <span>Grand Total</span>
                                  <span>{formatRupiah(grand)}</span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Catatan</label>
                        <input className="input mt-0.5 text-xs" value={q.notes || ''} onChange={e => updateRow(idx, { notes: e.target.value })} placeholder="opsional" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom action bar */}
            <div className="sticky bottom-4 flex justify-end">
              <button
                onClick={doImport}
                disabled={importing || rows.filter(r => r._include).length === 0}
                className="btn-primary px-8 py-3 text-sm shadow-xl disabled:opacity-60"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                    Mengimport...
                  </span>
                ) : `✓ Import ${rows.filter(r => r._include).length} Quotation`}
              </button>
            </div>
          </>
        )}

        {/* ── Step: Done ───────────────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-6 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="text-xl font-bold text-emerald-800">{result.created} Quotation Berhasil Diimport!</p>
              {result.failed.length > 0 && (
                <p className="text-sm text-amber-700">{result.failed.length} gagal diimport (lihat detail di bawah)</p>
              )}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link href="/quotation" className="btn-primary text-sm">← Ke Daftar Quotation</Link>
                <button onClick={() => { setStep('upload'); setRows([]); setResult(null) }} className="btn-secondary text-sm">Import Lagi</button>
              </div>
            </div>

            {/* Success list */}
            {result.records.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-700">✓ Berhasil diimport:</p>
                {result.records.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-2.5">
                    <div>
                      <span className="text-xs font-mono text-violet-600 font-bold mr-2">{r.quotationNumber}</span>
                      <span className="text-sm text-gray-800">{r.clientName} — {r.eventName}</span>
                    </div>
                    <Link href={`/quotation/${r.id}`} className="text-xs text-violet-600 hover:underline shrink-0">Buka ↗</Link>
                  </div>
                ))}
              </div>
            )}

            {/* Failed list */}
            {result.failed.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-red-700">✗ Gagal:</p>
                {result.failed.map(f => (
                  <div key={f.idx} className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-2.5 text-xs">
                    <span className="font-medium text-red-700">{f.quotationNumber || `Baris ${f.idx + 1}`}:</span>
                    <span className="text-red-600 ml-2">{f.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
