'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import {
  EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL,
  PAYMENT_STATUS_LABEL, PAYMENT_STATUS_COLOR, PAYMENT_TERM_LABEL,
} from '@/lib/constants'

const FINANCE_ROLES = ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE']

function formatRupiah(n) {
  if (n === null || n === undefined) return '-'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

export default function FinancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [payments, setPayments] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ projectId: '', category: 'TICKET_TRANSPORT', amount: '', vendor: '', recipientName: '', recipientAccount: '', paymentTerm: 'FULL', description: '', neededDate: '' })
  const [loading, setLoading] = useState(true)
  const [budgetProjectId, setBudgetProjectId] = useState('')
  const [budgetItems, setBudgetItems] = useState({})
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [savingBudget, setSavingBudget] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !FINANCE_ROLES.includes(session.user.role)) router.push('/dashboard')
  }, [status, session, router])

  const fetchPayments = useCallback(() => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    fetch(`/api/payments?${params}`).then(r => r.json()).then(data => {
      setPayments(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [filterStatus])

  useEffect(() => {
    if (status === 'authenticated' && FINANCE_ROLES.includes(session.user.role)) {
      fetch('/api/projects').then(r => r.json()).then(data => setProjects(Array.isArray(data) ? data : []))
      fetchPayments()
    }
  }, [status, session, fetchPayments])

  async function submitRequest(e) {
    e.preventDefault()
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ projectId: '', category: 'TICKET_TRANSPORT', amount: '', vendor: '', recipientName: '', recipientAccount: '', paymentTerm: 'FULL', description: '', neededDate: '' })
      setShowForm(false)
      fetchPayments()
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal mengajukan')
    }
  }

  async function doAction(id, action) {
    const note = (action === 'reject') ? prompt('Catatan penolakan (opsional):') || '' : ''
    const res = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    })
    if (res.ok) fetchPayments()
    else {
      const err = await res.json()
      alert(err.error || 'Gagal')
    }
  }

  async function loadBudget(projectId) {
    setBudgetProjectId(projectId)
    setBudgetItems({})
    if (!projectId) return
    setBudgetLoading(true)
    const res = await fetch(`/api/projects/${projectId}/budget`)
    if (res.ok) {
      const data = await res.json()
      const map = {}
      data.forEach(b => { map[b.category] = b.amount })
      setBudgetItems(map)
    }
    setBudgetLoading(false)
  }

  async function saveBudget() {
    setSavingBudget(true)
    const items = EXPENSE_CATEGORIES.map(category => ({ category, amount: budgetItems[category] || 0 }))
    const res = await fetch(`/api/projects/${budgetProjectId}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setSavingBudget(false)
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || 'Gagal menyimpan')
    }
  }

  if (status !== 'authenticated' || !FINANCE_ROLES.includes(session?.user.role)) return <LoadingScreen />

  const role = session.user.role
  const canCreate = role === 'OWNER' || role === 'PROJECT_MANAGER'
  const canSeeBudgetEdit = role !== 'PROJECT_MANAGER' || true // PM can view own; edit gated server-side

  const myProjects = role === 'PROJECT_MANAGER'
    ? projects.filter(p => p.pic?.id === session.user.id || p.picId === session.user.id)
    : projects

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Finance</h1>
          {canCreate && (
            <button onClick={() => setShowForm(v => !v)} className="btn-primary self-start sm:self-auto">
              {showForm ? 'Tutup Form' : '+ Ajukan Pembayaran'}
            </button>
          )}
        </div>

        {/* Create payment request form */}
        {showForm && canCreate && (
          <form onSubmit={submitRequest} className="card p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Project *</label>
                <select className="select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required>
                  <option value="">Pilih project</option>
                  {myProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Kategori *</label>
                <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nominal (Rp) *</label>
                <input type="number" min="0" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Vendor / Tujuan</label>
                <input className="input" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Nama vendor / penerima" />
              </div>
              <div>
                <label className="label">Termin Pembayaran</label>
                <select className="select" value={form.paymentTerm} onChange={e => setForm(f => ({ ...f, paymentTerm: e.target.value }))}>
                  {Object.entries(PAYMENT_TERM_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nama Penerima</label>
                <input className="input" value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Nama pemilik rekening" />
              </div>
              <div>
                <label className="label">No. Rekening Penerima</label>
                <input className="input" value={form.recipientAccount} onChange={e => setForm(f => ({ ...f, recipientAccount: e.target.value }))} placeholder="Bank & nomor rekening" />
              </div>
              <div>
                <label className="label">Tanggal Dibutuhkan</label>
                <input type="date" className="input" value={form.neededDate} onChange={e => setForm(f => ({ ...f, neededDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Keterangan</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detail kebutuhan pembayaran..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Ajukan</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            </div>
          </form>
        )}

        {/* Budget forecast section */}
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Forecast Budget per Project</h2>
          <select className="select" value={budgetProjectId} onChange={e => loadBudget(e.target.value)}>
            <option value="">Pilih project...</option>
            {myProjects.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>

          {budgetProjectId && budgetLoading && <p className="text-sm text-gray-400">Memuat...</p>}

          {budgetProjectId && !budgetLoading && (
            <div className="space-y-2">
              {EXPENSE_CATEGORIES.map(cat => (
                <div key={cat} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-gray-600 flex-1">{EXPENSE_CATEGORY_LABEL[cat]}</label>
                  <input
                    type="number"
                    min="0"
                    className="input w-40"
                    value={budgetItems[cat] || ''}
                    onChange={e => setBudgetItems(b => ({ ...b, [cat]: e.target.value }))}
                    disabled={role === 'PROJECT_MANAGER'}
                    placeholder="0"
                  />
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Total Forecast</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatRupiah(EXPENSE_CATEGORIES.reduce((sum, c) => sum + (parseFloat(budgetItems[c]) || 0), 0))}
                </span>
              </div>
              {role !== 'PROJECT_MANAGER' && (
                <button onClick={saveBudget} disabled={savingBudget} className="btn-primary">
                  {savingBudget ? 'Menyimpan...' : 'Simpan Budget'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Payment requests list */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900">Pengajuan Pembayaran</h2>
            <select className="select w-56" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {loading && <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>}
          {!loading && payments.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Belum ada pengajuan</p>}

          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.project?.code} — {p.project?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{EXPENSE_CATEGORY_LABEL[p.category]} · {p.vendor || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${PAYMENT_STATUS_COLOR[p.status]}`}>
                    {PAYMENT_STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Nominal: <strong className="text-gray-800">{formatRupiah(p.amount)}</strong></span>
                  <span>Termin: {PAYMENT_TERM_LABEL[p.paymentTerm] || PAYMENT_TERM_LABEL.FULL}</span>
                  <span>Diajukan: {p.requestedBy?.name}</span>
                  {p.neededDate && <span>Dibutuhkan: {new Date(p.neededDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
                {(p.recipientName || p.recipientAccount) && (
                  <p className="text-xs text-gray-500">Penerima: {p.recipientName || '—'}{p.recipientAccount ? ` · ${p.recipientAccount}` : ''}</p>
                )}
                {p.description && <p className="text-xs text-gray-600">{p.description}</p>}
                {p.directorNote && <p className="text-xs text-amber-600">Catatan Direktur: {p.directorNote}</p>}

                {/* Actions */}
                {p.status === 'PENDING_DIRECTOR' && (role === 'DIRECTOR' || role === 'OWNER') && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => doAction(p.id, 'approve')} className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100 font-medium">Setujui</button>
                    <button onClick={() => doAction(p.id, 'reject')} className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100 font-medium">Tolak</button>
                  </div>
                )}
                {p.status === 'APPROVED_BY_DIRECTOR' && (role === 'FINANCE' || role === 'OWNER') && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => doAction(p.id, 'mark_paid')} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium">Tandai Sudah Dibayar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
