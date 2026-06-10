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
}

export default function AuditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

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
  }, [status, session])

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
