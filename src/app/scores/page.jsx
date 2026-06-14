'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PROJECT_SCORE_CRITERIA, KPI_BY_ROLE, resolveKpiPeriod } from '@/lib/constants'
import ProjectBonusTab from '@/components/ProjectBonusTab'
import KpiCriteriaEditor from '@/components/KpiCriteriaEditor'
import KpiPanel, { canScoreKpiClient } from '@/components/KpiPanel'

const KPI_SUMMARY_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE']

function fmt(v) {
  return v == null ? '-' : v.toFixed(1)
}

export default function ScoresPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allNotes, setAllNotes] = useState(null)
  const [directors, setDirectors] = useState([])
  const [noteForm, setNoteForm] = useState({ directorId: '', message: '' })
  const [noteSent, setNoteSent] = useState(false)
  const [myProjects, setMyProjects] = useState([])
  const [scoreProjectId, setScoreProjectId] = useState('')
  const [scoreProject, setScoreProject] = useState(null)
  const [myKpi, setMyKpi] = useState([])
  const [kpiPeriod, setKpiPeriod] = useState(resolveKpiPeriod())
  const [kpiAssessments, setKpiAssessments] = useState([])
  const [kpiLoading, setKpiLoading] = useState(true)
  const [kpiExpanded, setKpiExpanded] = useState(null)
  const [kpiCriteriaMap, setKpiCriteriaMap] = useState({})
  const [team, setTeam] = useState([])
  const [teamKpiPeriod, setTeamKpiPeriod] = useState(resolveKpiPeriod())
  const [allProjects, setAllProjects] = useState([])
  const [reminding, setReminding] = useState(false)
  const [reminded, setReminded] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/scores/summary').then(r => r.json()).then(d => { setData(d); setLoading(false) })
    fetch('/api/team').then(r => r.json()).then(members => {
      const list = Array.isArray(members) ? members : []
      setDirectors(list.filter(m => ['DIRECTOR', 'OWNER'].includes(m.role) && m.id !== session.user.id))
      const scoreable = list.filter(m => canScoreKpiClient(session.user, m))
        .sort((a, b) => a.name.localeCompare(b.name))
      setTeam(scoreable)
    })
    if (session.user.role === 'OWNER') {
      fetch('/api/director-notes').then(r => r.json()).then(setAllNotes)
    }
    fetch('/api/projects?light=1').then(r => r.json()).then(data => {
      const projects = Array.isArray(data) ? data : []
      setMyProjects(projects.filter(p => p.pitchResult === 'WIN' || p.status === 'DONE'))
      setAllProjects(projects)
    })
    if (!KPI_SUMMARY_ROLES.includes(session.user.role)) {
      fetch(`/api/kpi?userId=${session.user.id}`).then(r => r.json()).then(data => {
        setMyKpi(Array.isArray(data) ? data : [])
      })
    }
  }, [status, session])

  useEffect(() => {
    if (status === 'authenticated' && KPI_SUMMARY_ROLES.includes(session.user.role)) {
      setKpiLoading(true)
      fetch(`/api/kpi?period=${kpiPeriod}`).then(r => r.json()).then(data => {
        setKpiAssessments(Array.isArray(data) ? data : [])
        setKpiLoading(false)
      })
    }
  }, [status, session, kpiPeriod])

  useEffect(() => {
    if (!scoreProjectId) { setScoreProject(null); return }
    fetch(`/api/projects/${scoreProjectId}`).then(r => r.json()).then(setScoreProject)
  }, [scoreProjectId])

  if (status !== 'authenticated' || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canSubmitNote = !['OWNER', 'DIRECTOR'].includes(session.user.role)

  const sendReminders = async () => {
    setReminding(true)
    const res = await fetch('/api/kpi/remind', { method: 'POST' })
    const result = res.ok ? await res.json() : null
    setReminding(false)
    setReminded(result)
  }

  const submitNote = async (e) => {
    e.preventDefault()
    if (!noteForm.directorId || !noteForm.message.trim()) return
    await fetch('/api/director-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteForm),
    })
    setNoteForm({ directorId: '', message: '' })
    setNoteSent(true)
    setTimeout(() => setNoteSent(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nilai Tim</h1>
          <p className="text-sm text-gray-500">Ringkasan penilaian tim per project</p>
        </div>

        {/* My summary */}
        {session.user.role !== 'OWNER' && (
        <div className="card p-4 border-t-4 border-blue-400">
          <p className="text-sm font-semibold text-ink-800 mb-3">Penilaian Saya</p>
          {data.mine.count === 0 ? (
            <p className="text-sm text-gray-400">Belum ada penilaian.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mb-2">
                {(data.criteria || PROJECT_SCORE_CRITERIA).map(c => (
                  <div key={c.key} className="bg-brand-50 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className="text-lg font-bold text-brand-700">{fmt(data.mine.byCriteria[c.key])}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Rata-rata keseluruhan: <span className="font-semibold text-ink-800">{fmt(data.mine.overall)}</span> dari {data.mine.count} penilaian. Identitas penilai dirahasiakan.</p>
            </>
          )}
        </div>
        )}

        {/* My monthly KPI summary */}
        {session.user.role !== 'OWNER' && !KPI_SUMMARY_ROLES.includes(session.user.role) && myKpi.length > 0 && (() => {
          const kpiDefs = KPI_BY_ROLE[session.user.role] || []
          const overall = myKpi.reduce((s, a) => s + a.score, 0) / myKpi.length
          return (
            <div className="card p-4 border-t-4 border-orange-400">
              <p className="text-sm font-semibold text-ink-800 mb-3">Kinerja General Saya (Bulanan)</p>
              <div className="grid sm:grid-cols-3 gap-3 mb-2">
                {kpiDefs.map(def => {
                  const rows = myKpi.filter(a => a.kpiKey === def.key)
                  if (rows.length === 0) return null
                  const avg = rows.reduce((s, a) => s + a.score, 0) / rows.length
                  return (
                    <div key={def.key} className="bg-brand-50 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                      <p className="text-xs text-gray-500 mb-1">{def.label}</p>
                      <p className="text-lg font-bold text-brand-700">{avg.toFixed(1)}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400">Rata-rata keseluruhan: <span className="font-semibold text-ink-800">{fmt(overall)}</span> dari {myKpi.length} penilaian (akumulasi seluruh periode).</p>
            </div>
          )
        })()}

        {/* Berikan penilaian — pilih project */}
        {myProjects.length > 0 && (
          <div className="card p-4 border-t-4 border-emerald-400">
            <p className="text-sm font-semibold text-ink-800 mb-1">Berikan Penilaian</p>
            <p className="text-xs text-gray-500 mb-3">Pilih project untuk menilai anggota tim yang terlibat di dalamnya.</p>
            <select className="select" value={scoreProjectId} onChange={e => setScoreProjectId(e.target.value)}>
              <option value="">Pilih project...</option>
              {myProjects.map(p => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            {scoreProject && (
              <div className="mt-3">
                <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                  📁 Project: {scoreProject.code} — {scoreProject.name}
                </div>
                <ProjectBonusTab project={scoreProject} session={session} />
              </div>
            )}
          </div>
        )}

        {/* Penilaian Bulanan (KPI) — Tim Saya */}
        {team.length > 0 && (
          <div className="card p-4 border-t-4 border-orange-400">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-ink-800">Penilaian Bulanan (KPI) — Tim Saya</p>
              <input type="month" className="input w-auto" value={teamKpiPeriod} onChange={e => setTeamKpiPeriod(e.target.value)} />
            </div>
            <p className="text-xs text-gray-500 mb-3">Isi penilaian KPI bulanan untuk anggota tim yang bisa Anda nilai, termasuk diri Anda sendiri. Pilih periode bulan di atas jika ingin mengisi/melihat bulan lain.</p>
            <div className="space-y-3">
              {team.map(m => (
                <KpiPanel key={m.id} user={m} session={session} period={teamKpiPeriod} projects={allProjects} />
              ))}
            </div>
          </div>
        )}

        {/* Anonymous notes addressed to me (director / owner) */}
        {['DIRECTOR', 'OWNER'].includes(session.user.role) && (
          <div className="card p-4 border-t-4 border-purple-400">
            <p className="text-sm font-semibold text-ink-800 mb-2">Catatan dari Tim (Anonim)</p>
            {(!data.myNotes || data.myNotes.length === 0) ? (
              <p className="text-sm text-gray-400">Belum ada catatan.</p>
            ) : (
              <ul className="space-y-2">
                {data.myNotes.map(n => (
                  <li key={n.id} className="text-sm bg-gray-50 rounded-lg p-2.5 text-gray-700">
                    {n.message}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('id-ID')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Team summary */}
        {data.team && data.team.length > 0 && (
          <div className="card p-4 border-t-4 border-pink-400">
            <p className="text-sm font-semibold text-ink-800 mb-1">Ringkasan Penilaian Tim</p>
            <p className="text-xs text-gray-500 mb-3">
              "Per Project (Event)" adalah akumulasi penilaian dari setiap project/event yang sudah dinilai (lihat tab "Penilaian Tim" di tiap project).
              "Kinerja General (Bulanan)" adalah akumulasi penilaian KPI bulanan (lihat menu KPI). "Gabungan" adalah rata-rata keduanya digabung.
            </p>
            {/* Mobile: card layout */}
            <div className="sm:hidden space-y-3">
              {data.team.map(({ user, summary }) => (
                <div key={user.id} className="border border-gray-100 rounded-lg p-3">
                  <p className="font-medium text-ink-800">{user.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{user.jobTitle || user.role}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(data.criteria || PROJECT_SCORE_CRITERIA).map(c => (
                      <div key={c.key} className="flex justify-between gap-2">
                        <span className="text-gray-400">{c.label}</span>
                        <span className="text-gray-700 font-medium">{fmt(summary.byCriteria[c.key])}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Per Project (Event)</span>
                      <span className="text-gray-700 font-medium">{fmt(summary.overall)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Kinerja General (Bulanan)</span>
                      <span className="text-gray-700 font-medium">{fmt(summary.kpiOverall)}</span>
                    </div>
                    <div className="col-span-2 flex justify-between gap-2 pt-1 border-t border-gray-100">
                      <span className="text-gray-500 font-medium">Gabungan</span>
                      <span className="text-brand-700 font-semibold">{fmt(summary.combinedOverall)}</span>
                    </div>
                    {summary.deduction > 0 && (
                      <div className="col-span-2 text-red-600 font-semibold" title={(summary.delayedNotes || []).map(n => `${n.status}: ${n.note || '-'}`).join('\n')}>
                        Potongan: -{summary.deduction} ({summary.delayedCount} catatan, {summary.lateUpdateCount} terlambat)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="pb-2 pr-2">Nama</th>
                    {(data.criteria || PROJECT_SCORE_CRITERIA).map(c => (
                      <th key={c.key} className="pb-2 px-2 text-center">{c.label}</th>
                    ))}
                    <th className="pb-2 px-2 text-center">Per Project (Event)</th>
                    <th className="pb-2 px-2 text-center">Kinerja General (Bulanan)</th>
                    <th className="pb-2 px-2 text-center">Potongan Progress (Bulan Ini)</th>
                    <th className="pb-2 pl-2 text-center">Gabungan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.team.map(({ user, summary }) => (
                    <tr key={user.id} className="border-t border-gray-100">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-ink-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.jobTitle || user.role}</p>
                      </td>
                      {(data.criteria || PROJECT_SCORE_CRITERIA).map(c => (
                        <td key={c.key} className="py-2 px-2 text-center text-gray-700">{fmt(summary.byCriteria[c.key])}</td>
                      ))}
                      <td className="py-2 px-2 text-center text-gray-700">{fmt(summary.overall)}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{fmt(summary.kpiOverall)}</td>
                      <td className="py-2 px-2 text-center">
                        {summary.deduction > 0 ? (
                          <span className="text-xs text-red-600 font-semibold" title={(summary.delayedNotes || []).map(n => `${n.status}: ${n.note || '-'}`).join('\n')}>
                            -{summary.deduction} ({summary.delayedCount} catatan, {summary.lateUpdateCount} terlambat)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-2 pl-2 text-center font-semibold text-brand-700">{fmt(summary.combinedOverall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail KPI bulanan */}
        {KPI_SUMMARY_ROLES.includes(session.user.role) && (() => {
          const byUser = {}
          kpiAssessments.forEach(a => {
            if (['OWNER', 'DIRECTOR'].includes(a.user.role)) return
            if (!byUser[a.userId]) byUser[a.userId] = { user: a.user, items: [] }
            byUser[a.userId].items.push(a)
          })
          const users = Object.values(byUser)

          const byEvaluator = {}
          kpiAssessments.forEach(a => {
            if (!byEvaluator[a.evaluatorId]) byEvaluator[a.evaluatorId] = { evaluator: a.evaluator, total: 0, late: 0 }
            byEvaluator[a.evaluatorId].total += 1
            if (a.late) byEvaluator[a.evaluatorId].late += 1
          })
          const evaluators = Object.values(byEvaluator).filter(e => e.late > 0)

          return (
            <div className="card p-4 border-t-4 border-teal-400">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-ink-800">Detail KPI Bulanan</p>
                  <p className="text-xs text-gray-500">Rincian penilaian KPI per anggota untuk periode terpilih</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="month" className="input w-auto" value={kpiPeriod} onChange={e => setKpiPeriod(e.target.value)} />
                  <button onClick={sendReminders} disabled={reminding} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap">
                    {reminding ? 'Mengirim...' : 'Kirim Reminder ke Belum Mengisi'}
                  </button>
                </div>
              </div>
              {reminded && (
                <p className="text-xs text-gray-500 mb-2">
                  {reminded.remindedCount === 0
                    ? 'Semua penilai sudah mengisi KPI periode ini. Tidak ada reminder dikirim.'
                    : `Reminder dikirim ke ${reminded.remindedCount} penilai yang belum mengisi.`}
                </p>
              )}

              {evaluators.length > 0 && (
                <div className="mb-3 p-3 rounded-lg border-l-4 border-red-400 bg-red-50">
                  <p className="text-sm font-semibold text-red-600 mb-1">Ketepatan Pengisian KPI</p>
                  <p className="text-xs text-gray-500 mb-2">Penilai berikut mengisi setelah tanggal 23 (poin penilai dapat dikurangi):</p>
                  <ul className="text-sm text-gray-700 space-y-0.5">
                    {evaluators.map(e => (
                      <li key={e.evaluator?.id}>{e.evaluator?.name} — {e.late} dari {e.total} penilaian terlambat</li>
                    ))}
                  </ul>
                </div>
              )}

              {kpiLoading && <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>}
              {!kpiLoading && users.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada penilaian KPI untuk periode ini</p>
              )}

              <div className="space-y-3">
                {users.map(({ user, items }) => {
                  const overall = items.reduce((s, a) => s + a.score, 0) / items.length
                  const kpiDefs = kpiCriteriaMap[user.id] || KPI_BY_ROLE[user.role] || []
                  const isOpen = kpiExpanded === user.id
                  return (
                    <div key={user.id} className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-all duration-200">
                      <button onClick={() => setKpiExpanded(isOpen ? null : user.id)} className="w-full flex items-center justify-between gap-3 text-left">
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
                          <KpiCriteriaEditor role={user.role} division={user.divisi} session={session} onChange={list => setKpiCriteriaMap(m => ({ ...m, [user.id]: list }))} />
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
            </div>
          )
        })()}

        {/* Submit anonymous note to a director */}
        {canSubmitNote && directors.length > 0 && (
          <div className="card p-4 border-t-4 border-amber-400">
            <p className="text-sm font-semibold text-ink-800 mb-1">Sampaikan Catatan ke Direktur</p>
            <p className="text-xs text-gray-500 mb-3">Identitas Anda dirahasiakan dari direktur penerima — hanya Direktur Utama & HR yang dapat melihatnya.</p>
            <form onSubmit={submitNote} className="space-y-2">
              <select className="select" value={noteForm.directorId} onChange={e => setNoteForm(f => ({ ...f, directorId: e.target.value }))} required>
                <option value="">Pilih direktur tujuan</option>
                {directors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.jobTitle || d.role}</option>)}
              </select>
              <textarea className="input" rows={3} placeholder="Tulis catatan Anda..." value={noteForm.message} onChange={e => setNoteForm(f => ({ ...f, message: e.target.value }))} required />
              <button type="submit" className="btn-primary transition-all active:scale-95">Kirim Catatan</button>
              {noteSent && <span className="ml-2 text-xs text-green-600">Catatan terkirim.</span>}
            </form>
          </div>
        )}

        {/* Owner / HR: all notes with authors */}
        {allNotes && (
          <div className="card p-4 border-t-4 border-indigo-400">
            <p className="text-sm font-semibold text-ink-800 mb-2">Semua Catatan Tim untuk Direktur</p>
            {allNotes.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada catatan.</p>
            ) : (
              <ul className="space-y-2">
                {allNotes.map(n => (
                  <li key={n.id} className="text-sm bg-gray-50 rounded-lg p-2.5 text-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Untuk <strong>{n.director?.name}</strong> dari <strong>{n.author?.name}</strong> ({n.author?.jobTitle})</p>
                    {n.message}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('id-ID')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
