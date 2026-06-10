'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { isFinanceDirector } from '@/lib/rbac'

const formatRupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

export default function CashflowPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'IN', amount: '', description: '', date: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const allowed = status === 'authenticated' &&
    (session.user.role === 'OWNER' || session.user.role === 'FINANCE' || isFinanceDirector(session.user))

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !allowed) router.push('/dashboard')
  }, [status, session, router])

  const load = () => {
    setLoading(true)
    fetch('/api/cashflow/transactions').then(r => r.ok ? r.json() : null).then(d => {
      setData(d)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated' && allowed) load()
  }, [status, session])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const amount = parseFloat(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) { setError('Nominal tidak valid'); return }
    if (!form.description.trim()) { setError('Keterangan wajib diisi'); return }
    setSubmitting(true)
    const res = await fetch('/api/cashflow/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm({ type: 'IN', amount: '', description: '', date: '' })
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const remove = async (id) => {
    if (!confirm('Hapus catatan kas ini?')) return
    const res = await fetch(`/api/cashflow/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menghapus')
    }
  }

  if (status !== 'authenticated' || !allowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kas Operasional</h1>
            <p className="text-sm text-gray-500">Catat uang masuk & keluar untuk memantau saldo kas perusahaan</p>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500">Saldo Kas</p>
              <p className={`text-2xl font-bold ${data.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(data.balance)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Total Masuk</p>
              <p className="text-lg font-bold text-green-600">{formatRupiah(data.totalIn)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500">Total Keluar</p>
              <p className="text-lg font-bold text-red-600">{formatRupiah(data.totalOut)}</p>
            </div>
          </div>
        )}

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Catatan Kas</h3>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Tipe</label>
                <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="IN">Kas Masuk</option>
                  <option value="OUT">Kas Keluar</option>
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
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="contoh: Pembayaran DP klien Project X" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
          </form>
        </div>

        <div className="card divide-y divide-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 px-5 py-3">Riwayat Transaksi Kas</h3>
          {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
          {!loading && data?.transactions.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Belum ada catatan kas</div>
          )}
          {!loading && data?.transactions.map(tx => (
            <div key={tx.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  {tx.description}
                  {tx.paymentRequest && (
                    <span className="text-xs text-gray-400"> · {tx.paymentRequest.project.code}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(tx.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  {tx.recordedBy && ` · dicatat oleh ${tx.recordedBy.name}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'IN' ? '+' : '-'}{formatRupiah(tx.amount)}
                </p>
                {!tx.paymentRequestId && (
                  <button onClick={() => remove(tx.id)} className="text-[10px] text-gray-400 hover:text-red-500">Hapus</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
