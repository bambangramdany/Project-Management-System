'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { isFinanceDirector } from '@/lib/rbac'

const formatRupiah = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' })

const emptyForm = { lenderName: '', principal: '', interestRate: '', tenorMonths: '', startDate: '', notes: '' }

function formatThousands(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

// Numeric input that displays thousand separators (titik) but reports a plain
// digit string to onChange.
function ThousandsInput({ value, onChange, className, placeholder }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={formatThousands(value)}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder}
    />
  )
}

// "3 hari lagi", "9 minggu lagi", "Lewat 2 hari", etc.
function countdownLabel(dueDate, now) {
  const diffMs = new Date(dueDate) - now
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (days < 0) return { text: `Lewat ${Math.abs(days)} hari`, tone: 'overdue' }
  if (days === 0) return { text: 'Hari ini', tone: 'soon' }
  if (days <= 13) return { text: `${days} hari lagi`, tone: days <= 3 ? 'soon' : 'normal' }
  return { text: `${Math.round(days / 7)} minggu lagi`, tone: 'normal' }
}

export default function DebtsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ lenderName: '', interestRate: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const canManage = status === 'authenticated' &&
    (session.user.role === 'OWNER' || session.user.role === 'FINANCE' || isFinanceDirector(session.user))
  const canView = canManage || (status === 'authenticated' && session.user.role === 'DIRECTOR')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canView) router.push('/dashboard')
  }, [status, session, router])

  const load = () => {
    setLoading(true)
    fetch('/api/debts').then(r => r.ok ? r.json() : []).then(d => {
      setDebts(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated' && canView) load()
  }, [status, session])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm(emptyForm)
      setShowForm(false)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const togglePayment = async (debtId, paymentId, action) => {
    const res = await fetch(`/api/debts/${debtId}/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) load()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menyimpan')
    }
  }

  const startEdit = (debt) => {
    setEditId(debt.id)
    setEditForm({ lenderName: debt.lenderName, interestRate: debt.interestRate ?? 0 })
  }

  const saveEdit = async (id) => {
    setSavingEdit(true)
    const res = await fetch(`/api/debts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lenderName: editForm.lenderName, interestRate: editForm.interestRate }),
    })
    setSavingEdit(false)
    if (res.ok) {
      setEditId(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menyimpan')
    }
  }

  const removeDebt = async (id) => {
    if (!confirm('Hapus catatan hutang ini beserta seluruh jadwal cicilannya?')) return
    const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menghapus')
    }
  }

  if (status !== 'authenticated' || !canView) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const now = new Date()

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hutang & Kewajiban</h1>
              <p className="text-sm text-gray-500">Daftar pinjaman, cicilan pokok & bunga/bagi hasil per bulan</p>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">
              {showForm ? 'Tutup' : '+ Tambah Hutang'}
            </button>
          )}
        </div>

        {!loading && debts.length > 0 && (
          <div className="card p-4 border-t-4 border-indigo-400 overflow-x-auto">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">📑</span>
              Summary Hutang
            </h2>
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-2">Kreditor</th>
                  <th className="py-2 pr-2 text-right">Pokok Utang</th>
                  <th className="py-2 pr-2 text-right">Bunga/Bln (%)</th>
                  <th className="py-2 pr-2 text-right">Bunga/Bln (Rp)</th>
                  <th className="py-2 pr-2">Jatuh Tempo</th>
                  <th className="py-2 pr-2">Countdown</th>
                  <th className="py-2 pr-2">Status</th>
                  {canManage && <th className="py-2 pr-2">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {debts.map(debt => {
                  const nextPayment = debt.payments.find(p => p.status === 'PENDING')
                  const countdown = nextPayment ? countdownLabel(nextPayment.dueDate, now) : null
                  const isEditing = editId === debt.id
                  return (
                    <tr key={debt.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-2 font-medium text-gray-800">
                        {isEditing ? (
                          <input className="input text-xs py-1" value={editForm.lenderName} onChange={e => setEditForm(f => ({ ...f, lenderName: e.target.value }))} />
                        ) : debt.lenderName}
                      </td>
                      <td className="py-2 pr-2 text-right text-gray-700">{formatRupiah(debt.principal)}</td>
                      <td className="py-2 pr-2 text-right text-gray-700">
                        {isEditing ? (
                          <input type="number" step="0.01" className="input text-xs py-1 w-20 text-right" value={editForm.interestRate} onChange={e => setEditForm(f => ({ ...f, interestRate: e.target.value }))} />
                        ) : `${debt.interestRate ?? 0}%`}
                      </td>
                      <td className="py-2 pr-2 text-right text-gray-700">{formatRupiah(debt.monthlyInterest)}</td>
                      <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">{nextPayment ? formatDate(nextPayment.dueDate) : '—'}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {countdown ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            countdown.tone === 'overdue' ? 'bg-red-100 text-red-700' :
                            countdown.tone === 'soon' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>{countdown.text}</span>
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${debt.status === 'PAID_OFF' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {debt.status === 'PAID_OFF' ? 'Lunas' : 'Aktif'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(debt.id)} disabled={savingEdit} className="text-xs text-emerald-600 hover:underline font-medium">Simpan</button>
                              <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(debt)} className="text-xs text-brand-600 hover:underline font-medium">Edit</button>
                              <button onClick={() => removeDebt(debt.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {showForm && canManage && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Hutang Baru</h3>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Pemberi Pinjaman *</label>
                  <input className="input" value={form.lenderName} onChange={e => setForm(f => ({ ...f, lenderName: e.target.value }))} placeholder="Nama orang/lembaga" />
                </div>
                <div>
                  <label className="label">Nilai Pokok Pinjaman *</label>
                  <ThousandsInput className="input" value={form.principal} onChange={v => setForm(f => ({ ...f, principal: v }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Bunga / Bagi Hasil per Bulan (%)</label>
                  <input type="number" step="0.01" className="input" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="cth. 1.75" />
                  {form.principal && form.interestRate && (
                    <p className="text-xs text-gray-400 mt-1">
                      ≈ {formatRupiah(Math.round((parseFloat(form.principal) || 0) * (parseFloat(form.interestRate) || 0) / 100))} / bulan
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Lama Pinjaman (bulan) *</label>
                  <input type="number" className="input" value={form.tenorMonths} onChange={e => setForm(f => ({ ...f, tenorMonths: e.target.value }))} placeholder="12" />
                </div>
                <div>
                  <label className="label">Tanggal Peminjaman *</label>
                  <input type="date" className="input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Catatan</label>
                <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="opsional" />
              </div>
              <p className="text-xs text-gray-400">
                Jadwal cicilan akan otomatis dibuat: pokok dibagi rata per bulan selama tenor, ditambah bunga/bagi hasil
                tetap setiap bulan, dengan tenggat jatuh tempo 1 bulan setelah tanggal peminjaman dan seterusnya.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
            </form>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
        {!loading && debts.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Belum ada catatan hutang</div>
        )}

        {!loading && debts.map(debt => {
          const totalMonthly = (debt.principal / debt.tenorMonths) + debt.monthlyInterest
          const paidCount = debt.payments.filter(p => p.status === 'PAID').length
          const remainingPrincipal = debt.payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.principalAmount, 0)
          const isExpanded = expanded === debt.id

          return (
            <div key={debt.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{debt.lenderName}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${debt.status === 'PAID_OFF' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {debt.status === 'PAID_OFF' ? 'Lunas' : 'Aktif'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pokok {formatRupiah(debt.principal)} · Tenor {debt.tenorMonths} bulan · Mulai {formatDate(debt.startDate)}
                  </p>
                  {debt.notes && <p className="text-xs text-gray-400 mt-0.5">{debt.notes}</p>}
                </div>
                {canManage && (
                  <button onClick={() => removeDebt(debt.id)} className="text-xs text-gray-400 hover:text-red-500 shrink-0">Hapus</button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-[11px] text-gray-500">Sisa Pokok</p>
                  <p className="text-sm font-bold text-gray-900">{formatRupiah(remainingPrincipal)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-[11px] text-gray-500">Bunga/Bagi Hasil per Bulan</p>
                  <p className="text-sm font-bold text-gray-900">{formatRupiah(debt.monthlyInterest)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-[11px] text-gray-500">Cicilan per Bulan</p>
                  <p className="text-sm font-bold text-gray-900">{formatRupiah(totalMonthly)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-[11px] text-gray-500">Progress</p>
                  <p className="text-sm font-bold text-gray-900">{paidCount}/{debt.tenorMonths} bulan</p>
                </div>
              </div>

              <button onClick={() => setExpanded(isExpanded ? null : debt.id)} className="text-xs font-medium text-brand hover:underline mt-3">
                {isExpanded ? 'Sembunyikan jadwal cicilan' : 'Lihat jadwal cicilan'}
              </button>

              {isExpanded && (
                <div className="mt-3 divide-y divide-gray-50 border-t border-gray-100">
                  {debt.payments.map(p => {
                    const total = p.principalAmount + p.interestAmount
                    const overdue = p.status === 'PENDING' && new Date(p.dueDate) < now
                    return (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="text-gray-800">
                            Cicilan ke-{p.installmentNo} · {formatDate(p.dueDate)}
                            {overdue && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Lewat Tenggat</span>}
                          </p>
                          <p className="text-xs text-gray-400">
                            Pokok {formatRupiah(p.principalAmount)} + Bunga {formatRupiah(p.interestAmount)} = {formatRupiah(total)}
                          </p>
                        </div>
                        {canManage ? (
                          p.status === 'PAID' ? (
                            <button onClick={() => togglePayment(debt.id, p.id, 'unmark')} className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 shrink-0">Lunas ✓</button>
                          ) : (
                            <button onClick={() => togglePayment(debt.id, p.id, 'mark_paid')} className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 shrink-0">Tandai Lunas</button>
                          )
                        ) : (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.status === 'PAID' ? 'Lunas' : 'Belum'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
