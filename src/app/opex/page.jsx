'use client'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { isFinanceDirector } from '@/lib/rbac'
import { OPEX_CATEGORIES } from '@/lib/constants'

const formatRupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function periodLabel(period) {
  const [y, m] = period.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

export default function OpexPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState(currentPeriod())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ category: OPEX_CATEGORIES[0], amount: '', description: '', date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const allowed = status === 'authenticated' &&
    (session.user.role === 'OWNER' || session.user.role === 'FINANCE' || isFinanceDirector(session.user))

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !allowed) router.push('/dashboard')
  }, [status, session, router])

  const load = () => {
    setLoading(true)
    fetch(`/api/opex?period=${period}`).then(r => r.ok ? r.json() : null).then(d => {
      setData(d)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated' && allowed) load()
  }, [status, session, period])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const amount = parseFloat(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) { setError('Nominal tidak valid'); return }
    if (!form.description.trim()) { setError('Keterangan wajib diisi'); return }
    setSubmitting(true)
    const res = await fetch('/api/opex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm({ category: OPEX_CATEGORIES[0], amount: '', description: '', date: '' })
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const remove = async (id) => {
    const res = await fetch(`/api/opex/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else {
      const d = await res.json().catch(() => ({}))
      setConfirmDeleteId(null)
      alert(d.error || 'Gagal menghapus')
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/opex/import', { method: 'POST', body: fd })
    setImporting(false)
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setImportResult(d)
      load()
    } else {
      setImportResult({ error: d.error || 'Gagal mengimpor file' })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (status !== 'authenticated' || !allowed) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Opex (Pengeluaran Operasional)</h1>
            <p className="text-sm text-gray-500">Kelola pengeluaran operasional bulanan</p>
          </div>
        </div>

        <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t-4 border-blue-400">
          <div>
            <label className="label">Pilih Bulan</label>
            <input type="month" className="input w-auto" value={period} onChange={e => setPeriod(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              {importing ? 'Mengunggah...' : '⬆ Upload Excel/CSV'}
            </button>
          </div>
        </div>

        {importResult && (
          <div className={`card p-3 text-sm ${importResult.error ? 'border-l-4 border-red-400 text-red-600' : 'border-l-4 border-green-400 text-green-700'}`}>
            {importResult.error ? importResult.error : (
              <>
                Berhasil mengimpor {importResult.imported} entri{importResult.skipped > 0 && `, ${importResult.skipped} dilewati`}.
                {importResult.errors?.length > 0 && (
                  <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        <div className="card p-4 border-t-4 border-orange-400">
          <p className="text-sm font-semibold text-gray-700 mb-3">Ringkasan {periodLabel(period)}</p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500">Total Opex</p>
              <p className="text-2xl font-bold text-gray-900">{formatRupiah(data?.total)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Jumlah Item</p>
              <p className="text-2xl font-bold text-gray-900">{data?.count || 0}</p>
            </div>
          </div>
          {data?.byCategory && Object.keys(data.byCategory).length > 0 && (
            <div className="pt-3 border-t border-gray-100 space-y-1.5">
              {Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{cat}</span>
                  <span className="font-medium text-gray-800">{formatRupiah(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 border-t-4 border-emerald-400">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Opex</h3>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Kategori</label>
                <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {OPEX_CATEGORIES.filter(c => c !== 'Beban Project Reguler').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Nominal</label>
                <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Keterangan</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="contoh: Tagihan listrik kantor Juni" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Menyimpan...' : '+ Tambah Opex'}</button>
          </form>
        </div>

        <div className="card divide-y divide-gray-50 border-t-4 border-purple-400">
          <h3 className="text-sm font-semibold text-gray-700 px-5 py-3">Daftar Opex</h3>
          {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
          {!loading && data?.entries.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Tidak ada opex untuk bulan ini</div>
          )}
          {!loading && data?.entries.map(e => {
            const isAuto = e.isAutoSalary === true
            return (
              <div key={e.id} className={`px-5 py-3.5 flex items-start gap-3 transition-colors ${isAuto ? 'bg-violet-50 hover:bg-violet-100/60' : 'hover:bg-gray-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800">{e.description}</p>
                    {isAuto && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold border border-violet-200">
                        ⚙ otomatis · cut-off tgl 24
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.category}
                    {e.date && ` · ${new Date(e.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`}
                    {!isAuto && e.recordedBy && ` · dicatat oleh ${e.recordedBy.name}`}
                    {isAuto && ' · sumber: halaman Gaji'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${isAuto ? 'text-violet-700' : 'text-red-600'}`}>
                    -{formatRupiah(e.amount)}
                  </p>
                  {!isAuto && (
                    confirmDeleteId === e.id ? (
                      <span className="inline-flex items-center gap-1 mt-1">
                        <button onClick={() => remove(e.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Batal</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(e.id)} className="text-[10px] text-gray-400 hover:text-red-500">Hapus</button>
                    )
                  )}
                  {isAuto && <p className="text-[10px] text-violet-400 mt-0.5">tidak dapat dihapus</p>}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
