'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import clsx from 'clsx'
import Link from 'next/link'
import {
  EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL,
  PAYMENT_STATUS_LABEL, PAYMENT_STATUS_COLOR, PAYMENT_TERM_LABEL, PAYMENT_STAGES, PAYMENT_STAGES_WITH_OWNER,
  DIVISION_LABEL, CATEGORY_LABEL,
} from '@/lib/constants'

const FINANCE_ROLES = ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE', 'PRODUCTION']

const BUDGET_ITEM_STATUS_LABEL = {
  BELUM_DIAJUKAN: 'Belum Diajukan',
  DIAJUKAN: 'Diajukan',
  DISETUJUI: 'Disetujui Direktur',
  SEBAGIAN: 'Dibayar Sebagian',
  LUNAS: 'Lunas',
}
const BUDGET_ITEM_STATUS_COLOR = {
  BELUM_DIAJUKAN: 'bg-gray-100 text-gray-500',
  DIAJUKAN: 'bg-yellow-100 text-yellow-700',
  DISETUJUI: 'bg-blue-100 text-blue-700',
  SEBAGIAN: 'bg-amber-100 text-amber-700',
  LUNAS: 'bg-emerald-100 text-emerald-700',
}

function formatRupiah(n) {
  if (n === null || n === undefined) return '-'
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

// Plain number string -> "1.000.000" for display, strips non-digits on input
function formatThousands(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

// Numeric input that displays thousand separators (titik) but reports a plain
// digit string to onChange, so values stay submit-ready (e.g. "5000000").
function ThousandsInput({ value, onChange, className, placeholder, disabled }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={formatThousands(value)}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

// Build and trigger a CSV download from an array of row objects
function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function FinancePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [payments, setPayments] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ projectId: '', category: 'TICKET_TRANSPORT', budgetItemLabel: '', amount: '', vendor: '', recipientName: '', recipientAccount: '', paymentTerm: 'FULL', description: '', neededDate: '' })
  const [formBudgetItems, setFormBudgetItems] = useState([])
  const [formBudgetEmpty, setFormBudgetEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [budgetProjectId, setBudgetProjectId] = useState('')
  const [budgetItems, setBudgetItems] = useState({})
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [savingBudget, setSavingBudget] = useState(false)
  const [projectValue, setProjectValue] = useState('')
  const [quotationNumber, setQuotationNumber] = useState('')
  const [budgetSaved, setBudgetSaved] = useState(false)
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetConfirming, setBudgetConfirming] = useState(false)
  const [budgetMeta, setBudgetMeta] = useState({ canViewMargin: false, canEditProjectValue: false })
  const [cashflow, setCashflow] = useState(null)
  const [marginReport, setMarginReport] = useState(null)
  const [profitability, setProfitability] = useState(null)

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
    if (status === 'authenticated' && ['OWNER', 'FINANCE', 'DIRECTOR'].includes(session.user.role)) {
      fetch('/api/finance/cashflow').then(r => r.json()).then(data => setCashflow(data))
      fetch('/api/finance/margin-report').then(r => r.json()).then(data => setMarginReport(data))
      fetch('/api/finance/profitability').then(r => r.json()).then(data => setProfitability(data))
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
      setForm({ projectId: '', category: 'TICKET_TRANSPORT', budgetItemLabel: '', amount: '', vendor: '', recipientName: '', recipientAccount: '', paymentTerm: 'FULL', description: '', neededDate: '' })
      setFormBudgetItems([])
      setShowForm(false)
      fetchPayments()
      if (budgetProjectId) loadBudget(budgetProjectId)
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal mengajukan')
    }
  }

  // Load this project's existing forecast components, so the requester can pick
  // an existing component (or type a new one which becomes a new forecast line).
  async function onFormProjectChange(projectId) {
    setForm(f => ({ ...f, projectId, budgetItemLabel: '' }))
    setFormBudgetItems([])
    setFormBudgetEmpty(false)
    if (!projectId) return
    const res = await fetch(`/api/projects/${projectId}/budget`)
    if (res.ok) {
      const data = await res.json()
      const items = data.budgetItems || []
      setFormBudgetItems(items.map(b => b.label).filter(Boolean))
      setFormBudgetEmpty(items.length === 0)
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
    setBudgetItems([])
    setProjectValue('')
    setQuotationNumber('')
    setBudgetEditing(false)
    setBudgetConfirming(false)
    if (!projectId) return
    setBudgetLoading(true)
    const res = await fetch(`/api/projects/${projectId}/budget`)
    if (res.ok) {
      const data = await res.json()
      const items = data.budgetItems || []
      setBudgetItems(items.map(b => ({ ...b, neededDate: b.neededDate ? b.neededDate.slice(0, 10) : '' })))
      setProjectValue(data.projectValue ?? '')
      setQuotationNumber(data.quotationNumber ?? '')
      setBudgetSaved(items.length > 0)
      setBudgetMeta({
        canViewMargin: !!data.canViewMargin,
        canEditProjectValue: !!data.canEditProjectValue,
        canEditBudget: !!data.canEditBudget,
        canNote: !!data.canNote,
        canLockBudget: !!data.canLockBudget,
        budgetLockedAt: data.budgetLockedAt || null,
        budgetLockedBy: data.budgetLockedBy || null,
      })
    }
    setBudgetLoading(false)
  }

  function addBudgetRow() {
    setBudgetItems(items => [...items, { label: '', quotedAmount: 0, actualAmount: '', neededDate: '', note: '' }])
  }

  function updateBudgetRow(idx, patch) {
    setBudgetItems(items => items.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  function removeBudgetRow(idx) {
    setBudgetItems(items => items.filter((_, i) => i !== idx))
  }

  async function saveBudget() {
    setSavingBudget(true)
    const res = await fetch(`/api/projects/${budgetProjectId}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: budgetItems,
        projectValue: budgetMeta.canEditProjectValue ? (projectValue === '' ? null : projectValue) : undefined,
        quotationNumber: budgetMeta.canEditProjectValue ? quotationNumber : undefined,
      }),
    })
    setSavingBudget(false)
    if (res.ok) {
      const data = await res.json()
      setBudgetItems((data.budgetItems || []).map(b => ({ ...b, neededDate: b.neededDate ? b.neededDate.slice(0, 10) : '' })))
      setBudgetSaved(true)
      setBudgetEditing(false)
      setBudgetConfirming(false)
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal menyimpan')
    }
  }

  async function toggleLockBudget(lock) {
    if (lock && !confirm('Kunci forecast budget ini? Setelah dikunci, hanya nilai aktual & catatan yang bisa diubah sampai dibuka kembali.')) return
    setSavingBudget(true)
    const res = await fetch(`/api/projects/${budgetProjectId}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: budgetItems, lockAction: lock ? 'lock' : 'unlock' }),
    })
    setSavingBudget(false)
    if (res.ok) {
      await loadBudget(budgetProjectId)
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal')
    }
  }

  if (status !== 'authenticated' || !FINANCE_ROLES.includes(session?.user.role)) return <LoadingScreen />

  const role = session.user.role
  const canCreate = role === 'OWNER' || role === 'PROJECT_MANAGER' || role === 'DIRECTOR'
  const canSeeBudgetEdit = role !== 'PROJECT_MANAGER' || true // PM can view own; edit gated server-side

  const forecastLocked = budgetMeta.canEditBudget && budgetSaved && !budgetEditing && !budgetMeta.budgetLockedAt

  const myProjects = (role === 'PROJECT_MANAGER' || role === 'PRODUCTION')
    ? projects.filter(p => p.pic?.id === session.user.id || p.picId === session.user.id || p.members?.some(m => (m.user?.id || m.userId) === session.user.id))
    : (role === 'DIRECTOR' && session.user.divisi !== 'FINANCE_HRGA')
    ? projects.filter(p => p.division === session.user.divisi)
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

        {/* Cashflow forecast (Owner/Finance/Direksi only) */}
        {cashflow && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">Forecast Kebutuhan Dana Vendor</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">Total: {formatRupiah(cashflow.grandTotal)}</span>
                <button
                  onClick={() => exportCsv('cashflow-forecast.csv', cashflow.months.flatMap(m => m.items.map(it => ({
                    Bulan: m.month,
                    Tanggal: it.neededDate?.slice(0, 10),
                    Project: it.project.code,
                    Komponen: it.label,
                    Jumlah: it.amount,
                    Status: it.isActual ? 'Aktual' : 'Forecast',
                  }))))}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline"
                >Export CSV</button>
              </div>
            </div>
            {cashflow.months.length === 0 && (
              <p className="text-sm text-gray-400">Belum ada jadwal kebutuhan dana.</p>
            )}
            {cashflow.months.map(m => (
              <div key={m.month} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">
                    {new Date(m.month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-sm font-bold text-brand-700">{formatRupiah(m.total)}</span>
                </div>
                <div className="space-y-1">
                  {m.items.map(it => (
                    <div key={it.id} className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {new Date(it.neededDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · {it.project.code} — {it.label}
                        {it.isActual && <span className="ml-1 text-emerald-600">(aktual)</span>}
                      </span>
                      <span className="font-medium text-gray-800">{formatRupiah(it.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Margin report (Owner/Finance/Direksi only) */}
        {marginReport && marginReport.divisions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">Laporan Margin per Divisi</h2>
              <button
                onClick={() => exportCsv('laporan-margin.csv', marginReport.divisions.flatMap(d => d.projects.map(p => ({
                  Divisi: DIVISION_LABEL[d.division] || d.division,
                  Kode: p.code,
                  Project: p.name,
                  Status: p.status,
                  NilaiProject: p.projectValue,
                  ForecastBiaya: p.forecastCost,
                  AktualBiaya: p.actualCost,
                  MarginForecast: p.marginForecast,
                  MarginAktual: p.marginActual,
                }))))}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline"
              >Export CSV</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marginReport.divisions.map(d => (
                <div key={d.division} className="rounded-2xl bg-gradient-to-br from-brand-50 to-orange-50 border border-brand-100 p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">{DIVISION_LABEL[d.division] || d.division}</h3>
                    <span className="text-xs text-gray-500">{d.projects.length} project</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Total Nilai Project</p>
                      <p className="font-bold text-gray-900">{formatRupiah(d.totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Biaya (Aktual)</p>
                      <p className="font-bold text-gray-900">{formatRupiah(d.totalActualCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Margin (Forecast)</p>
                      <p className={clsx('font-bold', d.totalMarginForecast >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(d.totalMarginForecast)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Margin (Aktual)</p>
                      <p className={clsx('font-bold', d.totalMarginActual >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(d.totalMarginActual)}</p>
                    </div>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-brand-700 font-medium hover:text-brand-800 select-none">Detail per project</summary>
                    <div className="mt-2 space-y-1.5">
                      {d.projects.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white/60 rounded-lg px-2 py-1.5">
                          <span className="text-gray-700">{p.code} — {p.name}</span>
                          <span className={clsx('font-semibold', p.marginActual >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(p.marginActual)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profitability analysis (Owner/Finance/Direksi only) */}
        {profitability && (profitability.byClient.length > 0 || profitability.byCategory.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProfitabilityCard title="Profitabilitas per Klien" rows={profitability.byClient} labelMap={null} />
            <ProfitabilityCard title="Profitabilitas per Kategori" rows={profitability.byCategory} labelMap={CATEGORY_LABEL} />
          </div>
        )}

        {/* Revenue summary per client — total revenue across all won projects */}
        {profitability && profitability.byClient.length > 0 && (
          <RevenuePerClientCard rows={profitability.byClient} />
        )}

        {/* Profitability per project */}
        {profitability && profitability.byProject?.length > 0 && (
          <ProfitabilityByProjectCard rows={profitability.byProject} />
        )}

        {/* Create payment request form */}
        {showForm && canCreate && (
          <form onSubmit={submitRequest} className="card p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Project *</label>
                <select className="select" value={form.projectId} onChange={e => onFormProjectChange(e.target.value)} required>
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
              <div className="sm:col-span-2">
                <label className="label">Komponen Forecast (sesuai quotation)</label>
                <input
                  className="input" list="budget-item-options"
                  value={form.budgetItemLabel}
                  onChange={e => setForm(f => ({ ...f, budgetItemLabel: e.target.value }))}
                  placeholder="Pilih komponen forecast yang sudah ada, atau ketik nama baru"
                />
                <datalist id="budget-item-options">
                  {formBudgetItems.map(label => <option key={label} value={label} />)}
                </datalist>
                <p className="text-xs text-gray-400 mt-1">Pengajuan ini akan disandingkan dengan forecast project — jika nama komponen baru, akan otomatis ditambahkan ke forecast.</p>
              </div>
              <div>
                <label className="label">Nominal (Rp) *</label>
                <ThousandsInput className="input" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} placeholder="0" />
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
            {formBudgetEmpty && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Forecast budget project ini belum diisi oleh PM/PIC. Lengkapi forecast budget terlebih dahulu di bagian "Forecast Budget per Project" sebelum mengajukan pembayaran.
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={formBudgetEmpty}>Ajukan</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            </div>
          </form>
        )}

        {/* Budget forecast section */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-gray-900">Forecast Budget per Project</h2>
            {budgetProjectId && budgetItems.length > 0 && (
              <button
                onClick={() => exportCsv(`budget-${budgetProjectId}.csv`, budgetItems.map(b => ({
                  Komponen: b.label,
                  Forecast: b.quotedAmount,
                  Aktual: b.actualAmount ?? '',
                  TanggalDibutuhkan: b.neededDate || '',
                  Status: BUDGET_ITEM_STATUS_LABEL[b.paymentStatus] || b.paymentStatus,
                  Diajukan: b.requestedTotal,
                  Dibayar: b.paidTotal,
                  Sisa: b.remaining,
                  Catatan: b.note || '',
                })))}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline"
              >Export CSV</button>
            )}
          </div>
          <select className="select" value={budgetProjectId} onChange={e => loadBudget(e.target.value)}>
            <option value="">Pilih project...</option>
            {myProjects.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>

          {budgetProjectId && budgetLoading && <p className="text-sm text-gray-400">Memuat...</p>}

          {budgetProjectId && !budgetLoading && (
            <div className="space-y-2">
              {budgetMeta.budgetLockedAt ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <span>
                    🔒 Forecast dikunci oleh <strong>{budgetMeta.budgetLockedBy?.name || '-'}</strong> pada{' '}
                    {new Date(budgetMeta.budgetLockedAt).toLocaleDateString('id-ID')}. Hanya nilai aktual & catatan yang bisa diubah.
                  </span>
                  {budgetMeta.canLockBudget && (
                    <button onClick={() => toggleLockBudget(false)} className="btn-secondary text-xs shrink-0">Buka Kunci</button>
                  )}
                </div>
              ) : (
                budgetMeta.canLockBudget && budgetItems.length > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
                    <span>Forecast belum dikunci — masih bisa diubah bebas.</span>
                    <button onClick={() => toggleLockBudget(true)} className="btn-secondary text-xs shrink-0">🔒 Kunci Forecast</button>
                  </div>
                )
              )}
              {forecastLocked && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                  <span>✓ Forecast budget tersimpan dan terkunci. Klik "Edit" untuk mengubah.</span>
                  <button onClick={() => setBudgetEditing(true)} className="btn-secondary text-xs shrink-0">Edit</button>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                <label className="text-sm font-semibold text-gray-700 flex-1">No. Quotation</label>
                <input
                  type="text"
                  className="input w-40"
                  value={quotationNumber}
                  onChange={e => setQuotationNumber(e.target.value)}
                  disabled={!budgetMeta.canEditProjectValue || forecastLocked}
                  placeholder="cth. QTN-2026-001"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                <label className="text-sm font-semibold text-gray-700 flex-1">Nilai Project (Rp)</label>
                <ThousandsInput
                  className="input w-40"
                  value={projectValue}
                  onChange={v => setProjectValue(v)}
                  disabled={!budgetMeta.canEditProjectValue || forecastLocked}
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
                <span className="col-span-3">Komponen (sesuai quotation)</span>
                <span className="col-span-2">Forecast / Quotation (Rp)</span>
                <span className="col-span-2">Aktual Modal (Rp)</span>
                <span className="col-span-2">Tgl Dibutuhkan</span>
                <span className="col-span-2">Catatan Finance/Direksi</span>
                <span className="col-span-1"></span>
              </div>
              {budgetItems.map((item, idx) => (
                <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="input col-span-3"
                    value={item.label}
                    onChange={e => updateBudgetRow(idx, { label: e.target.value })}
                    placeholder="cth. Sewa Venue"
                    disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                  />
                  <ThousandsInput
                    className="input col-span-2"
                    value={item.quotedAmount || ''}
                    onChange={v => updateBudgetRow(idx, { quotedAmount: v })}
                    placeholder="0"
                    disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                  />
                  <ThousandsInput
                    className="input col-span-2"
                    value={item.actualAmount ?? ''}
                    onChange={v => updateBudgetRow(idx, { actualAmount: v })}
                    placeholder="0"
                    disabled={!budgetMeta.canEditBudget}
                  />
                  <input
                    type="date"
                    className="input col-span-2"
                    value={item.neededDate || ''}
                    onChange={e => updateBudgetRow(idx, { neededDate: e.target.value })}
                    disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                  />
                  <input
                    className="input col-span-2"
                    value={item.note || ''}
                    onChange={e => updateBudgetRow(idx, { note: e.target.value })}
                    placeholder="cth. selisih melebihi forecast"
                    disabled={!budgetMeta.canNote}
                  />
                  {budgetMeta.canEditBudget && !budgetMeta.budgetLockedAt && !forecastLocked && (
                    <button onClick={() => removeBudgetRow(idx)} className="col-span-1 text-red-500 text-xs hover:underline">Hapus</button>
                  )}
                  {item.id && (
                    <div className="col-span-12 -mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                      <span className={clsx('px-2 py-0.5 rounded-full font-medium', BUDGET_ITEM_STATUS_COLOR[item.paymentStatus] || 'bg-gray-100 text-gray-600')}>
                        {BUDGET_ITEM_STATUS_LABEL[item.paymentStatus] || item.paymentStatus}
                      </span>
                      <span>Diajukan: {formatRupiah(item.requestedTotal || 0)}</span>
                      <span>Dibayar: {formatRupiah(item.paidTotal || 0)}</span>
                      <span>Sisa: {formatRupiah(item.remaining)}</span>
                    </div>
                  )}
                </div>
              ))}
              {budgetMeta.canEditBudget && !budgetMeta.budgetLockedAt && !forecastLocked && (
                <button onClick={addBudgetRow} className="btn-secondary text-xs">+ Tambah Komponen</button>
              )}

              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-y-1 text-sm">
                <span className="font-semibold text-gray-900">Total Forecast (Quotation)</span>
                <span className="font-bold text-gray-900 text-right">
                  {formatRupiah(budgetItems.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0))}
                </span>
                <span className="font-semibold text-gray-900">Total Aktual Modal</span>
                <span className="font-bold text-gray-900 text-right">
                  {formatRupiah(budgetItems.reduce((sum, b) => sum + (parseFloat(b.actualAmount) || 0), 0))}
                </span>
                <span className="font-semibold text-amber-700">Selisih Forecast vs Aktual</span>
                <span className="font-bold text-amber-700 text-right">
                  {formatRupiah(
                    budgetItems.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0) -
                    budgetItems.reduce((sum, b) => sum + (parseFloat(b.actualAmount) || 0), 0)
                  )}
                </span>
              </div>

              {budgetMeta.canViewMargin && (
                <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-y-1 text-sm">
                  <span className="font-semibold text-emerald-700">Estimasi Margin (vs Forecast)</span>
                  <span className="font-bold text-emerald-700 text-right">
                    {formatRupiah((parseFloat(projectValue) || 0) - budgetItems.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0))}
                  </span>
                  <span className="font-semibold text-emerald-700">Estimasi Margin (vs Aktual)</span>
                  <span className="font-bold text-emerald-700 text-right">
                    {formatRupiah((parseFloat(projectValue) || 0) - budgetItems.reduce((sum, b) => sum + (parseFloat(b.actualAmount) || 0), 0))}
                  </span>
                </div>
              )}

              {(budgetMeta.canEditBudget || budgetMeta.canNote) && !forecastLocked && (
                budgetEditing && budgetSaved ? (
                  <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                    {budgetConfirming ? (
                      <>
                        <span className="text-xs text-gray-500">Simpan perubahan forecast budget?</span>
                        <button onClick={saveBudget} disabled={savingBudget} className="btn-primary text-xs">
                          {savingBudget ? 'Menyimpan...' : 'Ya, Simpan'}
                        </button>
                        <button onClick={() => setBudgetConfirming(false)} className="btn-secondary text-xs">Batal</button>
                      </>
                    ) : (
                      <button onClick={() => setBudgetConfirming(true)} className="btn-primary text-xs">Konfirmasi & Simpan</button>
                    )}
                  </div>
                ) : (
                  <button onClick={saveBudget} disabled={savingBudget} className="btn-primary">
                    {savingBudget ? 'Menyimpan...' : 'Simpan'}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Payment requests list */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900">Pengajuan Pembayaran</h2>
            <div className="flex items-center gap-3">
              <select className="select w-56" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Semua Status</option>
                {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {payments.length > 0 && (
                <button
                  onClick={() => exportCsv('riwayat-pembayaran.csv', payments.map(p => ({
                    Project: `${p.project?.code} - ${p.project?.name}`,
                    Kategori: EXPENSE_CATEGORY_LABEL[p.category],
                    Vendor: p.vendor || '',
                    Nominal: p.amount,
                    Status: PAYMENT_STATUS_LABEL[p.status],
                    Diajukan: `${p.requestedBy?.name || ''} (${p.createdAt ? new Date(p.createdAt).toLocaleString('id-ID') : ''})`,
                    DirekturUtama: p.owner ? `${p.owner.name} (${p.ownerApprovedAt ? new Date(p.ownerApprovedAt).toLocaleString('id-ID') : ''})` : '',
                    DirekturDivisi: p.director ? `${p.director.name} (${p.approvedAt ? new Date(p.approvedAt).toLocaleString('id-ID') : ''})` : '',
                    DirekturFinance: p.financeDirector ? `${p.financeDirector.name} (${p.financeApprovedAt ? new Date(p.financeApprovedAt).toLocaleString('id-ID') : ''})` : '',
                    Dibayar: p.financeBy ? `${p.financeBy.name} (${p.paidAt ? new Date(p.paidAt).toLocaleString('id-ID') : ''})` : '',
                    CatatanDirekturDivisi: p.directorNote || '',
                    CatatanDirekturFinance: p.financeDirectorNote || '',
                    CatatanFinance: p.financeNote || '',
                  })))}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline"
                >Export CSV</button>
              )}
            </div>
          </div>

          {loading && <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>}
          {!loading && payments.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Belum ada pengajuan</p>}

          <div className="space-y-2">
            {payments.map(p => {
              const canActOwner = p.status === 'PENDING_OWNER' && role === 'OWNER'
              const canActDivision = p.status === 'PENDING_DIRECTOR' &&
                (role === 'OWNER' || (role === 'DIRECTOR' && session.user.divisi === p.project?.division))
              const canActFinanceDirector = p.status === 'PENDING_FINANCE_DIRECTOR' &&
                (role === 'OWNER' || (role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA'))
              const canActPay = p.status === 'APPROVED_BY_DIRECTOR' &&
                (role === 'FINANCE' || role === 'OWNER' || (role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA'))

              return (
                <div key={p.id} className="border border-gray-100 rounded-lg p-3 space-y-2 hover:shadow-sm hover:border-brand-200 transition-all">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.project?.code} — {p.project?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{EXPENSE_CATEGORY_LABEL[p.category]} · {p.vendor || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${PAYMENT_STATUS_COLOR[p.status]}`}>
                      {PAYMENT_STATUS_LABEL[p.status]}
                    </span>
                  </div>

                  {p.status !== 'REJECTED' && <PaymentStepper status={p.status} hasOwnerStage={!!p.owner || p.status === 'PENDING_OWNER'} />}

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
                  {/* Audit trail */}
                  <div className="text-[11px] text-gray-400 space-y-0.5">
                    {p.owner && <p>✓ Direktur Utama: {p.owner.name} · {new Date(p.ownerApprovedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                    {p.director && <p>✓ Direktur Divisi: {p.director.name} · {new Date(p.approvedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                    {p.financeDirector && <p>✓ Direktur Finance: {p.financeDirector.name} · {new Date(p.financeApprovedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                    {p.financeBy && <p>✓ Dibayar oleh: {p.financeBy.name} · {new Date(p.paidAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                  </div>
                  {p.ownerNote && <p className="text-xs text-amber-600">Catatan Direktur Utama: {p.ownerNote}</p>}
                  {p.directorNote && <p className="text-xs text-amber-600">Catatan Direktur Divisi{p.director ? ` (${p.director.name})` : ''}: {p.directorNote}</p>}
                  {p.financeDirectorNote && <p className="text-xs text-amber-600">Catatan Direktur Finance{p.financeDirector ? ` (${p.financeDirector.name})` : ''}: {p.financeDirectorNote}</p>}
                  {p.financeNote && <p className="text-xs text-amber-600">Catatan Finance{p.financeBy ? ` (${p.financeBy.name})` : ''}: {p.financeNote}</p>}

                  {/* Actions */}
                  {(canActOwner || canActDivision || canActFinanceDirector) && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => doAction(p.id, 'approve')} className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-600 hover:bg-green-100 active:scale-95 font-medium transition-all">Setujui</button>
                      <button onClick={() => doAction(p.id, 'reject')} className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100 active:scale-95 font-medium transition-all">Tolak</button>
                    </div>
                  )}
                  {canActPay && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => doAction(p.id, 'mark_paid')} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 font-medium transition-all">Tandai Sudah Dibayar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

function PaymentStepper({ status, hasOwnerStage }) {
  const stages = hasOwnerStage ? PAYMENT_STAGES_WITH_OWNER : PAYMENT_STAGES
  const currentIdx = status === 'PAID'
    ? stages.length - 1
    : stages.findIndex(s => s.key === status)

  return (
    <div className="flex items-center gap-1 py-1">
      {stages.map((stage, idx) => {
        const done = idx < currentIdx || status === 'PAID'
        const active = idx === currentIdx && status !== 'PAID'
        return (
          <div key={stage.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={clsx(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                done ? 'bg-emerald-500 text-white' : active ? 'bg-brand-500 text-white animate-pulse' : 'bg-gray-200 text-gray-400'
              )}>
                {done ? '✓' : idx + 1}
              </div>
              <span className={clsx('text-[10px] whitespace-nowrap', active ? 'text-brand-700 font-semibold' : 'text-gray-400')}>
                {stage.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div className={clsx('h-0.5 flex-1 mx-1 rounded transition-colors', done ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProfitabilityCard({ title, rows, labelMap }) {
  const top = rows.slice(0, 5)
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {top.length === 0 ? (
        <p className="text-sm text-gray-400">Belum ada data project menang.</p>
      ) : (
        <div className="space-y-2">
          {top.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{labelMap ? (labelMap[r.label] || r.label) : r.label}</p>
                <p className="text-xs text-gray-400">{r.count} project · Nilai {formatRupiah(r.totalValue)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={clsx('text-sm font-bold', r.totalMargin >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(r.totalMargin)}</p>
                <p className="text-xs text-gray-400">{r.marginPct.toFixed(1)}% margin</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RevenuePerClientCard({ rows }) {
  const sorted = [...rows].sort((a, b) => b.totalValue - a.totalValue)
  const grandTotal = sorted.reduce((s, r) => s + r.totalValue, 0)
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary Revenue per Klien</h3>
      <p className="text-xs text-gray-400 mb-3">Akumulasi nilai project (yang sudah/sedang berjalan) dari seluruh klien yang masuk ke Watermark.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="py-2 pr-2">Klien</th>
              <th className="py-2 pr-2 text-right">Jumlah Project</th>
              <th className="py-2 pr-2 text-right">Total Revenue</th>
              <th className="py-2 text-right">% dari Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-2 font-medium text-gray-800">{r.label}</td>
                <td className="py-2 pr-2 text-right text-gray-600">{r.count}</td>
                <td className="py-2 pr-2 text-right font-semibold text-gray-800">{formatRupiah(r.totalValue)}</td>
                <td className="py-2 text-right text-gray-500">{grandTotal ? ((r.totalValue / grandTotal) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <td className="py-2 pr-2 font-semibold text-gray-800">Total</td>
              <td className="py-2 pr-2 text-right font-semibold text-gray-800">{sorted.reduce((s, r) => s + r.count, 0)}</td>
              <td className="py-2 pr-2 text-right font-bold text-gray-900">{formatRupiah(grandTotal)}</td>
              <td className="py-2 text-right text-gray-500">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function ProfitabilityByProjectCard({ rows }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Profitabilitas per Project</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
              <th className="py-2 pr-2">Project</th>
              <th className="py-2 pr-2">Klien</th>
              <th className="py-2 pr-2 text-right">Nilai Project</th>
              <th className="py-2 pr-2 text-right">Biaya Aktual</th>
              <th className="py-2 pr-2 text-right">Margin</th>
              <th className="py-2 text-right">% Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.projectId} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-2">
                  <Link href={`/projects/${r.projectId}`} className="font-medium text-gray-800 hover:text-brand">{r.projectCode} · {r.projectName}</Link>
                </td>
                <td className="py-2 pr-2 text-gray-600">{r.clientName}</td>
                <td className="py-2 pr-2 text-right text-gray-700">{formatRupiah(r.projectValue)}</td>
                <td className="py-2 pr-2 text-right text-gray-700">{formatRupiah(r.actualCost)}</td>
                <td className={clsx('py-2 pr-2 text-right font-semibold', r.margin >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(r.margin)}</td>
                <td className="py-2 text-right text-gray-500">{r.marginPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
