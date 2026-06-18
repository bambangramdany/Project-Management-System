'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { isFinanceDirector } from '@/lib/rbac'
import { ASSET_CATEGORY_LABEL, ASSET_CONDITION_LABEL } from '@/lib/constants'

const formatRupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

const CONDITION_COLOR = {
  BAIK: 'bg-green-100 text-green-700',
  RUSAK_RINGAN: 'bg-yellow-100 text-yellow-700',
  RUSAK_BERAT: 'bg-red-100 text-red-700',
}

const EMPTY_FORM = { name: '', category: 'EQUIPMENT', condition: 'BAIK', acquisitionCost: '', currentValue: '', acquisitionDate: '', notes: '' }

export default function AssetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const allowed = status === 'authenticated' &&
    (session.user.role === 'OWNER' || session.user.role === 'FINANCE' || session.user.role === 'FINANCE_STAFF' || isFinanceDirector(session.user))

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !allowed) router.push('/dashboard')
  }, [status, session, router])

  const load = () => {
    setLoading(true)
    fetch(`/api/assets?category=${category}`).then(r => r.ok ? r.json() : null).then(d => {
      setData(d)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated' && allowed) load()
  }, [status, session, category])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Nama aset wajib diisi'); return }
    const acquisitionCost = parseFloat(form.acquisitionCost)
    if (!Number.isFinite(acquisitionCost) || acquisitionCost < 0) { setError('Harga perolehan tidak valid'); return }
    setSubmitting(true)
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, currentValue: form.currentValue === '' ? form.acquisitionCost : form.currentValue }),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const remove = async (id) => {
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else {
      const d = await res.json().catch(() => ({}))
      setConfirmDeleteId(null)
      alert(d.error || 'Gagal menghapus')
    }
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Aset</h1>
              <p className="text-sm text-gray-500">Kelola inventaris aset perusahaan</p>
            </div>
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">{showForm ? 'Tutup' : '+ Tambah Aset'}</button>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500">Total Nilai Aset</p>
              <p className="text-2xl font-bold text-brand-700">{formatRupiah(data.totalValue)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.count} aset</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Harga Perolehan</p>
              <p className="text-lg font-bold text-gray-700">{formatRupiah(data.totalCost)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.count} aset</p>
            </div>
            <div className="card p-4 bg-red-50 border border-red-100">
              <p className="text-xs text-gray-500">Total Depresiasi</p>
              <p className={`text-lg font-bold ${data.totalDepreciation < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatRupiah(data.totalDepreciation)}</p>
              <p className="text-xs text-gray-400 mt-1">{data.count} aset</p>
            </div>
          </div>
        )}

        {showForm && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Aset</h3>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">Nama Aset</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="contoh: Toyota Avanza B 1234 XYZ" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Kategori</label>
                  <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {Object.entries(ASSET_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Kondisi</label>
                  <select className="select" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                    {Object.entries(ASSET_CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Harga Perolehan</label>
                  <input type="number" className="input" value={form.acquisitionCost} onChange={e => setForm(f => ({ ...f, acquisitionCost: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Nilai Saat Ini</label>
                  <input type="number" className="input" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} placeholder="default = harga perolehan" />
                </div>
                <div>
                  <label className="label">Tanggal Perolehan</label>
                  <input type="date" className="input" value={form.acquisitionDate} onChange={e => setForm(f => ({ ...f, acquisitionDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Catatan</label>
                <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="opsional" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        )}

        <div className="card p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Kategori</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory('ALL')} className={`text-xs px-3 py-1.5 rounded-full ${category === 'ALL' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}>Semua</button>
            {Object.entries(ASSET_CATEGORY_LABEL).map(([k, v]) => (
              <button key={k} onClick={() => setCategory(k)} className={`text-xs px-3 py-1.5 rounded-full ${category === k ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}>{v}</button>
            ))}
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                <th className="px-4 py-2.5">Nama Aset</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Kategori</th>
                <th className="px-4 py-2.5">Kondisi</th>
                <th className="px-4 py-2.5 text-right">Harga Perolehan</th>
                <th className="px-4 py-2.5 text-right">Nilai Saat Ini</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Tanggal</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Memuat...</td></tr>
              )}
              {!loading && data?.assets.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Belum ada aset</td></tr>
              )}
              {!loading && data?.assets.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {a.name}
                    {a.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{a.notes}</p>}
                    <p className="text-[10px] text-gray-400 sm:hidden mt-0.5">{new Date(a.acquisitionDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{ASSET_CATEGORY_LABEL[a.category]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CONDITION_COLOR[a.condition]}`}>{ASSET_CONDITION_LABEL[a.condition]}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{formatRupiah(a.acquisitionCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700 whitespace-nowrap">{formatRupiah(a.currentValue)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{new Date(a.acquisitionDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {confirmDeleteId === a.id ? (
                      <span className="inline-flex items-center gap-1">
                        <button onClick={() => remove(a.id)} className="text-xs px-2 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">Batal</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(a.id)} className="text-xs text-gray-400 hover:text-red-500">Hapus</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
