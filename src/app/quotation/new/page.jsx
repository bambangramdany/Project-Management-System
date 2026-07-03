'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useRef } from 'react'
import QuotationForm from '@/components/QuotationForm'

function NewQuotationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [mode, setMode]               = useState('choose')   // 'choose' | 'new' | 'copy'
  const [quotations, setQuotations]   = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [search, setSearch]           = useState('')
  const [copyingId, setCopyingId]     = useState(null)
  const [copyInitial, setCopyInitial] = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef                  = useRef(null)

  // Load daftar quotation yang bisa disalin
  async function loadQuotations() {
    setLoadingList(true)
    try {
      const res = await fetch('/api/quotations')
      const data = await res.json()
      setQuotations(Array.isArray(data) ? data : (data.quotations || []))
    } catch {
      setQuotations([])
    }
    setLoadingList(false)
  }

  function openCopyMode() {
    setMode('copy')
    loadQuotations()
  }

  // Ambil full detail quotation lalu jadikan initial untuk QuotationForm
  async function selectQuotation(id) {
    setCopyingId(id)
    try {
      const res = await fetch(`/api/quotations/${id}`)
      const q = await res.json()
      // Susun initial agar QuotationForm tahu ini buat baru (bukan edit)
      // Salin semua field kecuali id/quotationNumber/status
      setCopyInitial({
        projectId: projectId || q.projectId || null,
        division:         q.division,
        clientName:       q.clientName,
        eventName:        q.eventName,
        venue:            q.venue,
        eventDate:        q.eventDate,
        location:         q.location,
        agencyFeePercent: q.agencyFeePercent,
        includesPpn:      q.includesPpn,
        ppnPercent:       q.ppnPercent,
        dpPercent:        q.dpPercent,
        dpAmount:         q.dpAmount,
        termsConditions:  q.termsConditions,
        picQuotationId:   q.picQuotationId,
        approver1Id:      q.approver1Id,
        approver2Id:      q.approver2Id,
        isAddCost:        false,
        notes:            null,
        sections:         q.sections,
        // Sengaja tidak set .id agar QuotationForm treat ini sebagai CREATE baru
      })
      setMode('new')
    } catch {
      alert('Gagal memuat quotation')
    }
    setCopyingId(null)
  }

  function handleSaved(q) {
    if (projectId) router.push(`/projects/${projectId}?tab=quotation`)
    else router.push(`/quotation/${q.id}`)
  }

  function handleCancel() {
    if (mode === 'new' || mode === 'copy') { setMode('choose'); return }
    if (projectId) router.push(`/projects/${projectId}?tab=quotation`)
    else router.back()
  }

  function downloadTemplate() {
    window.location.href = '/api/quotations/excel-template'
  }

  async function handleExcelUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (projectId) fd.append('projectId', projectId)
      const res = await fetch('/api/quotations/excel-template', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error || 'Gagal memproses file'); setUploading(false); return }
      router.push(`/quotation/${data.id}`)
    } catch {
      setUploadError('Terjadi kesalahan, coba lagi')
      setUploading(false)
    }
  }

  // ── Mode: pilih cara buat ──
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-brand-50 flex flex-col">
        <div className="max-w-2xl mx-auto px-4 py-16 space-y-8 w-full">
          <div>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-sm mb-4 flex items-center gap-1">
              ← Kembali
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Buat Quotation Baru</h1>
            <p className="text-gray-500 text-sm mt-1">Pilih cara membuat quotation</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opsi 1: Buat dari nol */}
            <button
              onClick={() => setMode('new')}
              className="text-left p-6 rounded-2xl border-2 border-gray-200 hover:border-brand hover:bg-brand-50 transition-all group"
            >
              <div className="text-3xl mb-3">📝</div>
              <h2 className="font-semibold text-gray-900 group-hover:text-brand">Buat dari Nol</h2>
              <p className="text-sm text-gray-500 mt-1">Form kosong, isi semua detail dari awal.</p>
            </button>

            {/* Opsi 2: Salin dari quotation lain */}
            <button
              onClick={openCopyMode}
              className="text-left p-6 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group"
            >
              <div className="text-3xl mb-3">📋</div>
              <h2 className="font-semibold text-gray-900 group-hover:text-indigo-700">Salin dari Quotation Lain</h2>
              <p className="text-sm text-gray-500 mt-1">Pilih quotation yang sudah ada sebagai template — semua item ter-copy, tinggal ubah yang perlu.</p>
            </button>

            {/* Opsi 3: Upload Excel */}
            <div
              className="text-left p-6 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-3xl mb-3">{uploading ? '⏳' : '📊'}</div>
              <h2 className="font-semibold text-gray-900 group-hover:text-emerald-700">
                {uploading ? 'Memproses...' : 'Upload dari Excel'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Isi template Excel lalu upload — langsung jadi Draft quotation.
              </p>
              {uploadError && (
                <p className="text-xs text-red-500 mt-2 font-medium">⚠ {uploadError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </div>
          </div>

          {/* Download template */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500 mb-3">Belum punya template Excel? Unduh dulu:</p>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-300 bg-white text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              ⬇ Download Template Excel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Mode: pilih quotation sumber ──
  if (mode === 'copy') {
    const filtered = quotations.filter(q =>
      !search.trim() ||
      q.quotationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      q.eventName?.toLowerCase().includes(search.toLowerCase()) ||
      q.clientName?.toLowerCase().includes(search.toLowerCase())
    )

    return (
      <div className="min-h-screen bg-brand-50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
          <div>
            <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-gray-600 text-sm mb-4 flex items-center gap-1">
              ← Pilih cara lain
            </button>
            <h1 className="text-xl font-bold text-gray-900">Pilih Quotation Sumber</h1>
            <p className="text-sm text-gray-500 mt-1">Semua section dan item akan disalin sebagai Draft baru.</p>
          </div>

          <input
            className="input w-full"
            placeholder="Cari nomor, nama event, atau klien..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          {loadingList ? (
            <p className="text-sm text-gray-400 text-center py-8">Memuat daftar quotation...</p>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Tidak ada quotation ditemukan.</p>
              )}
              {filtered.map(q => (
                <button
                  key={q.id}
                  onClick={() => selectQuotation(q.id)}
                  disabled={copyingId === q.id}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-400">{q.quotationNumber}</p>
                      <p className="font-semibold text-gray-900 truncate">{q.eventName}</p>
                      <p className="text-sm text-gray-500">{q.clientName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{q.status}</span>
                      {copyingId === q.id
                        ? <span className="text-xs text-indigo-500">Memuat...</span>
                        : <span className="text-indigo-500 text-sm">Pilih →</span>
                      }
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Mode: form (baru atau hasil copy) ──
  return (
    <QuotationForm
      initial={copyInitial || (projectId ? { projectId } : null)}
      onSaved={handleSaved}
      onCancel={handleCancel}
    />
  )
}

export default function NewQuotationPage() {
  return (
    <Suspense fallback={null}>
      <NewQuotationContent />
    </Suspense>
  )
}
