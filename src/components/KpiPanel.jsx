'use client'
import { useEffect, useState } from 'react'
import { KPI_BY_ROLE, KPI_SCORE_LABEL, KPI_DEADLINE_DAY, KPI_GROUPS, MASUKAN_PREFIX, resolveKpiPeriod, getKpiByRole } from '@/lib/constants'
import { canScoreKpi as canScoreKpiClient } from '@/lib/rbac'
import KpiCriteriaEditor from '@/components/KpiCriteriaEditor'

export { canScoreKpiClient }

const GROUP_ORDER = ['individu', 'tim', 'leadership', 'role', 'auto']

const GROUP_COLORS = {
  individu:   { header: 'bg-blue-50 text-blue-700 border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  tim:        { header: 'bg-green-50 text-green-700 border-green-200', badge: 'bg-green-100 text-green-700' },
  leadership: { header: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  role:       { header: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  auto:       { header: 'bg-teal-50 text-teal-700 border-teal-200',   badge: 'bg-teal-100 text-teal-700' },
}

export default function KpiPanel({ user, session, defaultOpen = false, period: periodProp, projects }) {
  const [open, setOpen] = useState(defaultOpen)
  const [items, setItems] = useState(getKpiByRole(user.role))
  const period = periodProp || resolveKpiPeriod()
  const today = new Date()
  const isPastDeadline = today.getDate() > KPI_DEADLINE_DAY
  const [scores, setScores] = useState({})
  const [comments, setComments] = useState({})
  const [masukan, setMasukan] = useState({})     // group → text
  const [existing, setExisting] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checkInScores, setCheckInScores] = useState(null)
  const canScore = canScoreKpiClient(session?.user, user)

  useEffect(() => {
    fetch(`/api/kpi?userId=${user.id}&period=${period}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setExisting(list)
        const mine = list.filter(a => a.evaluatorId === session?.user?.id)
        const sc = {}, cm = {}, mk = {}
        mine.forEach(a => {
          if (a.kpiKey.startsWith(MASUKAN_PREFIX)) {
            mk[a.kpiKey.slice(MASUKAN_PREFIX.length)] = a.comment || ''
          } else {
            sc[a.kpiKey] = a.score
            cm[a.kpiKey] = a.comment || ''
          }
        })
        setScores(sc); setComments(cm); setMasukan(mk)
      })
  }, [user.id, period, session?.user?.id])

  useEffect(() => {
    fetch(`/api/daily-checkin/scores?userId=${user.id}&period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCheckInScores(d) })
  }, [user.id, period])

  async function save() {
    setSaving(true); setSaved(false)
    const scoreItems = items
      .filter(it => !it.auto)
      .map(it => ({ kpiKey: it.key, score: scores[it.key] || 3, comment: comments[it.key] || '' }))

    // Add masukan as special records
    const masukanItems = Object.entries(masukan)
      .filter(([, text]) => text.trim())
      .map(([group, text]) => ({ kpiKey: `${MASUKAN_PREFIX}${group}`, score: 3, comment: text }))

    const res = await fetch('/api/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, period, items: [...scoreItems, ...masukanItems] }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      fetch(`/api/kpi?userId=${user.id}&period=${period}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setExisting(Array.isArray(data) ? data : []))
    }
  }

  // Average per key across all evaluators (for reference display)
  const avgByKey = {}
  items.forEach(it => {
    const vals = existing.filter(a => a.kpiKey === it.key && !a.kpiKey.startsWith(MASUKAN_PREFIX))
    avgByKey[it.key] = vals.length ? (vals.reduce((s, a) => s + a.score, 0) / vals.length) : null
  })

  const scoredItems = items.filter(it => !it.auto && !it.key.startsWith(MASUKAN_PREFIX))
  const filledCount = scoredItems.filter(it => scores[it.key]).length
  const myAvg = filledCount
    ? scoredItems.reduce((s, it) => s + (scores[it.key] || 0), 0) / scoredItems.length
    : null

  // Projects in this period
  const [periodYear, periodMonth] = period.split('-').map(Number)
  const periodStart = new Date(periodYear, periodMonth - 1, 1)
  const periodEnd   = new Date(periodYear, periodMonth, 0, 23, 59, 59)
  const involvedProjects = (projects || []).filter(p => {
    const isInvolved = p.picId === user.id || p.members?.some(m => m.user?.id === user.id || m.userId === user.id)
    if (!isInvolved) return false
    const start = p.startDate ? new Date(p.startDate) : null
    const end = p.endDate ? new Date(p.endDate) : start
    if (!start) return false
    return start <= periodEnd && (end || start) >= periodStart
  })

  // Group items by group property
  const grouped = {}
  items.forEach(it => {
    const g = it.group || 'role'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(it)
  })

  return (
    <div className="mb-2 rounded-lg bg-brand-50 border border-brand-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-brand-100/50 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-ink-800">{user.name}</p>
          <p className="text-xs text-gray-500">{user.jobTitle || user.role} · {period}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canScore && (
            <span className="text-xs text-gray-400">
              {session?.user?.id === user.id ? 'Penilaian Diri' : 'Penilaian Atasan'}
            </span>
          )}
          {myAvg != null && <span className="text-sm font-bold text-brand-700">{myAvg.toFixed(1)}</span>}
          {saved && <span className="text-xs text-green-600">Tersimpan ✓</span>}
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <KpiCriteriaEditor role={user.role} division={user.divisi} session={session} onChange={setItems} />

          {involvedProjects.length > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-white border border-brand-100">
              <p className="text-xs font-semibold text-gray-600 mb-1">Project terlibat di periode {period}:</p>
              <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                {involvedProjects.map(p => (
                  <li key={p.id}>{p.code ? `${p.code} — ` : ''}{p.name}{p.picId === user.id ? ' (PIC)' : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {canScore && isPastDeadline && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-3">
              ⚠ Sudah lewat tanggal {KPI_DEADLINE_DAY}. Penilaian ini tercatat terlambat.
            </p>
          )}

          <div className="space-y-4">
            {GROUP_ORDER.filter(g => grouped[g]).map(groupKey => {
              const groupItems = grouped[groupKey]
              const meta = KPI_GROUPS[groupKey]
              const colors = GROUP_COLORS[groupKey] || GROUP_COLORS.role
              const hasMasukanField = meta?.masukanKey && groupKey !== 'auto'

              return (
                <div key={groupKey}>
                  {/* Group header */}
                  <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border mb-2 ${colors.header}`}>
                    <span className="text-xs font-bold tracking-wide uppercase">{meta?.label || groupKey}</span>
                  </div>

                  <div className="space-y-2">
                    {groupItems.map(it => {
                      if (it.auto) {
                        const isCheckin = it.key === 'daily_checkin'
                        const autoData = isCheckin ? checkInScores?.morning : checkInScores?.evening
                        const pct = autoData?.pct
                        const kpiScore = autoData?.kpiScore
                        const onTime = autoData?.onTime ?? 0
                        const late = autoData?.late ?? 0
                        const missed = autoData?.missed ?? 0
                        const totalDays = checkInScores?.workDays ?? 0
                        return (
                          <div key={it.key} className="bg-teal-50 rounded-lg p-2.5 border border-teal-100">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 shrink-0">AUTO</span>
                                <p className="text-xs text-gray-700">{it.label}</p>
                              </div>
                              {pct != null ? (
                                <div className="text-right shrink-0">
                                  <span className="text-sm font-bold text-teal-700">{kpiScore}/5</span>
                                  <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Belum ada data</span>
                              )}
                            </div>
                            {totalDays > 0 && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {onTime} tepat · {late} terlambat · {missed} tidak hadir dari {totalDays} hari kerja
                              </p>
                            )}
                          </div>
                        )
                      }

                      return (
                        <div key={it.key} className="bg-white rounded-lg p-2.5 border border-gray-100">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-gray-700 flex-1 leading-relaxed">{it.label}</p>
                            {avgByKey[it.key] != null && (
                              <span className="text-xs font-semibold text-brand-700 shrink-0">
                                Rata: {avgByKey[it.key].toFixed(1)}
                              </span>
                            )}
                          </div>
                          {canScore && (
                            <div className="flex items-center gap-2 mt-2">
                              <select
                                className="select w-auto text-xs py-1"
                                value={scores[it.key] || 3}
                                onChange={e => setScores(s => ({ ...s, [it.key]: parseInt(e.target.value) }))}
                              >
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={n}>{n} — {KPI_SCORE_LABEL[n]}</option>
                                ))}
                              </select>
                              <input
                                className="input text-xs py-1 flex-1"
                                placeholder="Catatan singkat (opsional)"
                                value={comments[it.key] || ''}
                                onChange={e => setComments(c => ({ ...c, [it.key]: e.target.value }))}
                              />
                            </div>
                          )}
                          {!canScore && avgByKey[it.key] != null && (
                            <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-400 rounded-full"
                                style={{ width: `${(avgByKey[it.key] / 5) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Masukan textarea at end of each scored group */}
                  {hasMasukanField && canScore && (
                    <div className="mt-2">
                      <textarea
                        rows={2}
                        className="input text-xs w-full resize-none"
                        placeholder={`Masukan & catatan untuk dimensi ${meta.label.toLowerCase()} (opsional)`}
                        value={masukan[groupKey] || ''}
                        onChange={e => setMasukan(m => ({ ...m, [groupKey]: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Show existing masukan from supervisor to non-scorer */}
                  {hasMasukanField && !canScore && (() => {
                    const masukanFromOthers = existing.filter(
                      a => a.kpiKey === `${MASUKAN_PREFIX}${groupKey}` && a.evaluatorId !== user.id && a.comment
                    )
                    if (!masukanFromOthers.length) return null
                    return (
                      <div className="mt-2 space-y-1">
                        {masukanFromOthers.map(a => (
                          <div key={a.id} className={`text-xs rounded-lg px-2.5 py-2 border ${colors.header}`}>
                            <span className="font-semibold">{a.evaluator?.name}: </span>{a.comment}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {canScore && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-brand-100">
              <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                {saving ? 'Menyimpan...' : 'Simpan Penilaian'}
              </button>
              {saved && <span className="text-xs text-green-600">✓ Tersimpan</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
