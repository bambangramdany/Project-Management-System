'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { isFinanceDirector } from '@/lib/rbac'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' })

const emptyForm = {
  lenderName: '', principal: '', interestRate: '', tenorMonths: '',
  interestCycle: '1', startDate: '', notes: '',
}

function formatThousands(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

function ThousandsInput({ value, onChange, className, placeholder }) {
  return (
    <input
      type="text" inputMode="numeric" className={className}
      value={formatThousands(value)}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder}
    />
  )
}

function countdownLabel(dueDate, now) {
  const diffMs = new Date(dueDate) - now
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (days < 0) return { text: `Lewat ${Math.abs(days)} hari`, tone: 'overdue' }
  if (days === 0) return { text: 'Hari ini', tone: 'soon' }
  if (days <= 13) return { text: `${days} hari lagi`, tone: days <= 3 ? 'soon' : 'normal' }
  return { text: `${Math.round(days / 7)} minggu lagi`, tone: 'normal' }
}

// Compute debt totals from payments list
function computeDebtTotals(debt) {
  const payments = debt.payments || []
  const totalBunga = payments
    .filter(p => p.paymentType === 'INTEREST')
    .reduce((s, p) => s + p.interestAmount, 0)
  const totalHutang = debt.principal + totalBunga
  const bungaSudahDibayar = payments
    .filter(p => p.paymentType === 'INTEREST' && p.status === 'PAID')
    .reduce((s, p) => s + p.interestAmount, 0)
  const sisaHutang = totalHutang - bungaSudahDibayar
  const pokokSudahDibayar = payments
    .filter(p => p.paymentType === 'PRINCIPAL' && p.principalStatus === 'PAID')
    .reduce((s, p) => s + p.principalAmount, 0)
  return { totalBunga, totalHutang, bungaSudahDibayar, sisaHutang, pokokSudahDibayar }
}

// Baris cicilan bunga tunggal
function InterestRow({ p, debtId, canManage, onAction, now }) {
  const overdue = p.status === 'PENDING' && new Date(p.dueDate) < now
  const paid = p.status === 'PAID'
  return (
    <div className={`py-3 flex items-center justify-between gap-3 text-sm border-b border-gray-50 ${overdue ? 'bg-red-50/40' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-700 font-medium">Cicilan Bunga ke-{p.installmentNo}</span>
          <span className="text-gray-400 text-xs">{fmtDate(p.dueDate)}</span>
          {overdue && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Lewat Tenggat</span>}
          {paid && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Lunas</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Bunga: {fmt(p.interestAmount)}</p>
      </div>
      {canManage && (
        <div className="flex gap-2 shrink-0">
          {paid ? (
            <button onClick={() => onAction(debtId, p.id, 'unmark')}
              className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200">
              Lunas ✓
            </button>
          ) : (
            <button onClick={() => onAction(debtId, p.id, 'mark_interest_paid')}
              className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
              Bayar Bunga
            </button>
          )}
        </div>
      )}
      {!canManage && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${paid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {paid ? 'Lunas' : 'Belum'}
        </span>
      )}
    </div>
  )
}

// Baris pelunasan pokok — split transfer: transfer 1 pokok, transfer 2 bunga (jika ada)
function PrincipalRow({ p, debtId, canManage, onAction, now, interestPayments }) {
  const overdue = p.status === 'PENDING' && new Date(p.dueDate) < now
  const principalPaid = p.principalStatus === 'PAID'
  // Pada baris PRINCIPAL, bunga = 0. Tapi biasanya dibayar bersamaan dengan cicilan bunga terakhir
  // yang sudah ada di InterestRow. Jadi di sini hanya ada 1 tombol: bayar pokok.
  return (
    <div className={`py-3 flex items-center justify-between gap-3 text-sm ${overdue && !principalPaid ? 'bg-red-50/40' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-900 font-semibold">Pelunasan Pokok</span>
          <span className="text-gray-400 text-xs">{fmtDate(p.dueDate)}</span>
          {overdue && !principalPaid && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Lewat Tenggat</span>}
          {principalPaid && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Lunas</span>}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Hutang Pokok: <span className="font-semibold text-gray-700">{fmt(p.principalAmount)}</span>
          {principalPaid && p.principalPaidAt && (
            <span className="text-green-600 ml-2">· dibayar {fmtDate(p.principalPaidAt)}</span>
          )}
        </p>
        <p className="text-[11px] text-amber-600 mt-0.5">
          Transfer terpisah dari cicilan bunga · jatuh tempo bersamaan dengan cicilan bunga terakhir
        </p>
      </div>
      {canManage && !principalPaid && (
        <button onClick={() => onAction(debtId, p.id, 'mark_principal_paid')}
          className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shrink-0 font-medium">
          Bayar Pokok
        </button>
      )}
      {canManage && principalPaid && (
        <button onClick={() => onAction(debtId, p.id, 'unmark')}
          className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 shrink-0">
          Lunas ✓
        </button>
      )}
      {!canManage && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${principalPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {principalPaid ? 'Lunas' : 'Belum'}
        </span>
      )}
    </div>
  )
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
  const [editDebt, setEditDebt] = useState(null)   // debt object saat modal edit terbuka
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

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
    if (res.ok) { setForm(emptyForm); setShowForm(false); load() }
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const doAction = async (debtId, paymentId, action) => {
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
    setEditDebt(debt)
    setEditForm({
      lenderName:    debt.lenderName,
      interestRate:  String(debt.interestRate ?? 0),
      principal:     String(debt.principal),
      tenorMonths:   String(debt.tenorMonths),
      interestCycle: String(debt.interestCycle ?? 1),
      notes:         debt.notes ?? '',
    })
    setEditError('')
  }

  const saveEdit = async () => {
    if (!editDebt) return
    setEditError('')
    setSavingEdit(true)
    const res = await fetch(`/api/debts/${editDebt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lenderName:   editForm.lenderName,
        interestRate: editForm.interestRate,
        notes:        editForm.notes,
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      setEditDebt(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setEditError(d.error || 'Gagal menyimpan')
    }
  }

  const removeDebt = async (id) => {
    const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else {
      const d = await res.json().catch(() => ({}))
      setConfirmDeleteId(null); alert(d.error || 'Gagal menghapus')
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

  // ── Grand summary across all active debts ──────────────────────────────────
  const grandTotals = debts.reduce((acc, debt) => {
    const t = computeDebtTotals(debt)
    return {
      totalHutang:       acc.totalHutang       + (debt.status !== 'PAID_OFF' ? t.totalHutang : 0),
      sisaHutang:        acc.sisaHutang        + (debt.status !== 'PAID_OFF' ? t.sisaHutang : 0),
      totalBunga:        acc.totalBunga        + (debt.status !== 'PAID_OFF' ? t.totalBunga : 0),
      bungaSudahDibayar: acc.bungaSudahDibayar + (debt.status !== 'PAID_OFF' ? t.bungaSudahDibayar : 0),
    }
  }, { totalHutang: 0, sisaHutang: 0, totalBunga: 0, bungaSudahDibayar: 0 })

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Hutang & Kewajiban</h1>
              <p className="text-sm text-gray-500">Skema: bunga dicicil per bulan/2 bulan · pokok dibayar saat jatuh tempo</p>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">
              {showForm ? 'Tutup' : '+ Tambah Hutang'}
            </button>
          )}
        </div>

        {/* Grand summary cards */}
        {!loading && debts.some(d => d.status !== 'PAID_OFF') && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Hutang Aktif', val: grandTotals.totalHutang, color: 'red' },
              { label: 'Sisa Hutang', val: grandTotals.sisaHutang, color: 'orange' },
              { label: 'Total Bunga', val: grandTotals.totalBunga, color: 'indigo' },
              { label: 'Bunga Sudah Dibayar', val: grandTotals.bungaSudahDibayar, color: 'green' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`card p-3 border-t-2 border-${color}-300`}>
                <p className="text-[11px] text-gray-500">{label}</p>
                <p className={`text-sm font-bold text-${color}-700 mt-0.5`}>{fmt(val)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary table */}
        {!loading && debts.length > 0 && (
          <div className="card p-4 border-t-4 border-indigo-400">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Ringkasan Hutang</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-2 pr-3">Kreditor</th>
                    <th className="py-2 pr-3 text-right">Pokok</th>
                    <th className="py-2 pr-3 text-right">Total Bunga</th>
                    <th className="py-2 pr-3 text-right">Total Hutang</th>
                    <th className="py-2 pr-3 text-right">Sisa Hutang</th>
                    <th className="py-2 pr-3">Jatuh Tempo Berikut</th>
                    <th className="py-2 pr-3">Status</th>
                    {canManage && <th className="py-2">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {debts.map(debt => {
                    const t = computeDebtTotals(debt)
                    const nextPayment = debt.payments.find(p => p.status === 'PENDING')
                    const countdown = nextPayment ? countdownLabel(nextPayment.dueDate, now) : null
                    return (
                      <tr key={debt.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800">{debt.lenderName}</td>
                        <td className="py-2 pr-3 text-right text-gray-700">{fmt(debt.principal)}</td>
                        <td className="py-2 pr-3 text-right text-indigo-600">{fmt(t.totalBunga)}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-red-700">{fmt(t.totalHutang)}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-orange-700">{fmt(t.sisaHutang)}</td>
                        <td className="py-2 pr-3 text-gray-600 whitespace-nowrap text-xs">
                          {nextPayment ? (
                            <span>{fmtDate(nextPayment.dueDate)}
                              {countdown && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                  countdown.tone === 'overdue' ? 'bg-red-100 text-red-700' :
                                  countdown.tone === 'soon' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                }`}>{countdown.text}</span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${debt.status === 'PAID_OFF' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {debt.status === 'PAID_OFF' ? 'Lunas' : 'Aktif'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-2 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(debt)} className="text-xs text-brand-600 hover:underline font-medium">Edit</button>
                              {confirmDeleteId === debt.id ? (
                                <>
                                  <button onClick={() => removeDebt(debt.id)} className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white">Ya</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                                </>
                              ) : (
                                <button onClick={() => setConfirmDeleteId(debt.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Form tambah hutang */}
        {showForm && canManage && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Hutang Baru</h3>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Pemberi Pinjaman *</label>
                  <input className="input" value={form.lenderName}
                    onChange={e => setForm(f => ({ ...f, lenderName: e.target.value }))} placeholder="Nama orang/lembaga" />
                </div>
                <div>
                  <label className="label">Nilai Pokok Pinjaman *</label>
                  <ThousandsInput className="input" value={form.principal}
                    onChange={v => setForm(f => ({ ...f, principal: v }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="label">Bunga per Siklus (%)</label>
                  <input type="number" step="0.01" className="input" value={form.interestRate}
                    onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="cth. 1.75" />
                  {form.principal && form.interestRate && (
                    <p className="text-xs text-gray-400 mt-1">
                      ≈ {fmt(Math.round((parseFloat(form.principal) || 0) * (parseFloat(form.interestRate) || 0) / 100))} / siklus
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Siklus Bayar Bunga</label>
                  <select className="input" value={form.interestCycle}
                    onChange={e => setForm(f => ({ ...f, interestCycle: e.target.value }))}>
                    <option value="1">Setiap bulan</option>
                    <option value="2">Setiap 2 bulan</option>
                  </select>
                </div>
                <div>
                  <label className="label">Jumlah Cicilan Bunga *</label>
                  <input type="number" className="input" value={form.tenorMonths}
                    onChange={e => setForm(f => ({ ...f, tenorMonths: e.target.value }))} placeholder="12" />
                  <p className="text-xs text-gray-400 mt-1">
                    {form.tenorMonths && form.interestCycle
                      ? `Pokok jatuh tempo ±${parseInt(form.tenorMonths) * parseInt(form.interestCycle)} bulan`
                      : 'Pokok dibayar di akhir'}
                  </p>
                </div>
                <div>
                  <label className="label">Tanggal Peminjaman *</label>
                  <input type="date" className="input" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Catatan</label>
                <input className="input" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="opsional" />
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                <p className="font-medium">Skema yang akan dibuat:</p>
                <p>• <span className="font-medium">{form.tenorMonths || 'N'} cicilan BUNGA</span> — dibayar setiap {form.interestCycle === '2' ? '2 bulan' : 'bulan'}, masing-masing {form.principal && form.interestRate ? fmt(Math.round((parseFloat(form.principal)||0)*(parseFloat(form.interestRate)||0)/100)) : '—'}</p>
                <p>• <span className="font-medium">1 pembayaran POKOK</span> — pelunasan penuh {form.principal ? fmt(parseFloat(form.principal)||0) : '—'} saat jatuh tempo, transfer terpisah dari bunga</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary text-sm" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan & Buat Jadwal'}
              </button>
            </form>
          </div>
        )}

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
        {!loading && debts.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Belum ada catatan hutang</div>
        )}

        {/* Detail per hutang */}
        {!loading && debts.map(debt => {
          const t = computeDebtTotals(debt)
          const isExpanded = expanded === debt.id
          const interestPayments = debt.payments.filter(p => p.paymentType === 'INTEREST')
          const principalPayment = debt.payments.find(p => p.paymentType === 'PRINCIPAL')
          const paidInterestCount = interestPayments.filter(p => p.status === 'PAID').length

          return (
            <div key={debt.id} className="card p-5">
              {/* Header kartu */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900">{debt.lenderName}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${debt.status === 'PAID_OFF' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {debt.status === 'PAID_OFF' ? 'Lunas' : 'Aktif'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pokok {fmt(debt.principal)} · {debt.tenorMonths} cicilan bunga
                    {debt.interestCycle > 1 ? ` (per ${debt.interestCycle} bulan)` : ' (per bulan)'}
                    · Mulai {fmtDate(debt.startDate)}
                  </p>
                  {debt.notes && <p className="text-xs text-gray-400 mt-0.5">{debt.notes}</p>}
                </div>
                {canManage && (
                  confirmDeleteId === debt.id ? (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <button onClick={() => removeDebt(debt.id)} className="text-xs px-2 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(debt.id)} className="text-xs text-gray-400 hover:text-red-500 shrink-0">Hapus</button>
                  )
                )}
              </div>

              {/* Summary 4 kartu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-2.5 rounded-lg bg-red-50">
                  <p className="text-[11px] text-gray-500">Total Hutang</p>
                  <p className="text-sm font-bold text-red-700">{fmt(t.totalHutang)}</p>
                  <p className="text-[10px] text-gray-400">Pokok + Semua Bunga</p>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50">
                  <p className="text-[11px] text-gray-500">Sisa Hutang</p>
                  <p className="text-sm font-bold text-orange-700">{fmt(t.sisaHutang)}</p>
                  <p className="text-[10px] text-gray-400">Total − Bunga Terbayar</p>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50">
                  <p className="text-[11px] text-gray-500">Bunga Sudah Dibayar</p>
                  <p className="text-sm font-bold text-indigo-700">{fmt(t.bungaSudahDibayar)}</p>
                  <p className="text-[10px] text-gray-400">{paidInterestCount}/{interestPayments.length} cicilan</p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50">
                  <p className="text-[11px] text-gray-500">Bunga per Siklus</p>
                  <p className="text-sm font-bold text-gray-900">{fmt(debt.monthlyInterest)}</p>
                  <p className="text-[10px] text-gray-400">{debt.interestRate}% × pokok</p>
                </div>
              </div>

              <button onClick={() => setExpanded(isExpanded ? null : debt.id)}
                className="text-xs font-medium text-brand hover:underline mt-3">
                {isExpanded ? '▲ Sembunyikan jadwal' : '▼ Lihat jadwal cicilan'}
              </button>

              {isExpanded && (
                <div className="mt-3 border-t border-gray-100">
                  {/* Cicilan Bunga */}
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-indigo-700 mb-1 uppercase tracking-wide">
                      Cicilan Bunga ({paidInterestCount}/{interestPayments.length} lunas)
                    </p>
                    {interestPayments.map(p => (
                      <InterestRow key={p.id} p={p} debtId={debt.id} canManage={canManage} onAction={doAction} now={now} />
                    ))}
                  </div>

                  {/* Pelunasan Pokok */}
                  {principalPayment && (
                    <div className="mt-4 pt-3 border-t-2 border-dashed border-amber-200">
                      <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">
                        Pelunasan Pokok — Transfer Terpisah
                      </p>
                      <PrincipalRow
                        p={principalPayment}
                        debtId={debt.id}
                        canManage={canManage}
                        onAction={doAction}
                        now={now}
                        interestPayments={interestPayments}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </main>

      {/* ── Edit Hutang Modal ──────────────────────────────────────────────── */}
      {editDebt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-900">Edit Hutang — {editDebt.lenderName}</h2>
              <button onClick={() => setEditDebt(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Nama Pemberi Pinjaman</label>
                <input className="input" value={editForm.lenderName}
                  onChange={e => setEditForm(f => ({ ...f, lenderName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Pokok Pinjaman</label>
                  <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">{fmt(editDebt.principal)}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Tidak bisa diubah — hapus & buat ulang jika perlu</p>
                </div>
                <div>
                  <label className="label">Bunga per Siklus (%)</label>
                  <input type="number" step="0.01" className="input" value={editForm.interestRate}
                    onChange={e => setEditForm(f => ({ ...f, interestRate: e.target.value }))} />
                  {editForm.interestRate && (
                    <p className="text-xs text-indigo-600 mt-1">
                      ≈ {fmt(Math.round(editDebt.principal * (parseFloat(editForm.interestRate)||0) / 100))} / siklus
                      {parseFloat(editForm.interestRate) !== editDebt.interestRate && (
                        <span className="text-amber-600 ml-1">(akan update semua cicilan belum bayar)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Jumlah Cicilan Bunga</label>
                  <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">{editDebt.tenorMonths} siklus</div>
                </div>
                <div>
                  <label className="label">Siklus Bayar</label>
                  <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">
                    Setiap {editDebt.interestCycle > 1 ? `${editDebt.interestCycle} bulan` : 'bulan'}
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Catatan</label>
                <input className="input" value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="opsional" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setEditDebt(null)} className="btn-secondary text-sm">Batal</button>
              <button onClick={saveEdit} disabled={savingEdit} className="btn-primary text-sm">
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
