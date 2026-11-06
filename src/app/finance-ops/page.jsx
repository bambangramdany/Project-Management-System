'use client'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { isFinanceDirector } from '@/lib/rbac'
import { OPEX_CATEGORIES, ASSET_CATEGORY_LABEL, ASSET_CONDITION_LABEL } from '@/lib/constants'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' })

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
function periodLabel(period) {
  const [y, m] = period.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}
function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── Target Tab ────────────────────────────────────────────────────────────────
function TargetTab({ session }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isOwner = session?.user.role === 'OWNER'
  const DIVISIONS = ['EVENT', 'CREATIVE', 'PH', 'FINANCE_HRGA']
  const DIV_LABEL = { EVENT: 'Event Organizer', CREATIVE: 'Creative', PH: 'Production House', FINANCE_HRGA: 'Finance / HR-GA' }

  const load = () => {
    setLoading(true)
    fetch(`/api/targets?year=${year}`).then(r => r.ok ? r.json() : []).then(d => {
      setData(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [year])

  const startEdit = () => {
    const f = {}
    DIVISIONS.forEach(div => {
      const t = data?.find(d => d.division === div)
      f[`${div}_revenue`] = t?.revenueTarget ?? ''
      f[`${div}_projects`] = t?.projectCountTarget ?? ''
    })
    setForm(f)
    setEditing(true)
    setError('')
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const payload = DIVISIONS.map(div => ({
      division: div,
      year,
      revenueTarget: parseFloat(String(form[`${div}_revenue`]).replace(/\D/g, '')) || 0,
      projectCountTarget: parseInt(form[`${div}_projects`]) || 0,
    }))
    const res = await fetch('/api/targets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: payload }),
    })
    setSaving(false)
    if (res.ok) { setEditing(false); load() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Gagal menyimpan') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Tahun:</label>
          <select className="select w-auto" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {isOwner && !editing && (
          <button onClick={startEdit} className="btn-primary text-sm">Edit Target</button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Batal</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIVISIONS.map(div => {
            const t = data?.find(d => d.division === div)
            return (
              <div key={div} className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">{DIV_LABEL[div]}</h3>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="label">Target Revenue (Rp)</label>
                      <input type="number" className="input" value={form[`${div}_revenue`]}
                        onChange={e => setForm(f => ({ ...f, [`${div}_revenue`]: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <label className="label">Target Jumlah Project</label>
                      <input type="number" className="input" value={form[`${div}_projects`]}
                        onChange={e => setForm(f => ({ ...f, [`${div}_projects`]: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Target Revenue</p>
                      <p className="text-xl font-bold text-gray-900">{t ? fmt(t.revenueTarget) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Target Jumlah Project</p>
                      <p className="text-xl font-bold text-gray-900">{t ? (t.projectCountTarget ?? '—') : '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Kas Tab ───────────────────────────────────────────────────────────────────
function KasTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: 'IN', amount: '', description: '', date: '', pph23: '', invoiceRef: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/cashflow/transactions').then(r => r.ok ? r.json() : null).then(d => {
      setData(d); setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

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
    if (res.ok) { setForm({ type: 'IN', amount: '', description: '', date: '', pph23: '', invoiceRef: '' }); load() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Gagal menyimpan') }
  }

  const remove = async (id) => {
    const res = await fetch(`/api/cashflow/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else { const d = await res.json().catch(() => ({})); setConfirmDeleteId(null); alert(d.error || 'Gagal menghapus') }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Catat uang masuk & keluar untuk memantau saldo kas perusahaan</p>
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500">Saldo Kas</p>
            <p className={`text-2xl font-bold ${data.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmt(data.balance)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Total Masuk</p>
            <p className="text-lg font-bold text-green-600">{fmt(data.totalIn)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Total Keluar</p>
            <p className="text-lg font-bold text-red-600">{fmt(data.totalOut)}</p>
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
          {form.type === 'IN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100">
              <div>
                <label className="label">No. Invoice <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input className="input font-mono" value={form.invoiceRef}
                  onChange={e => setForm(f => ({ ...f, invoiceRef: e.target.value }))} placeholder="WTM/EO/INV/2026/001 atau -" />
              </div>
              <div>
                <label className="label">PPh 23 dipotong klien <span className="text-gray-400 font-normal">(2% · opsional)</span></label>
                <input type="number" className="input" value={form.pph23}
                  onChange={e => setForm(f => ({ ...f, pph23: e.target.value }))} placeholder="0" />
                {form.amount && form.pph23 && (
                  <p className="text-xs text-gray-400 mt-1">Diterima bersih: {fmt((parseFloat(form.amount)||0) - (parseFloat(form.pph23)||0))}</p>
                )}
              </div>
            </div>
          )}
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
                {tx.paymentRequest && <span className="text-xs text-gray-400"> · {tx.paymentRequest.project.code}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(tx.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                {tx.recordedBy && ` · dicatat oleh ${tx.recordedBy.name}`}
                {tx.invoiceRef && tx.invoiceRef !== '-' && <span className="text-blue-400"> · inv {tx.invoiceRef}</span>}
                {tx.pph23 > 0 && <span className="text-amber-500"> · PPh23 -{fmt(tx.pph23)}</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-semibold ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'IN' ? '+' : '-'}{fmt(tx.amount)}
              </p>
              {!tx.paymentRequestId && (
                confirmDeleteId === tx.id ? (
                  <span className="inline-flex items-center gap-1 mt-1">
                    <button onClick={() => remove(tx.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Batal</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteId(tx.id)} className="text-[10px] text-gray-400 hover:text-red-500">Hapus</button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Opex Tab ──────────────────────────────────────────────────────────────────
function OpexTab() {
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

  const load = () => {
    setLoading(true)
    fetch(`/api/opex?period=${period}`).then(r => r.ok ? r.json() : null).then(d => {
      setData(d); setLoading(false)
    })
  }
  useEffect(() => { load() }, [period])

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
    if (res.ok) { setForm({ category: OPEX_CATEGORIES[0], amount: '', description: '', date: '' }); load() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Gagal menyimpan') }
  }

  const remove = async (id) => {
    const res = await fetch(`/api/opex/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else { const d = await res.json().catch(() => ({})); setConfirmDeleteId(null); alert(d.error || 'Gagal menghapus') }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/opex/import', { method: 'POST', body: fd })
    setImporting(false)
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setImportResult(d); load() }
    else { setImportResult({ error: d.error || 'Gagal mengimpor file' }) }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Kelola pengeluaran operasional bulanan</p>

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
            <>Berhasil mengimpor {importResult.imported} entri{importResult.skipped > 0 && `, ${importResult.skipped} dilewati`}.</>
          )}
        </div>
      )}

      <div className="card p-4 border-t-4 border-orange-400">
        <p className="text-sm font-semibold text-gray-700 mb-3">Ringkasan {periodLabel(period)}</p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-500">Total Opex</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(data?.total)}</p>
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
                <span className="font-medium text-gray-800">{fmt(amount)}</span>
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
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="contoh: Tagihan listrik kantor" />
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
                <p className="text-sm font-medium text-gray-800">{e.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.category}
                  {e.date && ` · ${new Date(e.date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`}
                  {!isAuto && e.recordedBy && ` · dicatat oleh ${e.recordedBy.name}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${isAuto ? 'text-violet-700' : 'text-red-600'}`}>
                  -{fmt(e.amount)}
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Hutang Tab ────────────────────────────────────────────────────────────────
function formatThousands(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}
function ThousandsInput({ value, onChange, className, placeholder }) {
  return (
    <input type="text" inputMode="numeric" className={className}
      value={formatThousands(value)}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      placeholder={placeholder} />
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
function computeDebtTotals(debt) {
  const payments = debt.payments || []
  const totalBunga = payments.filter(p => p.paymentType === 'INTEREST').reduce((s, p) => s + p.interestAmount, 0)
  const totalHutang = debt.principal + totalBunga
  const bungaSudahDibayar = payments.filter(p => p.paymentType === 'INTEREST' && p.status === 'PAID').reduce((s, p) => s + p.interestAmount, 0)
  const sisaHutang = totalHutang - bungaSudahDibayar
  return { totalBunga, totalHutang, bungaSudahDibayar, sisaHutang }
}

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
            <button onClick={() => onAction(debtId, p.id, 'unmark')} className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200">Lunas ✓</button>
          ) : (
            <button onClick={() => onAction(debtId, p.id, 'mark_interest_paid')} className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Bayar Bunga</button>
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

function PrincipalRow({ p, debtId, canManage, onAction, now }) {
  const overdue = p.status === 'PENDING' && new Date(p.dueDate) < now
  const principalPaid = p.principalStatus === 'PAID'
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
          {principalPaid && p.principalPaidAt && <span className="text-green-600 ml-2">· dibayar {fmtDate(p.principalPaidAt)}</span>}
        </p>
        <p className="text-[11px] text-amber-600 mt-0.5">Transfer terpisah dari cicilan bunga</p>
      </div>
      {canManage && !principalPaid && (
        <button onClick={() => onAction(debtId, p.id, 'mark_principal_paid')}
          className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shrink-0 font-medium">Bayar Pokok</button>
      )}
      {canManage && principalPaid && (
        <button onClick={() => onAction(debtId, p.id, 'unmark')}
          className="text-xs px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 shrink-0">Lunas ✓</button>
      )}
      {!canManage && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${principalPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {principalPaid ? 'Lunas' : 'Belum'}
        </span>
      )}
    </div>
  )
}

function HutangTab({ canManage }) {
  const emptyForm = { lenderName: '', principal: '', interestRate: '', tenorMonths: '', interestCycle: '1', startDate: '', notes: '' }
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [editDebt, setEditDebt] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const now = new Date()

  const load = () => {
    setLoading(true)
    fetch('/api/debts').then(r => r.ok ? r.json() : []).then(d => {
      setDebts(Array.isArray(d) ? d : []); setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    const res = await fetch('/api/debts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSubmitting(false)
    if (res.ok) { setForm(emptyForm); setShowForm(false); load() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Gagal menyimpan') }
  }

  const doAction = async (debtId, paymentId, action) => {
    const res = await fetch(`/api/debts/${debtId}/payments/${paymentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    if (res.ok) load()
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'Gagal menyimpan') }
  }

  const startEdit = (debt) => {
    setEditDebt(debt)
    setEditForm({ lenderName: debt.lenderName, interestRate: String(debt.interestRate ?? 0), principal: String(debt.principal), tenorMonths: String(debt.tenorMonths), interestCycle: String(debt.interestCycle ?? 1), notes: debt.notes ?? '' })
    setEditError('')
  }

  const saveEdit = async () => {
    if (!editDebt) return; setEditError(''); setSavingEdit(true)
    const res = await fetch(`/api/debts/${editDebt.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lenderName: editForm.lenderName, interestRate: editForm.interestRate, notes: editForm.notes }) })
    setSavingEdit(false)
    if (res.ok) { setEditDebt(null); load() }
    else { const d = await res.json().catch(() => ({})); setEditError(d.error || 'Gagal menyimpan') }
  }

  const removeDebt = async (id) => {
    const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else { const d = await res.json().catch(() => ({})); setConfirmDeleteId(null); alert(d.error || 'Gagal menghapus') }
  }

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Skema: bunga dicicil per bulan/2 bulan · pokok dibayar saat jatuh tempo</p>
        {canManage && (
          <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">{showForm ? 'Tutup' : '+ Tambah Hutang'}</button>
        )}
      </div>

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
                  <th className="py-2 pr-3">Jatuh Tempo</th>
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
                              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${countdown.tone === 'overdue' ? 'bg-red-100 text-red-700' : countdown.tone === 'soon' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{countdown.text}</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="label">Bunga per Siklus (%)</label>
                <input type="number" step="0.01" className="input" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} placeholder="1.75" />
                {form.principal && form.interestRate && (
                  <p className="text-xs text-gray-400 mt-1">≈ {fmt(Math.round((parseFloat(form.principal)||0)*(parseFloat(form.interestRate)||0)/100))} / siklus</p>
                )}
              </div>
              <div>
                <label className="label">Siklus Bayar Bunga</label>
                <select className="input" value={form.interestCycle} onChange={e => setForm(f => ({ ...f, interestCycle: e.target.value }))}>
                  <option value="1">Setiap bulan</option>
                  <option value="2">Setiap 2 bulan</option>
                </select>
              </div>
              <div>
                <label className="label">Jumlah Cicilan Bunga *</label>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan & Buat Jadwal'}</button>
          </form>
        </div>
      )}

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
      {!loading && debts.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Belum ada catatan hutang</div>}

      {!loading && debts.map(debt => {
        const t = computeDebtTotals(debt)
        const isExpanded = expanded === debt.id
        const interestPayments = debt.payments.filter(p => p.paymentType === 'INTEREST')
        const principalPayment = debt.payments.find(p => p.paymentType === 'PRINCIPAL')
        const paidInterestCount = interestPayments.filter(p => p.status === 'PAID').length

        return (
          <div key={debt.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-gray-900">{debt.lenderName}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${debt.status === 'PAID_OFF' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {debt.status === 'PAID_OFF' ? 'Lunas' : 'Aktif'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pokok {fmt(debt.principal)} · {debt.tenorMonths} cicilan bunga{debt.interestCycle > 1 ? ` (per ${debt.interestCycle} bulan)` : ' (per bulan)'} · Mulai {fmtDate(debt.startDate)}
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Total Hutang', val: t.totalHutang, bg: 'bg-red-50', text: 'text-red-700', sub: 'Pokok + Semua Bunga' },
                { label: 'Sisa Hutang', val: t.sisaHutang, bg: 'bg-orange-50', text: 'text-orange-700', sub: 'Total − Bunga Terbayar' },
                { label: 'Bunga Sudah Dibayar', val: t.bungaSudahDibayar, bg: 'bg-indigo-50', text: 'text-indigo-700', sub: `${paidInterestCount}/${interestPayments.length} cicilan` },
                { label: 'Bunga per Siklus', val: debt.monthlyInterest, bg: 'bg-gray-50', text: 'text-gray-900', sub: `${debt.interestRate}% × pokok` },
              ].map(({ label, val, bg, text, sub }) => (
                <div key={label} className={`p-2.5 rounded-lg ${bg}`}>
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className={`text-sm font-bold ${text}`}>{fmt(val)}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setExpanded(isExpanded ? null : debt.id)} className="text-xs font-medium text-brand hover:underline mt-3">
              {isExpanded ? '▲ Sembunyikan jadwal' : '▼ Lihat jadwal cicilan'}
            </button>

            {isExpanded && (
              <div className="mt-3 border-t border-gray-100">
                <div className="mt-2">
                  <p className="text-xs font-semibold text-indigo-700 mb-1 uppercase tracking-wide">Cicilan Bunga ({paidInterestCount}/{interestPayments.length} lunas)</p>
                  {interestPayments.map(p => (
                    <InterestRow key={p.id} p={p} debtId={debt.id} canManage={canManage} onAction={doAction} now={now} />
                  ))}
                </div>
                {principalPayment && (
                  <div className="mt-4 pt-3 border-t-2 border-dashed border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Pelunasan Pokok — Transfer Terpisah</p>
                    <PrincipalRow p={principalPayment} debtId={debt.id} canManage={canManage} onAction={doAction} now={now} interestPayments={interestPayments} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

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
                <input className="input" value={editForm.lenderName} onChange={e => setEditForm(f => ({ ...f, lenderName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Pokok Pinjaman</label>
                  <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">{fmt(editDebt.principal)}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Tidak bisa diubah</p>
                </div>
                <div>
                  <label className="label">Bunga per Siklus (%)</label>
                  <input type="number" step="0.01" className="input" value={editForm.interestRate} onChange={e => setEditForm(f => ({ ...f, interestRate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Catatan</label>
                <input className="input" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="opsional" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setEditDebt(null)} className="btn-secondary text-sm">Batal</button>
              <button onClick={saveEdit} disabled={savingEdit} className="btn-primary text-sm">{savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Aset Tab ──────────────────────────────────────────────────────────────────
const CONDITION_COLOR = {
  BAIK: 'bg-green-100 text-green-700',
  RUSAK_RINGAN: 'bg-yellow-100 text-yellow-700',
  RUSAK_BERAT: 'bg-red-100 text-red-700',
}
const EMPTY_ASSET_FORM = { name: '', category: 'EQUIPMENT', condition: 'BAIK', acquisitionCost: '', currentValue: '', acquisitionDate: '', notes: '' }

function AsetTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_ASSET_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/assets?category=${category}`).then(r => r.ok ? r.json() : null).then(d => {
      setData(d); setLoading(false)
    })
  }
  useEffect(() => { load() }, [category])

  const submit = async (e) => {
    e.preventDefault(); setError('')
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
    if (res.ok) { setForm(EMPTY_ASSET_FORM); setShowForm(false); load() }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Gagal menyimpan') }
  }

  const remove = async (id) => {
    const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else { const d = await res.json().catch(() => ({})); setConfirmDeleteId(null); alert(d.error || 'Gagal menghapus') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Kelola inventaris aset perusahaan</p>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm">{showForm ? 'Tutup' : '+ Tambah Aset'}</button>
      </div>

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500">Total Nilai Aset</p>
            <p className="text-2xl font-bold text-brand-700">{fmt(data.totalValue)}</p>
            <p className="text-xs text-gray-400 mt-1">{data.count} aset</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Harga Perolehan</p>
            <p className="text-lg font-bold text-gray-700">{fmt(data.totalCost)}</p>
            <p className="text-xs text-gray-400 mt-1">{data.count} aset</p>
          </div>
          <div className="card p-4 bg-red-50 border border-red-100">
            <p className="text-xs text-gray-500">Total Depresiasi</p>
            <p className={`text-lg font-bold ${data.totalDepreciation < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(data.totalDepreciation)}</p>
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
        <p className="text-sm font-semibold text-gray-700 mb-2">Filter Kategori</p>
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
            {loading && <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Memuat...</td></tr>}
            {!loading && data?.assets.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Belum ada aset</td></tr>}
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
                <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{fmt(a.acquisitionCost)}</td>
                <td className="px-4 py-3 text-right font-semibold text-brand-700 whitespace-nowrap">{fmt(a.currentValue)}</td>
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
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'target', label: 'Target' },
  { key: 'kas',    label: 'Kas' },
  { key: 'opex',   label: 'Opex' },
  { key: 'hutang', label: 'Hutang' },
  { key: 'aset',   label: 'Aset' },
]

export default function FinanceOpsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('target')

  const isOwner = session?.user.role === 'OWNER'
  const isFinance = session?.user.role === 'FINANCE'
  const isDirector = session?.user.role === 'DIRECTOR'
  const isFinDir = isFinanceDirector(session?.user)
  const canSeeFinance = isOwner || isFinance || isFinDir
  const canView = canSeeFinance || isDirector

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canView) router.push('/dashboard')
  }, [status, session, router])

  if (status !== 'authenticated' || !canView) {
    return (
      <div className="fixed inset-0 bg-brand-50 flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const visibleTabs = TABS.filter(t => {
    if (t.key === 'target') return isOwner || isDirector || isFinance || isFinDir
    if (t.key === 'kas') return canSeeFinance
    if (t.key === 'opex') return canSeeFinance
    if (t.key === 'hutang') return canView
    if (t.key === 'aset') return canSeeFinance
    return false
  })

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Keuangan Operasional</h1>
          <p className="text-sm text-gray-500">Target · Kas · Opex · Hutang · Aset</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={activeTab === tab.key ? { background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'target' && <TargetTab session={session} />}
          {activeTab === 'kas'    && <KasTab />}
          {activeTab === 'opex'   && <OpexTab />}
          {activeTab === 'hutang' && <HutangTab canManage={canSeeFinance} />}
          {activeTab === 'aset'   && <AsetTab />}
        </div>
      </main>
    </div>
  )
}
