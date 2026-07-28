'use client'
import { useState } from 'react'
import { generateEvaluation, scoreLevel } from '@/lib/kpiRecommendations'
import { getKpiByRole, MASUKAN_PREFIX } from '@/lib/constants'

const LEVEL_STYLE = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  yellow:  'bg-amber-50 text-amber-700 border-amber-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-200',
  red:     'bg-red-50 text-red-700 border-red-200',
}

const GAP_ICON = {
  overrate:       { icon: '⚠️', color: 'text-orange-600 bg-orange-50' },
  'slight-overrate': { icon: '↑',  color: 'text-amber-600 bg-amber-50' },
  underrate:      { icon: '💡', color: 'text-blue-600 bg-blue-50' },
  'slight-underrate': { icon: '↗', color: 'text-teal-600 bg-teal-50' },
  aligned:        { icon: '✓',  color: 'text-green-600 bg-green-50' },
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>
  const lv = scoreLevel(score)
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${LEVEL_STYLE[lv.color]}`}>
      {score.toFixed(1)} · {lv.label}
    </span>
  )
}

function Section({ title, color = 'gray', children }) {
  return (
    <div className={`rounded-xl border overflow-hidden border-${color}-100`}>
      <div className={`px-3 py-2 bg-${color}-50 border-b border-${color}-100`}>
        <p className={`text-xs font-bold text-${color}-700 uppercase tracking-wide`}>{title}</p>
      </div>
      <div className="px-3 py-3">{children}</div>
    </div>
  )
}

export default function KpiEvaluationCard({ user, assessments, canEdit = false, session }) {
  const [supervisorNote, setSupervisorNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAll, setShowAll] = useState(false)

  if (!assessments || assessments.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Belum ada data penilaian untuk menghasilkan evaluasi.
      </div>
    )
  }

  const kpiDefs = getKpiByRole(user.role).filter(it => !it.auto && !it.key.startsWith(MASUKAN_PREFIX))

  // Build score maps
  const selfMap = {}, supSum = {}, supCnt = {}
  assessments.forEach(a => {
    if (a.kpiKey.startsWith(MASUKAN_PREFIX)) return
    if (a.evaluatorId === a.userId) {
      selfMap[a.kpiKey] = a.score
    } else {
      supSum[a.kpiKey] = (supSum[a.kpiKey] || 0) + a.score
      supCnt[a.kpiKey] = (supCnt[a.kpiKey] || 0) + 1
    }
  })
  const supMap = {}
  Object.keys(supSum).forEach(k => { supMap[k] = supSum[k] / supCnt[k] })

  // Get existing supervisor eval note
  const existingNote = assessments.find(a =>
    a.kpiKey === '_eval_note' && a.evaluatorId !== a.userId
  )
  const noteText = existingNote?.comment || ''
  const [editNote, setEditNote] = useState(noteText)

  if (!Object.keys(supMap).length) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Belum ada penilaian dari atasan untuk periode ini.
      </div>
    )
  }

  const eval_ = generateEvaluation({ user, selfMap, supMap, kpiDefs })
  const { overallLevel, supAvg, selfAvg, roleProfile, divisiContext, nextLevel,
          strengths, priorityAreas, developAreas, criteriaAnalysis, hasSelf } = eval_

  async function saveNote() {
    if (!editNote.trim() || !session) return
    setSaving(true)
    const period = assessments[0]?.period
    await fetch('/api/kpi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        period,
        items: [{ kpiKey: '_eval_note', score: 3, comment: editNote.trim() }],
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const levelStyle = LEVEL_STYLE[overallLevel?.color] || 'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-gray-700">📋 Evaluasi & Rekomendasi Pengembangan</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${levelStyle}`}>
          {overallLevel?.label ?? '—'}
        </span>
        {supAvg != null && (
          <span className="text-xs text-gray-400">
            Rata-rata atasan: <strong className="text-gray-700">{supAvg.toFixed(2)}</strong>
            {hasSelf && selfAvg != null && <> · Self: <strong className="text-gray-700">{selfAvg.toFixed(2)}</strong></>}
          </span>
        )}
      </div>

      {/* Role & divisi profile */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-3 space-y-1.5">
        <p className="text-xs text-indigo-800 leading-relaxed">{roleProfile}</p>
        {divisiContext && <p className="text-xs text-indigo-600 leading-relaxed">{divisiContext}</p>}
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <Section title="✅ Kekuatan yang Perlu Dipertahankan" color="emerald">
          <div className="space-y-2">
            {strengths.map(c => (
              <div key={c.key} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5 shrink-0">◆</span>
                <div>
                  <p className="text-xs font-semibold text-gray-800">{c.label}
                    <span className="ml-2 font-normal text-gray-400">({c.supScore?.toFixed(1)})</span>
                  </p>
                  {c.actions[0] && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{c.actions[0]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Priority development areas */}
      {priorityAreas.length > 0 && (
        <Section title="🎯 Area Prioritas Pengembangan" color="red">
          <div className="space-y-4">
            {priorityAreas.map(c => {
              const gi = c.gapInsight
              const giStyle = gi ? GAP_ICON[gi.type] : null
              return (
                <div key={c.key} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-800">{c.label}</p>
                    <ScoreBadge score={c.supScore} />
                  </div>
                  <p className="text-[11px] text-gray-500 italic">{c.issue}</p>

                  {/* Gap insight */}
                  {gi && gi.type !== 'aligned' && (
                    <div className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px] ${giStyle.color}`}>
                      <span className="shrink-0">{giStyle.icon}</span>
                      <div>
                        <p>{gi.note}</p>
                        {gi.action && <p className="font-semibold mt-0.5">{gi.action}</p>}
                      </div>
                    </div>
                  )}

                  {/* Action items */}
                  <ul className="space-y-1">
                    {c.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                        <span className="text-red-300 shrink-0 mt-0.5">›</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Development areas (mid) */}
      {developAreas.length > 0 && (
        <Section title="📈 Area Pengembangan Lanjutan" color="amber">
          <div className="space-y-3">
            {developAreas.map(c => (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                  <ScoreBadge score={c.supScore} />
                </div>
                <ul className="space-y-0.5">
                  {c.actions.slice(0, 2).map((act, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                      <span className="text-amber-300 shrink-0 mt-0.5">›</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Detail semua kriteria — toggle */}
      {criteriaAnalysis.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            {showAll ? '▲ Sembunyikan detail semua kriteria' : '▼ Lihat detail semua kriteria'}
          </button>
          {showAll && (
            <div className="mt-3 space-y-3">
              {criteriaAnalysis.map(c => (
                <div key={c.key} className={`rounded-lg border px-3 py-2.5 space-y-1 ${c.isHighPriority ? 'border-red-100 bg-red-50/30' : 'border-gray-100 bg-gray-50/30'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                    <ScoreBadge score={c.supScore} />
                    {c.selfScore != null && <span className="text-[10px] text-gray-400">Self: {c.selfScore.toFixed(1)}</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 italic">{c.issue}</p>
                  <ul className="space-y-0.5">
                    {c.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                        <span className="text-gray-300 shrink-0">›</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Next level */}
      {nextLevel && (
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5">
          <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide mb-1">🚀 Arah Pengembangan Berikutnya</p>
          <p className="text-xs text-brand-800">{nextLevel}</p>
        </div>
      )}

      {/* Supervisor note */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">💬 Catatan Atasan</p>
        </div>
        <div className="px-3 py-3">
          {canEdit ? (
            <div className="space-y-2">
              <textarea
                rows={3}
                placeholder="Tambahkan catatan evaluasi, feedback khusus, atau rekomendasi spesifik untuk anggota tim ini..."
                className="input text-xs w-full resize-none"
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
              />
              <button
                onClick={saveNote}
                disabled={saving || !editNote.trim()}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : saved ? '✓ Tersimpan' : 'Simpan Catatan'}
              </button>
            </div>
          ) : noteText ? (
            <p className="text-xs text-gray-700 leading-relaxed">{noteText}</p>
          ) : (
            <p className="text-xs text-gray-400 italic">Belum ada catatan dari atasan.</p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Rekomendasi dihasilkan berdasarkan skor penilaian aktual · Framework: 70-20-10, Situational Leadership, IDP
      </p>
    </div>
  )
}
