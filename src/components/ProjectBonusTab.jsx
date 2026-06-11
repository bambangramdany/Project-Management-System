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
    members.forEach(m => {
      d[m.id] = {}
      criteria.forEach(c => {
        const existing = scores.find(s => s.userId === m.id && s.criteria === c.key && s.evaluatorId === session?.user?.id)
        d[m.id][c.key] = { score: existing?.score || 0, comment: existing?.comment || '' }
      })
    })
    setDrafts(d)
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
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Berikan penilaian per anggota tim untuk project ini sebagai evaluasi tim.</p>
      <ScoreCriteriaEditor division={project.division} session={session} onChange={setCriteria} />
      {members.map(m => (
        <div key={m.id} className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink-800">{m.name}</p>
              <p className="text-xs text-gray-400">{m.jobTitle || m.role}</p>
            </div>
            <button
              onClick={() => handleSave(m.id)}
              disabled={saving === m.id}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving === m.id ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {criteria.map(c => (
              <div key={c.key}>
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <select
                  value={drafts[m.id]?.[c.key]?.score || 0}
                  onChange={e => setDrafts(d => ({ ...d, [m.id]: { ...d[m.id], [c.key]: { ...d[m.id]?.[c.key], score: Number(e.target.value) } } }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <option value={0}>- Pilih -</option>
                  {Object.entries(KPI_SCORE_LABEL).map(([val, label]) => (
                    <option key={val} value={val}>{val} - {label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
