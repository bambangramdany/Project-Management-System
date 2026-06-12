'use client'
import { useEffect, useState } from 'react'
import { KPI_BY_ROLE, KPI_SCORE_LABEL, KPI_DEADLINE_DAY, resolveKpiPeriod } from '@/lib/constants'
import { CROSS_TEAM_PM_EMAIL } from '@/lib/rbac'
import KpiCriteriaEditor from '@/components/KpiCriteriaEditor'

export function canScoreKpiClient(evaluator, target) {
  if (!evaluator || !target) return false
  // Self-assessment: everyone may score their own monthly KPI
  if (evaluator.id === target.id) return true
  if (evaluator.role === 'OWNER') return true
  if (['OWNER', 'DIRECTOR'].includes(target.role)) return false
  if (evaluator.role === 'DIRECTOR') return evaluator.divisi === target.divisi
  if (evaluator.email === CROSS_TEAM_PM_EMAIL) return true
  if (evaluator.role === 'PROJECT_MANAGER') return target.role !== 'PROJECT_MANAGER'
  return ['CREATIVE_LEAD', 'FINANCE'].includes(evaluator.role)
}

export default function KpiPanel({ user, session }) {
  const [items, setItems] = useState(KPI_BY_ROLE[user.role] || [])
  const [period] = useState(resolveKpiPeriod())
  const today = new Date()
  const isPastDeadline = today.getDate() > KPI_DEADLINE_DAY
  const [scores, setScores] = useState({})
  const [comments, setComments] = useState({})
  const [existing, setExisting] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const canScore = canScoreKpiClient(session?.user, user)

  useEffect(() => {
    fetch(`/api/kpi?userId=${user.id}&period=${period}`).then(r => r.ok ? r.json() : []).then(data => {
      setExisting(Array.isArray(data) ? data : [])
      const mine = (Array.isArray(data) ? data : []).filter(a => a.evaluatorId === session?.user.id)
      const sc = {}, cm = {}
      mine.forEach(a => { sc[a.kpiKey] = a.score; cm[a.kpiKey] = a.comment || '' })
      setScores(sc); setComments(cm)
    })
  }, [user.id, period])

  async function save() {
    setSaving(true); setSaved(false)
    const payload = items.map(it => ({ kpiKey: it.key, score: scores[it.key] || 3, comment: comments[it.key] || '' }))
    const res = await fetch('/api/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, period, items: payload }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      fetch(`/api/kpi?userId=${user.id}&period=${period}`).then(r => r.ok ? r.json() : []).then(data => setExisting(Array.isArray(data) ? data : []))
    }
  }

  // Average across all evaluators per kpiKey
  const avgByKey = {}
  items.forEach(it => {
    const vals = existing.filter(a => a.kpiKey === it.key)
    avgByKey[it.key] = vals.length ? (vals.reduce((s, a) => s + a.score, 0) / vals.length) : null
  })

  return (
    <div className="mb-4 p-3 rounded-lg bg-brand-50 border border-brand-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">KPI — {user.jobTitle || user.role} · {period}</p>
        {canScore && (
          <span className="text-xs text-gray-400">
            {session?.user.id === user.id ? 'Penilaian Diri (Self-Assessment)' : 'Penilaian Atasan'}
          </span>
        )}
        {!canScore && <span className="text-xs text-gray-400">Hanya superior/pemberi task yang bisa menilai</span>}
      </div>
      <KpiCriteriaEditor role={user.role} division={user.divisi} session={session} onChange={setItems} />
      {canScore && isPastDeadline && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2">
          ⚠ Sudah lewat tanggal {KPI_DEADLINE_DAY}. Pengisian KPI bulan ini tercatat terlambat dan akan mengurangi poin Anda sebagai penilai. Periode penilaian saat ini: {period}.
        </p>
      )}
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.key} className="bg-white rounded-lg p-2.5 border border-brand-100">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-gray-700 flex-1">{it.label}</p>
              {avgByKey[it.key] != null && (
                <span className="text-xs font-semibold text-brand-700 shrink-0">Rata-rata: {avgByKey[it.key].toFixed(1)}</span>
              )}
            </div>
            {canScore && (
              <div className="flex items-center gap-2 mt-1.5">
                <select
                  className="select w-auto text-xs py-1"
                  value={scores[it.key] || 3}
                  onChange={e => setScores(s => ({ ...s, [it.key]: parseInt(e.target.value) }))}
                >
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {KPI_SCORE_LABEL[n]}</option>)}
                </select>
                <input
                  className="input text-xs py-1 flex-1"
                  placeholder="Catatan (opsional)"
                  value={comments[it.key] || ''}
                  onChange={e => setComments(c => ({ ...c, [it.key]: e.target.value }))}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {canScore && (
        <div className="flex items-center gap-2 mt-2">
          <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
            {saving ? 'Menyimpan...' : 'Simpan Penilaian'}
          </button>
          {saved && <span className="text-xs text-green-600">Tersimpan ✓</span>}
        </div>
      )}
    </div>
  )
}
