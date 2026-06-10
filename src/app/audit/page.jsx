'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { isFinanceDirector } from '@/lib/rbac'

const ACTION_LABEL = {
  PROJECT_STATUS_CHANGE: 'Status Project',
  PROJECT_VALUE_CHANGE: 'Nilai Project',
  PROJECT_PIC_CHANGE: 'PIC Project',
  PROJECT_MEMBERS_CHANGE: 'Anggota Project',
  BUDGET_LOCK: 'Kunci Forecast',
  BUDGET_UNLOCK: 'Buka Kunci Forecast',
  BUDGET_FORECAST_UPDATE: 'Update Forecast',
  PAYMENT_APPROVE_OWNER: 'Approval Direktur Utama',
  PAYMENT_REJECT_OWNER: 'Penolakan Direktur Utama',
  PAYMENT_APPROVE_DIRECTOR: 'Approval Direktur Divisi',
  PAYMENT_REJECT_DIRECTOR: 'Penolakan Direktur Divisi',
  PAYMENT_APPROVE_FINANCE_DIRECTOR: 'Approval Direktur Finance',
  PAYMENT_REJECT_FINANCE_DIRECTOR: 'Penolakan Direktur Finance',
  PAYMENT_PAID: 'Pembayaran Dieksekusi',
  SETTING_UPDATE: 'Pengaturan Sistem',
  TARGET_UPDATE: 'Target Tahunan',
  CASH_TRANSACTION: 'Catatan Kas',
  CASH_TRANSACTION_DELETE: 'Hapus Catatan Kas',
  DEBT_CREATE: 'Tambah Hutang',
  DEBT_STATUS_CHANGE: 'Status Hutang',
  DEBT_DELETE: 'Hapus Hutang',
  DEBT_PAYMENT_PAID: 'Pembayaran Cicilan Hutang',
  DEBT_PAYMENT_UNPAID: 'Batal Pembayaran Cicilan',
}

const ACTION_COLOR = {
  PROJECT_STATUS_CHANGE: 'bg-blue-100 text-blue-700',
  PROJECT_VALUE_CHANGE: 'bg-purple-100 text-purple-700',
  PROJECT_PIC_CHANGE: 'bg-purple-100 text-purple-700',
  PROJECT_MEMBERS_CHANGE: 'bg-purple-100 text-purple-700',
  BUDGET_LOCK: 'bg-amber-100 text-amber-700',
  BUDGET_UNLOCK: 'bg-amber-100 text-amber-700',
  BUDGET_FORECAST_UPDATE: 'bg-amber-100 text-amber-700',
  PAYMENT_APPROVE_OWNER: 'bg-green-100 text-green-700',
  PAYMENT_APPROVE_DIRECTOR: 'bg-green-100 text-green-700',
  PAYMENT_APPROVE_FINANCE_DIRECTOR: 'bg-green-100 text-green-700',
  PAYMENT_REJECT_OWNER: 'bg-red-100 text-red-700',
  PAYMENT_REJECT_DIRECTOR: 'bg-red-100 text-red-700',
  PAYMENT_REJECT_FINANCE_DIRECTOR: 'bg-red-100 text-red-700',
  PAYMENT_PAID: 'bg-emerald-100 text-emerald-700',
  SETTING_UPDATE: 'bg-indigo-100 text-indigo-700',
  TARGET_UPDATE: 'bg-indigo-100 text-indigo-700',
  CASH_TRANSACTION: 'bg-teal-100 text-teal-700',
  CASH_TRANSACTION_DELETE: 'bg-red-100 text-red-700',
  DEBT_CREATE: 'bg-amber-100 text-amber-700',
  DEBT_STATUS_CHANGE: 'bg-amber-100 text-amber-700',
  DEBT_DELETE: 'bg-red-100 text-red-700',
  DEBT_PAYMENT_PAID: 'bg-emerald-100 text-emerald-700',
  DEBT_PAYMENT_UNPAID: 'bg-red-100 text-red-700',
}

export default function AuditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [threshold, setThreshold] = useState(null)
  const [thresholdInput, setThresholdInput] = useState('')
  const [savingThreshold, setSavingThreshold] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session.user.role !== 'OWNER' && !isFinanceDirector(session.user)) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session.user.role !== 'OWNER' && !isFinanceDirector(session.user)) return
    setLoading(true)
    fetch('/api/audit').then(r => r.ok ? r.json() : []).then(data => {
      setLogs(Array.isArray(data) ? data : [])
      setLoading(false)
    })
    fetch('/api/settings/approval-threshold').then(r => r.ok ? r.json() : null).then(data => {
      if (data) { setThreshold(data); setThresholdInput(String(data.threshold)) }
    })
  }, [status, session])

  const saveThreshold = async () => {
    setSavingThreshold(true)
    const res = await fetch('/api/settings/approval-threshold', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: thresholdInput }),
    })
    setSavingThreshold(false)
    if (res.ok) {
      const data = await res.json()
      setThreshold(t => ({ ...t, threshold: data.threshold }))
    }
  }

  if (status !== 'authenticated' || (session.user.role !== 'OWNER' && !isFinanceDirector(session.user))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const categories = {
    '': 'Semua',
    PROJECT_STATUS_CHANGE: 'Status Project',
    PROJECT_VALUE_CHANGE: 'Nilai Project',
    PROJECT_MEMBERS_CHANGE: 'Anggota Project',
    BUDGET_LOCK: 'Kunci Forecast',
    BUDGET_UNLOCK: 'Buka Kunci Forecast',
    BUDGET_FORECAST_UPDATE: 'Update Forecast',
    PAYMENT_PAID: 'Pembayaran',
  }

  const filtered = filter ? logs.filter(l => l.action === filter) : logs

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500">Riwayat perubahan penting di seluruh sistem</p>
          </div>
        </div>

        {threshold && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Batas Approval Direktur Utama</h3>
            <p className="text-xs text-gray-500 mb-3">
              Pengajuan pembayaran dari Direktur Divisi (Event/PH/Creative) di bawah atau sama dengan nominal ini akan langsung ke Direktur Finance tanpa perlu approval Direktur Utama terlebih dahulu. Direktur Finance tetap wajib menyetujui semua pengeluaran.
            </p>
            {threshold.canEdit ? (
              <div className="flex items-center gap-2">
                <input type="number" className="input w-auto" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)} />
                <button onClick={saveThreshold} disabled={savingThreshold} className="btn-primary text-sm">
                  {savingThreshold ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-800">Rp {Math.round(threshold.threshold).toLocaleString('id-ID')}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
          <select className="select sm:w-56" value={filter} onChange={e => setFilter(e.target.value)}>
            {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Belum ada catatan audit</div>
        )}

        <div className="card divide-y divide-gray-50">
          {filtered.map(log => (
            <div key={log.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{log.summary}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'}`}>
                {ACTION_LABEL[log.action] || log.action}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
