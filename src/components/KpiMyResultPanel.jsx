'use client'
import { useEffect, useState } from 'react'
import { getKpiByRole, KPI_GROUPS, KPI_SCORE_LABEL, MASUKAN_PREFIX, resolveKpiPeriod } from '@/lib/constants'

const GROUP_ORDER = ['individu', 'tim', 'leadership', 'role']

const SCORE_COLOR = {
  5: 'text-emerald-700 bg-emerald-50',
  4: 'text-blue-700 bg-blue-50',
  3: 'text-gray-600 bg-gray-100',
  2: 'text-amber-700 bg-amber-50',
  1: 'text-red-700 bg-red-50',
}

function GapBadge({ gap }) {
  if (gap == null) return <span className="text-xs text-gray-300">—</span>
  if (gap > 1)  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Self +{gap}</span>
  if (gap < -1) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Sup +{Math.abs(gap)}</span>
  if (gap > 0)  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">↑{gap}</span>
  if (gap < 0)  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">↓{Math.abs(gap)}</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">Selaras</span>
}

function ScorePill({ score, label }) {
  const color = SCORE_COLOR[score] || 'text-gray-500 bg-gray-50'
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${color}`}>
      <span className="text-sm font-bold">{score ?? '—'}</span>
      {label && <span className="text-[10px] hidden sm:inline">{label}</span>}
    </div>
  )
}

function priorityFromGaps(selfData, supData, kpiDefs) {
  let maxAbsGap = 0
  kpiDefs.forEach(def => {
    const s = selfData[def.key]
    const v = supData[def.key]
    if (s != null && v != null) maxAbsGap = Math.max(maxAbsGap, Math.abs(s - v))
  })
  if (maxAbsGap >= 2) return { level: 'Tinggi', color: 'text-red-600 bg-red-50 border-red-200' }
  if (maxAbsGap >= 1) return { level: 'Sedang', color: 'text-amber-600 bg-amber-50 border-amber-200' }
  return { level: 'Rendah', color: 'text-green-600 bg-green-50 border-green-200' }
}

export default function KpiMyResultPanel({ session, period: periodProp }) {
  const period = periodProp || resolveKpiPeriod()
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    setLoading(true)
    fetch(`/api/kpi?userId=${session.user.id}&period=${period}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setAssessments(Array.isArray(data) ? data : []); setLoading(false) })
  }, [session?.user?.id, period])

  if (loading) return <p className="text-sm text-gray-400 text-center py-6">Memuat...</p>
  if (!assessments.length) return (
    <div className="text-center py-8 text-gray-400 space-y-1">
      <p className="text-2xl">📊</p>
      <p className="text-sm font-medium">Belum ada penilaian untuk periode ini</p>
      <p className="text-xs">Isi self-assessment di tab "Nilai Tim" dan tunggu supervisor mengisi penilaian mereka.</p>
    </div>
  )

  const kpiDefs = getKpiByRole(session.user.role).filter(it => !it.auto && !it.key.startsWith(MASUKAN_PREFIX))

  // Split by evaluator: self vs supervisors
  const selfRecords = assessments.filter(a => a.evaluatorId === session.user.id)
  const supRecords  = assessments.filter(a => a.evaluatorId !== session.user.id && !a.kpiKey.startsWith(MASUKAN_PREFIX))
  const masukanRecords = assessments.filter(a => a.kpiKey.startsWith(MASUKAN_PREFIX) && a.evaluatorId !== session.user.id)

  // Build score maps: key → score
  const selfMap = {}
  selfRecords.forEach(a => { if (!a.kpiKey.startsWith(MASUKAN_PREFIX)) selfMap[a.kpiKey] = a.score })

  // Average supervisor scores per key
  const supSum = {}, supCnt = {}
  supRecords.forEach(a => {
    supSum[a.kpiKey] = (supSum[a.kpiKey] || 0) + a.score
    supCnt[a.kpiKey] = (supCnt[a.kpiKey] || 0) + 1
  })
  const supMap = {}
  Object.keys(supSum).forEach(k => { supMap[k] = supSum[k] / supCnt[k] })

  const hasSelf = selfRecords.some(a => !a.kpiKey.startsWith(MASUKAN_PREFIX))
  const hasSup  = supRecords.length > 0

  const priority = priorityFromGaps(selfMap, supMap, kpiDefs)

  // Group defs
  const grouped = {}
  kpiDefs.forEach(it => {
    const g = it.group || 'role'
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(it)
  })

  const supervisorNames = [...new Set(supRecords.map(a => a.evaluator?.name).filter(Boolean))]

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${priority.color}`}>
          Prioritas {priority.level}
        </div>
        {hasSup && (
          <div className="text-xs text-gray-500">
            Dinilai oleh: <span className="font-medium text-gray-700">{supervisorNames.join(', ')}</span>
          </div>
        )}
        {!hasSelf && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
            ⚠ Belum isi self-assessment
          </div>
        )}
        {!hasSup && (
          <div className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
            Menunggu penilaian atasan
          </div>
        )}
      </div>

      {/* Legend */}
      {hasSelf && hasSup && (
        <div className="flex gap-4 text-[10px] text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-100 inline-block" />Self</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-100 inline-block" />Atasan</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 inline-block" />Gap tinggi (≥2)</span>
          <span>Gap = Skor self − skor atasan</span>
        </div>
      )}

      {/* Per-group breakdown */}
      {GROUP_ORDER.filter(g => grouped[g]).map(groupKey => {
        const meta = KPI_GROUPS[groupKey]
        const groupDefs = grouped[groupKey]
        const masukanKey = `${MASUKAN_PREFIX}${groupKey}`
        const masukanList = masukanRecords.filter(a => a.kpiKey === masukanKey && a.comment)

        return (
          <div key={groupKey} className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{meta?.label || groupKey}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {groupDefs.map(def => {
                const selfScore = selfMap[def.key]
                const supScore  = supMap[def.key]
                const gap = (selfScore != null && supScore != null) ? Math.round(selfScore - supScore) : null
                const isHighGap = gap != null && Math.abs(gap) >= 2

                return (
                  <div key={def.key} className={`px-3 py-2.5 ${isHighGap ? 'bg-red-50/30' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-700 flex-1 leading-relaxed">{def.label}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasSelf && <ScorePill score={selfScore} />}
                        {hasSup  && <ScorePill score={supScore != null ? Math.round(supScore * 10) / 10 : null} />}
                        {hasSelf && hasSup && <GapBadge gap={gap} />}
                      </div>
                    </div>

                    {/* Comments from supervisor */}
                    {(() => {
                      const supComments = supRecords.filter(a => a.kpiKey === def.key && a.comment)
                      if (!supComments.length) return null
                      return (
                        <div className="mt-1.5 space-y-1">
                          {supComments.map(a => (
                            <p key={a.id} className="text-[10px] text-gray-500 pl-2 border-l-2 border-gray-200">
                              {a.evaluator?.name}: {a.comment}
                            </p>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>

            {/* Group masukan from supervisor */}
            {masukanList.length > 0 && (
              <div className="px-3 py-2.5 bg-brand-50 border-t border-brand-100">
                <p className="text-[10px] font-semibold text-brand-700 mb-1">💬 Masukan Atasan</p>
                {masukanList.map(a => (
                  <p key={a.id} className="text-xs text-gray-700">
                    {a.evaluator?.name && <span className="font-medium">{a.evaluator.name}: </span>}
                    {a.comment}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Self masukan */}
      {(() => {
        const selfMasukan = selfRecords.filter(a => a.kpiKey.startsWith(MASUKAN_PREFIX) && a.comment)
        if (!selfMasukan.length) return null
        return (
          <div className="border border-brand-100 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-brand-50 border-b border-brand-100">
              <p className="text-xs font-bold text-brand-700">Catatan dari Kamu (Self-Assessment)</p>
            </div>
            <div className="px-3 py-2.5 space-y-1.5">
              {selfMasukan.map(a => (
                <p key={a.id} className="text-xs text-gray-700">
                  <span className="text-[10px] text-gray-400 font-medium uppercase mr-1.5">
                    {a.kpiKey.replace(MASUKAN_PREFIX, '')}:
                  </span>
                  {a.comment}
                </p>
              ))}
            </div>
          </div>
        )
      })()}

      <p className="text-[10px] text-gray-400 text-center pt-1">
        Periode {period} · Self = penilaian diri sendiri · Atasan = rata-rata penilaian dari supervisor
      </p>
    </div>
  )
}
