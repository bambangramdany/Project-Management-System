'use client'
import { useEffect, useState } from 'react'
import { KPI_BY_ROLE, KPI_SCORE_LABEL, KPI_DEADLINE_DAY, resolveKpiPeriod } from '@/lib/constants'
import { canScoreKpi as canScoreKpiClient } from '@/lib/rbac'
import KpiCriteriaEditor from '@/components/KpiCriteriaEditor'

export { canScoreKpiClient }

export default function KpiPanel({ user, session, defaultOpen = false, period: periodProp, projects }) {
  const [open, setOpen] = useState(defaultOpen)
  const [items, setItems] = useState(KPI_BY_ROLE[user.role] || [])
  const period = periodProp || resolveKpiPeriod()
  const today = new Date()
  const isPastDeadline = today.getDate() > KPI_DEADLINE_DAY
  const [scores, setScores] = useState({})
  const [comments, setComments] = useState({})
  const [existing, setExisting] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checkInScores, setCheckInScores] = useState(null)
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

  // Fetch auto-scored check-in data
  useEffect(() => {
    fetch(`/api/daily-checkin/scores?userId=${user.id}&period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCheckInScores(d) })
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

  const filledCount = items.filter(it => scores[it.key]).length
  const myAvg = filledCount ? items.reduce((s, it) => s + (scores[it.key] || 0), 0) / items.length : null

  // Projects this user is involved in (as PIC or member) that overlap with
  // the selected KPI period — gives the evaluator quick context on what the
  // person actually worked on that month.
  const [periodYear, periodMonth] = period.split('-').map(Number)
  const periodStart = new Date(periodYear, periodMonth - 1, 1)
  const periodEnd = new Date(periodYear, periodMonth, 0, 23, 59, 59)
  const involvedProjects = (projects || []).filter(p => {
    const isInvolved = p.picId === user.id || p.members?.some(m => m.user?.id === user.id || m.userId === user.id)
    if (!isInvolved) return false
    const start = p.startDate ? new Date(p.startDate) : null
    const end = p.endDate ? new Date(p.endDate) : start
    if (!start) return false
    return start <= periodEnd && (end || start) >= periodStart
  })

  return (
    <div className="mb-2 rounded-lg bg-brand-50 border border-brand-100 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-brand-100/50 transition-colors">
        <div>
          <p className="text-sm font-semibold text-ink-800">{user.name}</p>
          <p className="text-xs text-gray-500">{user.jobTitle || user.role} · {period}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canScore && (
            <span className="text-xs text-gray-400">
              {session?.user.id === user.id ? 'Penilaian Diri' : 'Penilaian Atasan'}
            </span>
          )}
          {myAvg != null && <span className="text-sm font-bold text-brand-700">{myAvg.toFixed(1)}</span>}
          {saved && <span className="text-xs text-green-600">Tersimpan ✓</span>}
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
      <div className="px-3 pb-3">
      {involvedProjects.length > 0 && (
        <div className="mb-2 p-2.5 rounded-lg bg-white border border-brand-100">
          <p className="text-xs font-semibold text-gray-600 mb-1">Terlibat di project periode {period}:</p>
          <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
            {involvedProjects.map(p => (
              <li key={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}{p.picId === user.id ? ' (PIC)' : ''}</li>
            ))}
          </ul>
        </div>
      )}
      <KpiCriteriaEditor role={user.role} division={user.divisi} session={session} onChange={setItems} />
      {canScore && isPastDeadline && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2">
          ⚠ Sudah lewat tanggal {KPI_DEADLINE_DAY}. Pengisian KPI bulan ini tercatat terlambat dan akan mengurangi poin Anda sebagai penilai. Periode penilaian saat ini: {period}.
        </p>
      )}
      <div className="space-y-2">
        {items.map(it => {
          // Baris auto-scored (daily_checkin & evening_report) — tidak bisa diisi manual
          if (it.auto) {
            const isCheckin = it.key === 'daily_checkin'
            const autoData  = isCheckin ? checkInScores?.morning : checkInScores?.evening
            const pct       = autoData?.pct
            const kpiScore  = autoData?.kpiScore
            const onTime    = autoData?.onTime ?? 0
            const late      = autoData?.late ?? 0
            const missed    = autoData?.missed ?? 0
            const totalDays = checkInScores?.workDays ?? 0
            return (
              <div key={it.key} className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">AUTO</span>
                    <p className="text-xs text-gray-700">{it.label}</p>
                  </div>
                  {pct != null ? (
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-blue-700">{kpiScore}/5</span>
                      <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Belum ada data</span>
                  )}
                </div>
                {totalDays > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {onTime} tepat waktu · {late} terlambat · {missed} tidak hadir dari {totalDays} hari kerja
                  </p>
                )}
              </div>
            )
          }

          // Baris KPI manual biasa
          return (
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
          )
        })}
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
      )}
    </div>
  )
}
