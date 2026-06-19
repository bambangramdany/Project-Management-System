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
import { isFinanceDirector } from '@/lib/rbac'

const FINANCE_ROLES = ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PRODUCTION']

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
  const [form, setForm] = useState({ projectId: '', budgetItemLabel: '', amount: '', vendor: '', recipientName: '', recipientAccount: '', paymentTerm: 'FULL', description: '', neededDate: '' })
  const [formBudgetItems, setFormBudgetItems] = useState([])
  const [formBudgetEmpty, setFormBudgetEmpty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [budgetProjectId, setBudgetProjectId] = useState('')
  const [budgetItems, setBudgetItems] = useState({})
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [savingBudget, setSavingBudget] = useState(false)
  const [projectValue, setProjectValue] = useState('')
  const [includesPpn, setIncludesPpn] = useState(false)
  const [quotationFileUrl, setQuotationFileUrl] = useState(null)
  const [quotationFileName, setQuotationFileName] = useState(null)
  const [uploadingQuotation, setUploadingQuotation] = useState(false)
  const [quotationNumber, setQuotationNumber] = useState('')
  const [budgetSaved, setBudgetSaved] = useState(false)
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetConfirming, setBudgetConfirming] = useState(false)
  const [budgetMeta, setBudgetMeta] = useState({ canViewMargin: false, canEditProjectValue: false })
  const [cashflow, setCashflow] = useState(null)
  const [marginReport, setMarginReport] = useState(null)
  const [profitability, setProfitability] = useState(null)
  const [receivables, setReceivables] = useState(null)
  const [showReceivableForm, setShowReceivableForm] = useState(false)
  const EMPTY_REC_FORM = { projectId: '', clientName: '', financeProjectName: '', invoiceNumber: '', poNumber: '', taxInvoiceNumber: '', amount: '', issueDate: '', dueDate: '', notes: '' }
  const [receivableForm, setReceivableForm] = useState(EMPTY_REC_FORM)
  const [savingReceivable, setSavingReceivable] = useState(false)
  const [confirmDeleteReceivableId, setConfirmDeleteReceivableId] = useState(null)
  // Modal bayar: { receivable, paidAmount, pphAmount, paidAt }
  const [payModal, setPayModal] = useState(null)
  const [confirmDeleteQuotation, setConfirmDeleteQuotation] = useState(false)
  const [confirmLockBudget, setConfirmLockBudget] = useState(false)
  const [confirmDeleteBudgetIdx, setConfirmDeleteBudgetIdx] = useState(null)

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
      fetch('/api/projects?light=1').then(r => r.json()).then(data => setProjects(Array.isArray(data) ? data : []))
      fetchPayments()
    }
    if (status === 'authenticated' && ['OWNER', 'FINANCE', 'FINANCE_STAFF', 'DIRECTOR'].includes(session.user.role)) {
      fetch('/api/finance/summary').then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return
        setCashflow(data.cashflow)
        setMarginReport(data.marginReport)
        setProfitability(data.profitability)
        setReceivables(data.receivables)
      })
    }
  }, [status, session, fetchPayments])

  const fetchReceivables = useCallback(() => {
    fetch('/api/receivables').then(r => r.ok ? r.json() : null).then(setReceivables)
  }, [])

  async function submitReceivable(e) {
    e.preventDefault()
    setSavingReceivable(true)
    const res = await fetch('/api/receivables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receivableForm),
    })
    setSavingReceivable(false)
    if (res.ok) {
      setReceivableForm(EMPTY_REC_FORM)
      setShowReceivableForm(false)
      fetchReceivables()
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal menyimpan')
    }
  }

  // Konfirmasi draft dari project — simpan ke DB lalu buka form edit
  async function confirmDraft(r) {
    const res = await fetch('/api/receivables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: r.projectId,
        clientName: r.clientName,
        financeProjectName: r.financeProjectName || '',
        amount: r.amount,
        isDraft: false,
      }),
    })
    if (res.ok) fetchReceivables()
  }

  // Buka modal pembayaran
  function openPayModal(r) {
    setPayModal({ receivable: r, paidAmount: String(r.amount), pphAmount: '0', paidAt: new Date().toISOString().slice(0, 10) })
  }

  async function submitPay() {
    const { receivable, paidAmount, pphAmount, paidAt } = payModal
    const res = await fetch(`/api/receivables/${receivable.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_paid', paidAmount, pphAmount, paidAt }),
    })
    if (res.ok) { setPayModal(null); fetchReceivables() }
    else { const err = await res.json(); alert(err.error || 'Gagal menyimpan') }
  }

  async function markUnpaid(r) {
    const res = await fetch(`/api/receivables/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_unpaid' }),
    })
    if (res.ok) fetchReceivables()
    else { const err = await res.json(); alert(err.error || 'Gagal menyimpan') }
  }

  async function removeReceivable(id) {
    const res = await fetch(`/api/receivables/${id}`, { method: 'DELETE' })
    setConfirmDeleteReceivableId(null)
    if (res.ok) fetchReceivables()
    else {
      const err = await res.json()
      alert(err.error || 'Gagal menghapus')
    }
  }

  async function submitRequest(e) {
    e.preventDefault()
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ projectId: '', budgetItemLabel: '', amount: '', vendor: '', recipientName: '', recipientAccount: '', paymentTerm: 'FULL', description: '', neededDate: '' })
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
      setFormBudgetItems(items.filter(b => b.label).map(b => ({ label: b.label, category: b.category })))
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
      setBudgetItems(items.map(b => ({ ...b, neededDate: b.neededDate ? b.neededDate.slice(0, 10) : '', titipanEntries: b.titipanEntries || [] })))
      setProjectValue(data.projectValue ?? '')
      setIncludesPpn(!!data.includesPpn)
      setQuotationFileUrl(data.quotationFileUrl || null)
      setQuotationFileName(data.quotationFileName || null)
      setQuotationNumber(data.quotationNumber ?? '')
      setBudgetSaved(items.length > 0)
      setBudgetMeta({
        canViewMargin: !!data.canViewMargin,
        canEditProjectValue: !!data.canEditProjectValue,
        canEditBudget: !!data.canEditBudget,
        canNote: !!data.canNote,
        canLockBudget: !!data.canLockBudget,
        canSeeTitipan: !!data.canSeeTitipan,
        budgetLockedAt: data.budgetLockedAt || null,
        budgetLockedBy: data.budgetLockedBy || null,
      })
    }
    setBudgetLoading(false)
  }

  function addBudgetRow() {
    setBudgetItems(items => [...items, { label: '', qty: '', unitPrice: '', quotedAmount: 0, needsUpfrontFunding: false, actualAmount: '', neededDate: '', note: '', isTitipan: false, titipanNote: '', titipanEntries: [] }])
  }

  // Parse a CSV exported from the legacy quotation template (label, kategori, forecast,
  // tgl dibutuhkan, catatan) and append rows to the current forecast budget.
  function parseBudgetCsv(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
    const labelToCategory = Object.fromEntries(
      Object.entries(EXPENSE_CATEGORY_LABEL).map(([key, label]) => [label.toLowerCase(), key])
    )
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const [label, categoryRaw, quotedAmountRaw, neededDate, note] = cols
      const category = EXPENSE_CATEGORIES.includes(categoryRaw)
        ? categoryRaw
        : (labelToCategory[(categoryRaw || '').toLowerCase()] || 'OPERATIONAL_OTHER')
      const quotedAmount = parseFloat((quotedAmountRaw || '').replace(/[^\d.-]/g, '')) || 0
      return { label: label || '', category, quotedAmount, actualAmount: '', neededDate: neededDate || '', note: note || '' }
    }).filter(r => r.label)
  }

  function handleBudgetCsvImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseBudgetCsv(String(reader.result || ''))
      if (rows.length === 0) {
        alert('Tidak ada baris valid yang bisa diimpor dari file ini.')
      } else {
        setBudgetItems(items => [...items, ...rows])
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function downloadBudgetCsvTemplate() {
    const header = 'Komponen,Kategori,Forecast/Quotation (Rp),Tgl Dibutuhkan (YYYY-MM-DD),Catatan'
    const example = [
      ['LED Screen P3.9 6x2M (12m, 2 hari)', 'Operasional Lain', '18000000', '', 'Sewa LED screen utama'],
      ['Stage Riser under LED Screen 80x60cm', 'Operasional Lain', '5000000', '', ''],
      ['Lighting Set (Beam, Par, White Beam)', 'Operasional Lain', '19000000', '', ''],
      ['Sound System 5000 Watt', 'DP Vendor', '9000000', '', 'DP ke vendor sound'],
      ['Event Coordinator (2 hari)', 'Operasional Lain', '4000000', '', ''],
      ['Crew Runner/Helper (Loading + Event Day)', 'Operasional Lain', '6000000', '', ''],
      ['Photographer (2 pax x 2 hari)', 'Talent / Honor', '8000000', '', ''],
      ['Videographer (2 pax x 2 hari)', 'Talent / Honor', '10000000', '', ''],
      ['Meals & Drinks for Crew', 'Operasional Lain', '4050000', '', ''],
      ['Transportation (Car Rental, Parkir, dll)', 'Tiket & Transport', '3000000', '', ''],
    ]
    const csv = [header, ...example.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-forecast-budget.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function updateBudgetRow(idx, patch) {
    setBudgetItems(items => items.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, ...patch }
      // Auto-calculate forecast amount from Qty x Harga Satuan when both are filled
      if (('qty' in patch || 'unitPrice' in patch) && next.qty !== '' && next.unitPrice !== '' && next.qty != null && next.unitPrice != null) {
        const qty = parseFloat(next.qty) || 0
        const unitPrice = parseFloat(next.unitPrice) || 0
        next.quotedAmount = qty * unitPrice
      }
      return next
    }))
  }

  async function handleQuotationFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQuotation(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/projects/${budgetProjectId}/quotation`, { method: 'POST', body: formData })
    setUploadingQuotation(false)
    if (res.ok) {
      const data = await res.json()
      setQuotationFileUrl(data.quotationFileUrl)
      setQuotationFileName(data.quotationFileName)
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal mengunggah file quotation')
    }
    e.target.value = ''
  }

  async function removeQuotationFile() {
    const res = await fetch(`/api/projects/${budgetProjectId}/quotation`, { method: 'DELETE' })
    setConfirmDeleteQuotation(false)
    if (res.ok) {
      setQuotationFileUrl(null)
      setQuotationFileName(null)
    }
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
        includesPpn: budgetMeta.canEditProjectValue ? includesPpn : undefined,
        quotationNumber: budgetMeta.canEditProjectValue ? quotationNumber : undefined,
      }),
    })
    setSavingBudget(false)
    if (res.ok) {
      const data = await res.json()
      await loadBudget(budgetProjectId)
      setBudgetSaved(true)
      setBudgetEditing(false)
      setBudgetConfirming(false)
    } else {
      const err = await res.json()
      alert(err.error || 'Gagal menyimpan')
    }
  }

  async function toggleLockBudget(lock) {
    if (lock) { setConfirmLockBudget(true); return }
    await doLockBudget('unlock')
  }

  async function doLockBudget(lockAction) {
    setConfirmLockBudget(false)
    setSavingBudget(true)
    const res = await fetch(`/api/projects/${budgetProjectId}/budget`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: budgetItems, lockAction }),
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
    : projects

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-2 sm:px-6 lg:px-8 py-6 space-y-5 overflow-x-hidden">
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
                <select className="select" value={form.projectId} onChange={e => onFormProjectChange(e.target.value)} required>
                  <option value="">Pilih project</option>
                  {myProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Komponen Forecast (sesuai quotation) *</label>
                <select
                  className="select"
                  value={form.budgetItemLabel}
                  onChange={e => setForm(f => ({ ...f, budgetItemLabel: e.target.value }))}
                  required
                  disabled={!form.projectId}
                >
                  <option value="">Pilih komponen forecast...</option>
                  {formBudgetItems.map(b => (
                    <option key={b.label} value={b.label}>{b.label} ({EXPENSE_CATEGORY_LABEL[b.category] || b.category})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Kategori pengajuan otomatis mengikuti kategori komponen forecast yang dipilih.</p>
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
        <div className="card p-4 space-y-3 border-t-4 border-blue-400">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">📋</span>
              Forecast Budget per Project
            </h2>
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
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
                    <span>Forecast belum dikunci — masih bisa diubah bebas.</span>
                    {confirmLockBudget ? (
                      <span className="inline-flex items-center gap-2 shrink-0">
                        <span className="text-amber-700">Yakin kunci?</span>
                        <button onClick={() => doLockBudget('lock')} className="px-2 py-1 rounded bg-amber-500 text-white text-xs">Ya, Kunci</button>
                        <button onClick={() => setConfirmLockBudget(false)} className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs">Batal</button>
                      </span>
                    ) : (
                      <button onClick={() => toggleLockBudget(true)} className="btn-secondary text-xs shrink-0">🔒 Kunci Forecast</button>
                    )}
                  </div>
                )
              )}
              {forecastLocked && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                  <span>✓ Forecast budget tersimpan dan terkunci. Klik "Edit" untuk mengubah.</span>
                  <button onClick={() => setBudgetEditing(true)} className="btn-secondary text-xs shrink-0">Edit</button>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700">No. Quotation</label>
                  <p className="text-xs text-gray-400 mt-0.5">Format: WTM/[DIVISI]/QUOT/[TAHUN]/[NO. URUT] — sesuai penomoran quotation tim Event, agar mudah disandingkan oleh Finance.</p>
                </div>
                <input
                  type="text"
                  className="input w-56"
                  value={quotationNumber}
                  onChange={e => setQuotationNumber(e.target.value)}
                  disabled={!budgetMeta.canEditProjectValue || forecastLocked}
                  placeholder="cth. WTM/EVENT/QUOT/2026/059"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700">File Quotation</label>
                  <p className="text-xs text-gray-400 mt-0.5">Unggah dokumen quotation (PDF/gambar) sebagai lampiran resmi, lalu lengkapi rincian item di tabel forecast di bawah.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {quotationFileUrl && (
                    <a href={quotationFileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline max-w-[10rem] truncate">
                      {quotationFileName || 'Lihat file'}
                    </a>
                  )}
                  {budgetMeta.canEditProjectValue && !forecastLocked && (
                    <>
                      <label className="btn-secondary text-xs cursor-pointer">
                        {uploadingQuotation ? 'Mengunggah...' : quotationFileUrl ? 'Ganti File' : 'Unggah File'}
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleQuotationFileUpload} disabled={uploadingQuotation} />
                      </label>
                      {quotationFileUrl && (
                        confirmDeleteQuotation ? (
                          <span className="inline-flex items-center gap-1">
                            <button type="button" onClick={removeQuotationFile} className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                            <button type="button" onClick={() => setConfirmDeleteQuotation(false)} className="text-xs text-gray-400 hover:underline">Batal</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteQuotation(true)} className="text-xs text-red-500 hover:underline">Hapus</button>
                        )
                      )}
                    </>
                  )}
                </div>
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
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-100">
                <label className="text-sm text-gray-600 flex items-center gap-2 flex-1">
                  <input
                    type="checkbox"
                    checked={includesPpn}
                    onChange={e => setIncludesPpn(e.target.checked)}
                    disabled={!budgetMeta.canEditProjectValue || forecastLocked}
                  />
                  Nilai di atas belum termasuk PPN 11%
                </label>
                {includesPpn && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">PPN 11%: {formatRupiah((parseFloat(projectValue) || 0) * 0.11)}</p>
                    <p className="text-sm font-semibold text-gray-700">
                      Total termasuk PPN: {formatRupiah((parseFloat(projectValue) || 0) * 1.11)}
                    </p>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto -mx-1">
              <div className="min-w-[900px]">
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-2 text-xs font-semibold text-gray-500 px-1">
                <span className="col-span-2">Komponen (sesuai quotation)</span>
                <span className="col-span-1">Qty</span>
                <span className="col-span-2">Harga Satuan (Rp)</span>
                <span className="col-span-2">Kategori</span>
                <span className="col-span-2">Forecast / Quotation (Rp)</span>
                <span className="col-span-2">Aktual Modal (Rp)</span>
                <span className="col-span-1">Tgl Dibutuhkan</span>
                <span className="col-span-1 text-center">Modal Awal</span>
                <span className="col-span-2">Catatan Finance/Direksi</span>
                <span className="col-span-1"></span>
              </div>
              {budgetItems.map((item, idx) => (
                <div key={item.id || idx} className="border-b border-gray-50 py-1 last:border-0">
                  {/* ── Baris input utama ── */}
                  <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-2 items-center">
                    <input
                      className="input col-span-2"
                      value={item.label}
                      onChange={e => updateBudgetRow(idx, { label: e.target.value })}
                      placeholder="cth. Sewa Venue"
                      disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                    />
                    <input
                      type="number"
                      className="input col-span-1"
                      value={item.qty ?? ''}
                      onChange={e => updateBudgetRow(idx, { qty: e.target.value })}
                      placeholder="1"
                      disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                    />
                    <ThousandsInput
                      className="input col-span-2"
                      value={item.unitPrice ?? ''}
                      onChange={v => updateBudgetRow(idx, { unitPrice: v })}
                      placeholder="0"
                      disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                    />
                    <select
                      className="select col-span-2"
                      value={item.category || 'OPERATIONAL_OTHER'}
                      onChange={e => updateBudgetRow(idx, { category: e.target.value })}
                      disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>
                      ))}
                    </select>
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
                      className="input col-span-1"
                      value={item.neededDate || ''}
                      onChange={e => updateBudgetRow(idx, { neededDate: e.target.value })}
                      disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                    />
                    <div className="col-span-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        title="Tandai jika komponen ini butuh dana awal/modal kerja sebelum project berjalan"
                        checked={!!item.needsUpfrontFunding}
                        onChange={e => updateBudgetRow(idx, { needsUpfrontFunding: e.target.checked })}
                        disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                      />
                    </div>
                    <input
                      className="input col-span-2"
                      value={item.note || ''}
                      onChange={e => updateBudgetRow(idx, { note: e.target.value })}
                      placeholder="cth. selisih melebihi forecast"
                      disabled={!budgetMeta.canNote}
                    />
                    {/* Kolom Hapus — selalu 1 slot agar grid selalu 16 kolom */}
                    <div className="col-span-1 flex items-center">
                      {budgetMeta.canEditBudget && !budgetMeta.budgetLockedAt && !forecastLocked && (
                        confirmDeleteBudgetIdx === idx ? (
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => { removeBudgetRow(idx); setConfirmDeleteBudgetIdx(null) }} className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white">Ya</button>
                            <button onClick={() => setConfirmDeleteBudgetIdx(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDeleteBudgetIdx(idx)} className="text-red-500 text-xs hover:underline">Hapus</button>
                        )
                      )}
                    </div>
                  </div>

                  {/* ── Status pembayaran (di bawah baris input, full width) ── */}
                  {item.id && (
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mt-1 px-0.5">
                      <span className={clsx('px-2 py-0.5 rounded-full font-medium', BUDGET_ITEM_STATUS_COLOR[item.paymentStatus] || 'bg-gray-100 text-gray-600')}>
                        {BUDGET_ITEM_STATUS_LABEL[item.paymentStatus] || item.paymentStatus}
                      </span>
                      <span>Diajukan: {formatRupiah(item.requestedTotal || 0)}</span>
                      <span>Dibayar: {formatRupiah(item.paidTotal || 0)}</span>
                      <span>Sisa: {formatRupiah(item.remaining)}</span>
                      {budgetMeta.canSeeTitipan && item.isTitipan && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">⚠ Titipan Klien</span>
                      )}
                    </div>
                  )}

                  {/* ── Panel titipan — hanya visible untuk role yang berhak ── */}
                  {budgetMeta.canSeeTitipan && (
                    <div className="mt-1 px-0.5">
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!item.isTitipan}
                          onChange={e => updateBudgetRow(idx, { isTitipan: e.target.checked, titipanEntries: item.titipanEntries || [] })}
                          disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                        />
                        <span className="text-amber-700 font-medium">Titipan Klien</span>
                        <span className="text-gray-400">(tidak masuk margin Watermark)</span>
                      </label>
                      {item.isTitipan && (
                        <div className="mt-1.5 ml-4 space-y-2">
                          <input
                            className="input text-xs w-full"
                            value={item.titipanNote || ''}
                            onChange={e => updateBudgetRow(idx, { titipanNote: e.target.value })}
                            placeholder="Catatan umum titipan (mis: hutang klien ke vendor lama)"
                            disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                          />
                          {/* Daftar vendor titipan */}
                          <div className="space-y-1">
                            {(item.titipanEntries || []).map((te, tIdx) => (
                              <div key={te.id || tIdx} className="flex gap-2 items-center flex-wrap">
                                <input
                                  className="input text-xs flex-1 min-w-[120px]"
                                  value={te.vendorName || ''}
                                  onChange={e => {
                                    const entries = [...(item.titipanEntries || [])]
                                    entries[tIdx] = { ...entries[tIdx], vendorName: e.target.value }
                                    updateBudgetRow(idx, { titipanEntries: entries })
                                  }}
                                  placeholder="Nama vendor"
                                  disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                                />
                                <ThousandsInput
                                  className="input text-xs w-32"
                                  value={te.amount || ''}
                                  onChange={v => {
                                    const entries = [...(item.titipanEntries || [])]
                                    entries[tIdx] = { ...entries[tIdx], amount: v }
                                    updateBudgetRow(idx, { titipanEntries: entries })
                                  }}
                                  placeholder="Nominal"
                                  disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                                />
                                <input
                                  className="input text-xs flex-1 min-w-[120px]"
                                  value={te.note || ''}
                                  onChange={e => {
                                    const entries = [...(item.titipanEntries || [])]
                                    entries[tIdx] = { ...entries[tIdx], note: e.target.value }
                                    updateBudgetRow(idx, { titipanEntries: entries })
                                  }}
                                  placeholder="Keterangan (mis: hutang dari project Agustus 2025)"
                                  disabled={!budgetMeta.canEditBudget || !!budgetMeta.budgetLockedAt || forecastLocked}
                                />
                                <label className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <input
                                    type="checkbox"
                                    checked={!!te.isPaid}
                                    onChange={e => {
                                      const entries = [...(item.titipanEntries || [])]
                                      entries[tIdx] = { ...entries[tIdx], isPaid: e.target.checked }
                                      updateBudgetRow(idx, { titipanEntries: entries })
                                    }}
                                    disabled={!budgetMeta.canEditBudget}
                                  />
                                  Lunas
                                </label>
                                {budgetMeta.canEditBudget && !budgetMeta.budgetLockedAt && !forecastLocked && (
                                  <button
                                    onClick={() => {
                                      const entries = (item.titipanEntries || []).filter((_, i) => i !== tIdx)
                                      updateBudgetRow(idx, { titipanEntries: entries })
                                    }}
                                    className="text-red-400 text-xs hover:text-red-600"
                                  >✕</button>
                                )}
                              </div>
                            ))}
                            {budgetMeta.canEditBudget && !budgetMeta.budgetLockedAt && !forecastLocked && (
                              <button
                                onClick={() => {
                                  const entries = [...(item.titipanEntries || []), { vendorName: '', amount: '', note: '', isPaid: false }]
                                  updateBudgetRow(idx, { titipanEntries: entries })
                                }}
                                className="text-xs text-amber-600 hover:underline"
                              >+ Tambah Vendor Titipan</button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {budgetMeta.canEditBudget && !budgetMeta.budgetLockedAt && !forecastLocked && (
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={addBudgetRow} className="btn-secondary text-xs">+ Tambah Komponen</button>
                  <button type="button" onClick={downloadBudgetCsvTemplate} className="text-xs text-brand-600 hover:underline">Unduh Template CSV</button>
                  <label className="text-xs text-brand-600 hover:underline cursor-pointer">
                    Import dari CSV (quotation lama)
                    <input type="file" accept=".csv" className="hidden" onChange={handleBudgetCsvImport} />
                  </label>
                </div>
              )}

              {(() => {
                const murni = budgetItems.filter(b => !b.isTitipan)
                const titipanItems = budgetItems.filter(b => b.isTitipan)
                const titipanTotal = titipanItems.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0)
                const forecastMurni = murni.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0)
                const aktualMurni = murni.reduce((sum, b) => sum + (parseFloat(b.actualAmount) || 0), 0)
                const pv = parseFloat(projectValue) || 0
                const revenueRiil = pv - titipanTotal
                return (
                  <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-y-1 text-sm">
                    <span className="font-semibold text-gray-900">Total Forecast (Quotation)</span>
                    <span className="font-bold text-gray-900 text-right">
                      {formatRupiah(budgetItems.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0))}
                    </span>
                    {budgetMeta.canSeeTitipan && titipanTotal > 0 && (<>
                      <span className="text-amber-700 pl-3 text-xs">↳ Budget Murni Watermark</span>
                      <span className="text-amber-700 text-right text-xs">{formatRupiah(forecastMurni)}</span>
                      <span className="text-amber-700 pl-3 text-xs">↳ Pass-through Titipan Klien</span>
                      <span className="text-amber-700 text-right text-xs">{formatRupiah(titipanTotal)}</span>
                    </>)}
                    <span className="font-semibold text-gray-900">Total Aktual Modal</span>
                    <span className="font-bold text-gray-900 text-right">
                      {formatRupiah(budgetItems.reduce((sum, b) => sum + (parseFloat(b.actualAmount) || 0), 0))}
                    </span>
                    <span className="font-semibold text-amber-700">Selisih Forecast vs Aktual</span>
                    <span className="font-bold text-amber-700 text-right">
                      {formatRupiah(forecastMurni - aktualMurni)}
                    </span>
                    <span className="font-semibold text-sky-700">Total Kebutuhan Modal Awal</span>
                    <span className="font-bold text-sky-700 text-right">
                      {formatRupiah(
                        budgetItems.filter(b => b.needsUpfrontFunding).reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0)
                      )}
                    </span>
                  </div>
                )
              })()}
              </div>{/* min-w */}
              </div>{/* overflow-x-auto */}

              {budgetMeta.canViewMargin && (() => {
                const murni = budgetItems.filter(b => !b.isTitipan)
                const titipanTotal = budgetItems.filter(b => b.isTitipan).reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0)
                const forecastMurni = murni.reduce((sum, b) => sum + (parseFloat(b.quotedAmount) || 0), 0)
                const aktualMurni = murni.reduce((sum, b) => sum + (parseFloat(b.actualAmount) || 0), 0)
                const pv = parseFloat(projectValue) || 0
                const revenueRiil = pv - titipanTotal
                return (
                  <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-y-1 text-sm">
                    {titipanTotal > 0 && budgetMeta.canSeeTitipan && (
                      <><span className="text-xs text-gray-400 col-span-2">Revenue riil = Nilai Project − Titipan Klien ({formatRupiah(pv)} − {formatRupiah(titipanTotal)})</span></>
                    )}
                    <span className="font-semibold text-emerald-700">Estimasi Margin (vs Forecast)</span>
                    <span className="font-bold text-emerald-700 text-right">
                      {formatRupiah(revenueRiil - forecastMurni)}
                    </span>
                    <span className="font-semibold text-emerald-700">Estimasi Margin (vs Aktual)</span>
                    <span className="font-bold text-emerald-700 text-right">
                      {formatRupiah(revenueRiil - aktualMurni)}
                    </span>
                  </div>
                )
              })()}

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
        {/* Cashflow forecast (Owner/Finance/Direksi only) */}
        {cashflow && (
          <div className="card p-4 space-y-3 border-t-4 border-orange-400">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs">💸</span>
                Forecast Kebutuhan Dana Vendor
              </h2>
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
                        {new Date(it.neededDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · {it.project.code} — {it.project.name} — {it.label}
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

        {/* Modal Pembayaran */}
        {payModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Pembayaran</h3>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-800">{payModal.receivable.clientName}</span>
                {payModal.receivable.invoiceNumber && <span className="text-gray-400"> — {payModal.receivable.invoiceNumber}</span>}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="label">Tanggal Pembayaran *</label>
                  <input type="date" className="input" value={payModal.paidAt} onChange={e => setPayModal(m => ({ ...m, paidAt: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Nominal Diterima (Rp) *</label>
                  <ThousandsInput className="input" value={payModal.paidAmount} onChange={v => setPayModal(m => ({ ...m, paidAmount: v }))} />
                  <p className="text-[11px] text-gray-400 mt-0.5">Nilai invoice: {formatRupiah(payModal.receivable.amount)}</p>
                </div>
                <div>
                  <label className="label">PPh Dipotong Klien (Rp)</label>
                  <ThousandsInput className="input" value={payModal.pphAmount} onChange={v => setPayModal(m => ({ ...m, pphAmount: v }))} placeholder="0 jika tidak ada pemotongan" />
                  <p className="text-[11px] text-gray-400 mt-0.5">Akan dicatat sebagai Kas Keluar (beban pajak)</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={submitPay} className="btn-primary text-sm flex-1">Konfirmasi Lunas → Catat ke Kas</button>
                <button onClick={() => setPayModal(null)} className="btn-secondary text-sm">Batal</button>
              </div>
            </div>
          </div>
        )}

        {/* Receivables / Piutang (Owner/Finance/Direksi only) */}
        {receivables && (
          <div className="card p-4 space-y-3 border-t-4 border-cyan-400">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs">📄</span>
                Piutang / Invoice Klien
              </h2>
              {(role === 'OWNER' || role === 'FINANCE' || isFinanceDirector(session.user)) && (
                <button onClick={() => setShowReceivableForm(v => !v)} className="btn-secondary text-xs">
                  {showReceivableForm ? 'Tutup' : '+ Tambah Piutang'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-orange-50">
                <p className="text-xs text-gray-500">Belum Dibayar</p>
                <p className="text-lg font-bold text-orange-600">{formatRupiah(receivables.totalUnpaid)}</p>
                <p className="text-xs text-gray-400">{receivables.receivables.filter(r => r.status === 'UNPAID' && !r.isVirtual).length} invoice</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <p className="text-xs text-gray-500">Sudah Dibayar</p>
                <p className="text-lg font-bold text-emerald-600">{formatRupiah(receivables.totalPaid)}</p>
                <p className="text-xs text-gray-400">{receivables.receivables.filter(r => r.status === 'PAID').length} invoice</p>
              </div>
            </div>

            {showReceivableForm && (role === 'OWNER' || role === 'FINANCE' || isFinanceDirector(session.user)) && (
              <form onSubmit={submitReceivable} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="sm:col-span-2">
                  <label className="label">Nama Klien (versi finance) *</label>
                  <input className="input" value={receivableForm.clientName} onChange={e => setReceivableForm(f => ({ ...f, clientName: e.target.value }))} required placeholder="Nama klien seperti di invoice" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Nama Project (versi finance)</label>
                  <input className="input" value={receivableForm.financeProjectName} onChange={e => setReceivableForm(f => ({ ...f, financeProjectName: e.target.value }))} placeholder="Nama project seperti di invoice klien (opsional)" />
                </div>
                <div>
                  <label className="label">No. Invoice</label>
                  <input className="input" value={receivableForm.invoiceNumber} onChange={e => setReceivableForm(f => ({ ...f, invoiceNumber: e.target.value }))} placeholder="cth. WTM/EVENT/INV/2026/021/25" />
                </div>
                <div>
                  <label className="label">No. PO Klien</label>
                  <input className="input" value={receivableForm.poNumber} onChange={e => setReceivableForm(f => ({ ...f, poNumber: e.target.value }))} placeholder="opsional" />
                </div>
                <div>
                  <label className="label">No. Faktur Pajak</label>
                  <input className="input" value={receivableForm.taxInvoiceNumber} onChange={e => setReceivableForm(f => ({ ...f, taxInvoiceNumber: e.target.value }))} placeholder="opsional" />
                </div>
                <div>
                  <label className="label">Nominal (Rp) *</label>
                  <ThousandsInput className="input" value={receivableForm.amount} onChange={v => setReceivableForm(f => ({ ...f, amount: v }))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Tanggal Invoice</label>
                  <input type="date" className="input" value={receivableForm.issueDate} onChange={e => setReceivableForm(f => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Jatuh Tempo</label>
                  <input type="date" className="input" value={receivableForm.dueDate} onChange={e => setReceivableForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Catatan</label>
                  <input className="input" value={receivableForm.notes} onChange={e => setReceivableForm(f => ({ ...f, notes: e.target.value }))} placeholder="opsional" />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button className="btn-primary text-sm" disabled={savingReceivable}>{savingReceivable ? 'Menyimpan...' : 'Simpan'}</button>
                  <button type="button" onClick={() => setShowReceivableForm(false)} className="btn-secondary text-sm">Batal</button>
                </div>
              </form>
            )}

            {receivables.receivables.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Belum ada catatan piutang</p>
            ) : (
              <div className="space-y-2">
                {receivables.receivables.map(r => {
                  const overdue = r.status === 'UNPAID' && !r.isVirtual && r.dueDate && new Date(r.dueDate) < new Date()
                  const canAct = role === 'OWNER' || role === 'FINANCE' || isFinanceDirector(session.user)
                  return (
                    <div key={r.id} className={`rounded-xl border p-3 transition-colors ${r.isVirtual ? 'border-dashed border-cyan-300 bg-cyan-50/60' : r.status === 'PAID' ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100 hover:bg-gray-50'}`}>
                      {/* Baris atas — nama klien + badge + nominal */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {r.isVirtual && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 font-semibold border border-cyan-200">Draft</span>
                            )}
                            {r.status === 'PAID' && !r.isVirtual && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Lunas ✓</span>
                            )}
                            {overdue && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Lewat Tenggat</span>}
                            <p className="text-sm font-semibold text-gray-800">{r.clientName}</p>
                          </div>
                          {/* Nama project */}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {r.financeProjectName || (r.project?.name)}
                            {r.project && <span className="text-gray-400"> · {r.project.code}</span>}
                          </p>
                          {/* Nomor-nomor */}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {r.invoiceNumber && <span className="text-[11px] text-gray-500">Invoice: <span className="font-medium">{r.invoiceNumber}</span></span>}
                            {r.poNumber && <span className="text-[11px] text-gray-500">PO: <span className="font-medium">{r.poNumber}</span></span>}
                            {r.taxInvoiceNumber && <span className="text-[11px] text-gray-500">Faktur Pajak: <span className="font-medium">{r.taxInvoiceNumber}</span></span>}
                          </div>
                          {/* Tanggal & catatan */}
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {r.dueDate ? `Jatuh tempo ${new Date(r.dueDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}` : ''}
                            {r.status === 'PAID' && r.paidAt ? `${r.dueDate ? ' · ' : ''}Dibayar ${new Date(r.paidAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}` : ''}
                            {r.notes ? ` · ${r.notes}` : ''}
                            {r.pphAmount > 0 && <span className="text-orange-500"> · PPh {formatRupiah(r.pphAmount)}</span>}
                          </p>
                        </div>
                        {/* Nominal */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-800">{formatRupiah(r.amount)}</p>
                          {r.status === 'PAID' && r.paidAmount && r.paidAmount !== r.amount && (
                            <p className="text-[11px] text-emerald-600">Diterima {formatRupiah(r.paidAmount)}</p>
                          )}
                        </div>
                      </div>

                      {/* Baris aksi */}
                      {canAct && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100/80">
                          {r.isVirtual ? (
                            <button onClick={() => confirmDraft(r)} className="text-xs px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-700 hover:bg-cyan-200 font-medium">
                              + Buat Invoice
                            </button>
                          ) : r.status === 'PAID' ? (
                            <button onClick={() => markUnpaid(r)} className="text-xs text-gray-400 hover:text-orange-500">Batalkan Lunas</button>
                          ) : (
                            <button onClick={() => openPayModal(r)} className="text-xs px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium">
                              Tandai Lunas
                            </button>
                          )}
                          {!r.isVirtual && (
                            confirmDeleteReceivableId === r.id ? (
                              <span className="inline-flex items-center gap-1 ml-auto">
                                <button onClick={() => removeReceivable(r.id)} className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                                <button onClick={() => setConfirmDeleteReceivableId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmDeleteReceivableId(r.id)} className="text-xs text-gray-400 hover:text-red-500 ml-auto">Hapus</button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Revenue summary per client — total revenue across all won projects */}
        {profitability && profitability.byClient.length > 0 && (
          <RevenuePerClientCard rows={profitability.byClient} rowsByDivision={profitability.byClientDivision} />
        )}

        {/* Margin report (Owner/Finance/Direksi only) */}
        {marginReport && marginReport.divisions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">📊</span>
                Laporan Margin per Divisi
              </h2>
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

        {/* Profitability per project */}
        {profitability && profitability.byProject?.length > 0 && (
          <ProfitabilityByProjectCard rows={profitability.byProject} />
        )}


        {/* Payment requests list */}
        <div className="card p-4 space-y-3 border-t-4 border-purple-400">
          <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">🧾</span>
              Pengajuan Pembayaran
            </h2>
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
    <div className="card p-5">
      <h3 className="text-base font-bold text-gray-900 tracking-tight mb-4">{title}</h3>
      {top.length === 0 ? (
        <p className="text-sm text-gray-400">Belum ada data project menang.</p>
      ) : (
        <div className="space-y-2">
          {top.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all group">
              <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 text-xs font-black flex items-center justify-center shrink-0 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">{labelMap ? (labelMap[r.label] || r.label) : r.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.count} project · {formatRupiah(r.totalValue)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={clsx('text-sm font-black whitespace-nowrap', r.totalMargin >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(r.totalMargin)}</p>
                <span className="inline-block text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 mt-0.5">{r.marginPct.toFixed(1)}% margin</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RevenueClientTable({ rows, accentColor = 'violet' }) {
  const sorted = [...rows].sort((a, b) => b.totalValue - a.totalValue)
  const grandTotal = sorted.reduce((s, r) => s + r.totalValue, 0)
  const totalProjects = sorted.reduce((s, r) => s + r.count, 0)
  const hoverRow = accentColor === 'blue' ? 'hover:bg-blue-50/40' : accentColor === 'amber' ? 'hover:bg-amber-50/40' : 'hover:bg-violet-50/40'
  const rankHover = accentColor === 'blue' ? 'group-hover:bg-blue-100 group-hover:text-blue-600' : accentColor === 'amber' ? 'group-hover:bg-amber-100 group-hover:text-amber-600' : 'group-hover:bg-violet-100 group-hover:text-violet-600'
  const barColor = accentColor === 'blue' ? 'bg-blue-400' : accentColor === 'amber' ? 'bg-amber-400' : 'bg-violet-400'
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b-2 border-gray-200 bg-gray-50">
            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Klien</th>
            <th className="hidden sm:table-cell py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Project</th>
            <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Total Revenue</th>
            <th className="hidden sm:table-cell py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Porsi</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const pct = grandTotal ? ((r.totalValue / grandTotal) * 100) : 0
            return (
              <tr key={r.id} className={clsx('border-b border-gray-100 transition-colors group', hoverRow)}>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx('w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors', rankHover)}>{i + 1}</span>
                    <span className="font-semibold text-gray-800 text-sm truncate max-w-[140px] sm:max-w-none">{r.label}</span>
                  </div>
                </td>
                <td className="hidden sm:table-cell py-2.5 px-3 text-right">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">{r.count}</span>
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap text-sm">{formatRupiah(r.totalValue)}</td>
                <td className="hidden sm:table-cell py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={clsx('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 w-10 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td className="py-3 px-3 font-bold text-gray-900 text-sm">
              Total <span className="ml-1 text-xs font-normal text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{sorted.length} klien</span>
            </td>
            <td className="hidden sm:table-cell py-3 px-3 text-right font-bold text-gray-900">{totalProjects}</td>
            <td className="py-3 px-3 text-right font-black text-gray-900 text-sm whitespace-nowrap">{formatRupiah(grandTotal)}</td>
            <td className="hidden sm:table-cell py-3 px-3 text-right font-bold text-gray-500">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const DIV_STYLE = {
  EVENT:   { gradient: 'from-blue-600 to-cyan-500',   border: 'border-blue-100',   bg: 'from-blue-50/50',   accent: 'blue',   icon: '🎪' },
  PH:      { gradient: 'from-amber-500 to-orange-500', border: 'border-amber-100',  bg: 'from-amber-50/50',  accent: 'amber',  icon: '🎬' },
  CREATIVE:{ gradient: 'from-purple-600 to-pink-500',  border: 'border-purple-100', bg: 'from-purple-50/50', accent: 'violet', icon: '🎨' },
}
const DIV_DEFAULT_STYLE = { gradient: 'from-gray-600 to-gray-500', border: 'border-gray-100', bg: 'from-gray-50/50', accent: 'violet', icon: '📁' }

function RevenuePerClientCard({ rows, rowsByDivision }) {
  const grandTotal = rows.reduce((s, r) => s + r.totalValue, 0)
  const byDivision = {}
  for (const r of (rowsByDivision || [])) {
    if (!byDivision[r.division]) byDivision[r.division] = []
    byDivision[r.division].push(r)
  }
  const divisionKeys = Object.keys(byDivision).sort((a, b) => {
    const ta = byDivision[a].reduce((s, r) => s + r.totalValue, 0)
    const tb = byDivision[b].reduce((s, r) => s + r.totalValue, 0)
    return tb - ta
  })

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900 tracking-tight">Summary Revenue per Klien</h3>
        <p className="text-xs text-gray-400 mt-0.5">Akumulasi nilai project (yang sudah/sedang berjalan) dari seluruh klien yang masuk ke Watermark.</p>
      </div>

      {/* Semua Divisi */}
      <details open className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/50 to-white overflow-hidden shadow-sm">
        <summary className="cursor-pointer select-none flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white list-none">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-xs">📊</span>
            <span className="text-sm font-bold tracking-tight">Semua Divisi (Total)</span>
          </div>
          <span className="text-base font-black">{formatRupiah(grandTotal)}</span>
        </summary>
        <div className="px-4 pb-4">
          <RevenueClientTable rows={rows} accentColor="violet" />
        </div>
      </details>

      {/* Per Divisi (EO / PH / dll) */}
      {divisionKeys.map(div => {
        const divRows = byDivision[div]
        const divTotal = divRows.reduce((s, r) => s + r.totalValue, 0)
        const s = DIV_STYLE[div] || DIV_DEFAULT_STYLE
        return (
          <details key={div} className={clsx('rounded-xl border overflow-hidden shadow-sm bg-gradient-to-r to-white', s.border, s.bg)}>
            <summary className={clsx('cursor-pointer select-none flex items-center justify-between gap-3 px-4 py-3 text-white list-none bg-gradient-to-r', s.gradient)}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-xs">{s.icon}</span>
                <span className="text-sm font-bold tracking-tight">{DIVISION_LABEL[div] || div}</span>
              </div>
              <span className="text-base font-black">{formatRupiah(divTotal)}</span>
            </summary>
            <div className="px-4 pb-4">
              <RevenueClientTable rows={divRows} accentColor={s.accent} />
            </div>
          </details>
        )
      })}
    </div>
  )
}

function ProfitabilityByProjectCard({ rows }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900 tracking-tight">Profitabilitas per Project</h3>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1 font-medium">{rows.length} project</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-left">Project</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-left hidden sm:table-cell">Klien</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right hidden md:table-cell">Nilai Project</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right hidden md:table-cell">Biaya Aktual</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Margin</th>
              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.projectId} className="border-b border-gray-100 hover:bg-violet-50/30 transition-colors">
                <td className="py-3 px-4">
                  <Link href={`/projects/${r.projectId}`} className="hover:text-violet-700 transition-colors">
                    <span className="text-[10px] font-bold text-violet-500 bg-violet-50 rounded px-1.5 py-0.5 mr-1.5 font-mono">{r.projectCode}</span>
                    <span className="text-sm font-semibold text-gray-800">{r.projectName}</span>
                  </Link>
                </td>
                <td className="py-3 px-4 hidden sm:table-cell">
                  <span className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">{r.clientName}</span>
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-800 text-sm whitespace-nowrap hidden md:table-cell">{formatRupiah(r.projectValue)}</td>
                <td className="py-3 px-4 text-right text-sm hidden md:table-cell">
                  {r.actualCost === 0
                    ? <span className="text-gray-300 italic text-xs">—</span>
                    : <span className="font-semibold text-gray-800">{formatRupiah(r.actualCost)}</span>
                  }
                </td>
                <td className={clsx('py-3 px-4 text-right font-bold text-sm whitespace-nowrap', r.margin >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatRupiah(r.margin)}</td>
                <td className="py-3 px-4 text-right">
                  <span className={clsx('inline-flex items-center justify-center text-[11px] font-bold rounded-full px-2.5 py-1', r.marginPct >= 50 ? 'bg-emerald-50 text-emerald-700' : r.marginPct >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600')}>
                    {r.marginPct.toFixed(1)}%
                  </span>
                </td>
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
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
