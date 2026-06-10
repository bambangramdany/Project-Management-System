'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { KPI_BY_ROLE, resolveKpiPeriod } from '@/lib/constants'

const SUMMARY_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE']

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function KpiSummaryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState(resolveKpiPeriod())
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !SUMMARY_ROLES.includes(session.user.role)) router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated' && SUMMARY_ROLES.includes(session.user.role)) {
      setLoading(true)
      fetch(`/api/kpi?period=${period}`).then(r => r.json()).then(data => {
        setAssessments(Array.isArray(data) ? data : [])
        setLoading(false)
      })
    }
  }, [status, session, period])

  if (status !== 'authenticated' || !SUMMARY_ROLES.includes(session?.user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Group by user
  const byUser = {}
  assessments.forEach(a => {
    if (!byUser[a.userId]) byUser[a.userId] = { user: a.user, items: [] }
    byUser[a.userId].items.push(a)
  })
  const users = Object.values(byUser)

  // Lateness summary per evaluator
  const byEvaluator = {}
  assessments.forEach(a => {
    if (!byEvaluator[a.evaluatorId]) byEvaluator[a.evaluatorId] = { evaluator: a.evaluator, total: 0, late: 0 }
    byEvaluator[a.evaluatorId].total += 1
    if (a.late) byEvaluator[a.evaluatorId].late += 1
  })
  const evaluators = Object.values(byEvaluator).filter(e => e.late > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ringkasan KPI</h1>
            <p className="text-sm text-gray-500">Dilihat oleh HR & Management</p>
          </div>
          <input type="month" className="input w-auto" value={period} onChange={e => setPeriod(e.target.value)} />
        </div>

        {evaluators.length > 0 && (
          <div className="card p-4 border-l-4 border-red-400">
            <p className="text-sm font-semibold text-red-600 mb-1">Ketepatan Pengisian KPI</p>
            <p className="text-xs text-gray-500 mb-2">Penilai berikut mengisi setelah tanggal 23 (poin penilai dapat dikurangi):</p>
            <ul className="text-sm text-gray-700 space-y-0.5">
              {evaluators.map(e => (
                <li key={e.evaluator?.id}>{e.evaluator?.name} — {e.late} dari {e.total} penilaian terlambat</li>
              ))}
            </ul>
          </div>
        )}

        {loading && <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>}
        {!loading && users.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada penilaian KPI untuk periode ini</p>
        )}

        <div className="space-y-3">
          {users.map(({ user, items }) => {
            const overall = items.reduce((s, a) => s + a.score, 0) / items.length
            const kpiDefs = KPI_BY_ROLE[user.role] || []
            const isOpen = expanded === user.id
            return (
              <div key={user.id} className="card p-4">
                <button onClick={() => setExpanded(isOpen ? null : user.id)} className="w-full flex items-center justify-between gap-3 text-left">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.jobTitle || user.role} · Divisi {user.divisi}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-700">{overall.toFixed(1)}</p>
                      <p className="text-xs text-gray-400">{items.length} penilaian</p>
                    </div>
                    <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {kpiDefs.map(def => {
                      const rows = items.filter(a => a.kpiKey === def.key)
                      if (rows.length === 0) return null
                      const avg = rows.reduce((s, a) => s + a.score, 0) / rows.length
                      return (
                        <div key={def.key} className="text-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-gray-700">{def.label}</p>
                            <span className="font-semibold text-brand-700">{avg.toFixed(1)}</span>
                          </div>
                          <div className="mt-1 space-y-1">
                            {rows.map(r => (
                              <p key={r.id} className="text-xs text-gray-400 pl-3">
                                {r.evaluator?.name} ({r.evaluator?.jobTitle || '-'}): <span className="font-medium text-gray-600">{r.score}</span>
                                {r.comment && <> — {r.comment}</>}
                                {r.late && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-medium">Telat input</span>}
                              </p>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
