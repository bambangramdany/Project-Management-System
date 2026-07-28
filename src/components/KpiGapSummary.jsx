'use client'
import { useEffect, useState } from 'react'
import { getKpiByRole, MASUKAN_PREFIX, resolveKpiPeriod } from '@/lib/constants'
import KpiEvaluationCard from '@/components/KpiEvaluationCard'

function calcPriority(selfMap, supMap, kpiDefs) {
  const gaps = []
  let maxAbs = 0
  kpiDefs.forEach(def => {
    const s = selfMap[def.key]
    const v = supMap[def.key]
    if (s != null && v != null) {
      const g = s - v
      gaps.push({ key: def.key, label: def.label, gap: g })
      maxAbs = Math.max(maxAbs, Math.abs(g))
    }
  })
  if (maxAbs >= 2) return { level: 'Tinggi', emoji: '🔴', color: 'border-l-red-400 bg-red-50' }
  if (maxAbs >= 1) return { level: 'Sedang', emoji: '🟡', color: 'border-l-amber-400 bg-amber-50' }
  return { level: 'Rendah', emoji: '🟢', color: 'border-l-green-400 bg-green-50' }
}

export default function KpiGapSummary({ session, period: periodProp }) {
  const period = periodProp || resolveKpiPeriod()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'high' | 'med' | 'low'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/kpi?period=${period}`)
      .then(r => r.ok ? r.json() : [])
      .then(records => {
        if (!Array.isArray(records)) { setData([]); setLoading(false); return }

        // Group by userId
        const byUser = {}
        records.forEach(a => {
          if (a.kpiKey.startsWith(MASUKAN_PREFIX)) return
          if (['OWNER', 'DIRECTOR'].includes(a.user?.role)) return
          if (!byUser[a.userId]) byUser[a.userId] = { user: a.user, self: {}, sup: {}, supNames: new Set(), masukan: {}, rawRecords: [] }
          byUser[a.userId].rawRecords.push(a)
          if (a.evaluatorId === a.userId) {
            byUser[a.userId].self[a.kpiKey] = a.score
          } else {
            if (!byUser[a.userId].sup[a.kpiKey]) byUser[a.userId].sup[a.kpiKey] = []
            byUser[a.userId].sup[a.kpiKey].push(a.score)
            if (a.evaluator?.name) byUser[a.userId].supNames.add(a.evaluator.name)
          }
        })

        // Also collect masukan
        records.filter(a => a.kpiKey.startsWith(MASUKAN_PREFIX) && a.evaluatorId !== a.userId).forEach(a => {
          if (!byUser[a.userId]) return
          const group = a.kpiKey.replace(MASUKAN_PREFIX, '')
          if (!byUser[a.userId].masukan[group]) byUser[a.userId].masukan[group] = []
          if (a.comment) byUser[a.userId].masukan[group].push({ evaluator: a.evaluator?.name, text: a.comment })
        })

        const result = Object.values(byUser).map(({ user, self, sup, supNames, masukan }) => {
          const kpiDefs = getKpiByRole(user.role).filter(it => !it.auto && !it.key.startsWith(MASUKAN_PREFIX))
          const supAvg = {}
          Object.entries(sup).forEach(([k, vals]) => { supAvg[k] = vals.reduce((a, b) => a + b, 0) / vals.length })
          const priority = calcPriority(self, supAvg, kpiDefs)

          // Per-criterion gaps
          const criteriaGaps = kpiDefs.map(def => {
            const s = self[def.key]
            const v = supAvg[def.key]
            return { key: def.key, label: def.label, group: def.group, selfScore: s, supScore: v, gap: s != null && v != null ? s - v : null }
          })

          const selfOverall = Object.values(self).length
            ? Object.values(self).reduce((a, b) => a + b, 0) / Object.values(self).length
            : null
          const supOverallValues = Object.values(supAvg)
          const supOverall = supOverallValues.length
            ? supOverallValues.reduce((a, b) => a + b, 0) / supOverallValues.length
            : null

          return { user, priority, criteriaGaps, selfOverall, supOverall, supNames: [...supNames], masukan, rawRecords: byUser[user.id]?.rawRecords || [], hasSelf: Object.keys(self).length > 0, hasSup: Object.keys(supAvg).length > 0 }
        })

        result.sort((a, b) => {
          const order = { 'Tinggi': 0, 'Sedang': 1, 'Rendah': 2 }
          return (order[a.priority.level] ?? 9) - (order[b.priority.level] ?? 9) || a.user.name.localeCompare(b.user.name)
        })

        setData(result); setLoading(false)
      })
  }, [period])

  const filtered = data.filter(d => {
    if (filter === 'high') return d.priority.level === 'Tinggi'
    if (filter === 'med')  return d.priority.level === 'Sedang'
    if (filter === 'low')  return d.priority.level === 'Rendah'
    return true
  })

  const counts = {
    high: data.filter(d => d.priority.level === 'Tinggi').length,
    med:  data.filter(d => d.priority.level === 'Sedang').length,
    low:  data.filter(d => d.priority.level === 'Rendah').length,
  }

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'high', emoji: '🔴', label: 'Prioritas Tinggi', count: counts.high, color: 'border-red-200 bg-red-50 text-red-700' },
            { key: 'med',  emoji: '🟡', label: 'Prioritas Sedang', count: counts.med,  color: 'border-amber-200 bg-amber-50 text-amber-700' },
            { key: 'low',  emoji: '🟢', label: 'Prioritas Rendah', count: counts.low,  color: 'border-green-200 bg-green-50 text-green-700' },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(filter === c.key ? 'all' : c.key)}
              className={`border rounded-lg p-2.5 text-left transition-all ${c.color} ${filter === c.key ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}
            >
              <p className="text-lg font-bold">{c.count}</p>
              <p className="text-[10px] font-medium">{c.label}</p>
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 text-center py-8">Memuat analisis gap...</p>}
      {!loading && data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Belum ada penilaian KPI untuk periode {period}</p>
      )}

      <div className="space-y-2">
        {filtered.map(({ user, priority, criteriaGaps, selfOverall, supOverall, supNames, masukan, rawRecords, hasSelf, hasSup }) => {
          const isOpen = expanded === user.id
          const gapOverall = selfOverall != null && supOverall != null ? selfOverall - supOverall : null

          return (
            <div key={user.id} className={`border-l-4 rounded-r-lg border border-gray-100 overflow-hidden ${priority.color}`}>
              <button
                onClick={() => setExpanded(isOpen ? null : user.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/50 transition-colors"
              >
                <span className="text-base">{priority.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.jobTitle || user.role} · {user.divisi}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {hasSelf && (
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Self</p>
                      <p className="text-sm font-bold text-gray-700">{selfOverall?.toFixed(1) ?? '—'}</p>
                    </div>
                  )}
                  {hasSup && (
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Atasan</p>
                      <p className="text-sm font-bold text-gray-700">{supOverall?.toFixed(1) ?? '—'}</p>
                    </div>
                  )}
                  {gapOverall != null && (
                    <div className={`text-xs font-bold px-2 py-0.5 rounded ${Math.abs(gapOverall) >= 1.5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {gapOverall > 0 ? '+' : ''}{gapOverall.toFixed(1)}
                    </div>
                  )}
                  {!hasSelf && <span className="text-[10px] text-gray-400">Belum self-assess</span>}
                  {!hasSup  && <span className="text-[10px] text-gray-400">Belum dinilai</span>}
                  <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 bg-white border-t border-gray-100 space-y-3">
                  {supNames.length > 0 && (
                    <p className="text-xs text-gray-500 pt-2">
                      Dinilai oleh: <span className="font-medium">{supNames.join(', ')}</span>
                    </p>
                  )}

                  {/* Criteria gap table */}
                  <div className="space-y-1.5">
                    {criteriaGaps.filter(c => c.selfScore != null || c.supScore != null).map(c => {
                      const absGap = c.gap != null ? Math.abs(c.gap) : 0
                      const isHigh = absGap >= 2
                      return (
                        <div key={c.key} className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${isHigh ? 'bg-red-50' : 'bg-gray-50'}`}>
                          <span className="text-gray-600 flex-1 leading-relaxed">{c.label}</span>
                          <div className="flex items-center gap-2 shrink-0 font-variant-numeric tabular-nums">
                            <span className={`w-6 text-center font-bold ${c.selfScore != null ? 'text-gray-700' : 'text-gray-300'}`}>
                              {c.selfScore ?? '—'}
                            </span>
                            <span className="text-gray-300">/</span>
                            <span className={`w-6 text-center font-bold ${c.supScore != null ? 'text-brand-700' : 'text-gray-300'}`}>
                              {c.supScore != null ? (Math.round(c.supScore * 10) / 10) : '—'}
                            </span>
                            {c.gap != null && (
                              <span className={`w-12 text-center font-bold ${isHigh ? 'text-red-600' : Math.abs(c.gap) >= 1 ? 'text-amber-600' : 'text-gray-400'}`}>
                                {c.gap > 0 ? '+' : ''}{c.gap}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Masukan per group */}
                  {Object.entries(masukan).some(([, list]) => list.length) && (
                    <div className="space-y-2 pt-1 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Masukan Atasan</p>
                      {Object.entries(masukan).map(([group, list]) => {
                        if (!list.length) return null
                        return (
                          <div key={group}>
                            <p className="text-[10px] text-gray-400 uppercase mb-0.5">{group}</p>
                            {list.map((m, i) => (
                              <p key={i} className="text-xs text-gray-700 bg-brand-50 border border-brand-100 rounded px-2 py-1.5">
                                {m.evaluator && <span className="font-medium">{m.evaluator}: </span>}{m.text}
                              </p>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="text-[10px] text-gray-400 pt-1">
                    Self = self-assessment · Atasan = rata-rata penilaian supervisor · Gap = Self − Atasan
                  </div>

                  {/* Evaluation & recommendations card */}
                  <div className="pt-3 border-t border-gray-100">
                    <KpiEvaluationCard
                      user={user}
                      assessments={rawRecords}
                      canEdit={true}
                      session={session}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
