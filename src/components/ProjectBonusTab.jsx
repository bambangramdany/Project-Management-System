'use client'
import { useEffect, useState } from 'react'
import { PROJECT_SCORE_CRITERIA, KPI_SCORE_LABEL } from '@/lib/constants'
import { canScoreProjectMember } from '@/lib/rbac'
import ScoreCriteriaEditor from '@/components/ScoreCriteriaEditor'

export default function ProjectBonusTab({ project, session }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)
  const [criteria, setCriteria] = useState(PROJECT_SCORE_CRITERIA)
  const [editing, setEditing] = useState({})
  const [confirming, setConfirming] = useState(null)
  const [saved, setSaved] = useState({})

  const members = [
    ...(project.pic ? [project.pic] : []),
    ...((project.members || []).map(m => m.user).filter(u => u && u.id !== project.pic?.id)),
  ].filter(u => canScoreProjectMember(session?.user, u, project))

  useEffect(() => {
    fetch(`/api/projects/${project.id}/scores`)
      .then(res => res.json())
      .then(data => {
        setScores(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  useEffect(() => {
    const d = {}
    const sv = {}
    members.forEach(m => {
      d[m.id] = {}
      let hasExisting = false
      criteria.forEach(c => {
        const existing = scores.find(s => s.userId === m.id && s.criteria === c.key && s.evaluatorId === session?.user?.id)
        if (existing) hasExisting = true
        d[m.id][c.key] = { score: existing?.score || 0, comment: existing?.comment || '' }
      })
      sv[m.id] = hasExisting
    })
    setDrafts(d)
    setSaved(sv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, criteria])

  if (loading) return <p className="text-sm text-gray-500">Memuat...</p>
  if (members.length === 0) return <p className="text-sm text-gray-500">Tidak ada anggota tim yang bisa Anda nilai pada project ini.</p>

  const handleSave = async (userId) => {
    setSaving(userId)
    const items = criteria.map(c => ({
      criteria: c.key,
      score: drafts[userId]?.[c.key]?.score || 0,
      comment: drafts[userId]?.[c.key]?.comment || '',
    }))
    await fetch(`/api/projects/${project.id}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, items }),
    })
    setSaving(null)
    setEditing(e => ({ ...e, [userId]: false }))
    setConfirming(null)
    setSaved(s => ({ ...s, [userId]: true }))
  }

  const isLocked = (userId) => saved[userId] && !editing[userId]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Berikan penilaian per anggota tim untuk project ini sebagai evaluasi tim.</p>
      <ScoreCriteriaEditor division={project.division} session={session} onChange={setCriteria} />
      {members.map(m => {
        const locked = isLocked(m.id)
        return (
          <div key={m.id} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink-800">{m.name}</p>
                <p className="text-xs text-gray-400">{m.jobTitle || m.role}</p>
              </div>
              {locked ? (
                <button
                  onClick={() => setEditing(e => ({ ...e, [m.id]: true }))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </button>
              ) : !editing[m.id] ? (
                <button
                  onClick={() => handleSave(m.id)}
                  disabled={saving === m.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving === m.id ? 'Menyimpan...' : 'Simpan'}
                </button>
              ) : null}
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {criteria.map(c => {
                const filled = (drafts[m.id]?.[c.key]?.score || 0) > 0
                return (
                  <div key={c.key}>
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <select
                      value={drafts[m.id]?.[c.key]?.score || 0}
                      disabled={locked}
                      onChange={e => setDrafts(d => ({ ...d, [m.id]: { ...d[m.id], [c.key]: { ...d[m.id]?.[c.key], score: Number(e.target.value) } } }))}
                      className={`w-full text-sm border rounded-lg px-2 py-1.5 ${locked ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' : filled ? 'border-green-200 bg-green-50' : 'border-amber-300 bg-amber-50'}`}
                    >
                      <option value={0}>- Pilih -</option>
                      {Object.entries(KPI_SCORE_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>{val} - {label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
            {locked && (
              <p className="text-xs text-green-600 flex items-center gap-1">✓ Penilaian tersimpan dan terkunci. Klik "Edit" untuk mengubah.</p>
            )}
            {editing[m.id] && !locked && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                {confirming === m.id ? (
                  <>
                    <span className="text-xs text-gray-500">Simpan perubahan penilaian?</span>
                    <button
                      onClick={() => handleSave(m.id)}
                      disabled={saving === m.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      {saving === m.id ? 'Menyimpan...' : 'Ya, Simpan'}
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(m.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Konfirmasi & Simpan
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
