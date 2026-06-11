'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import clsx from 'clsx'
import { KPI_BY_ROLE, KPI_SCORE_LABEL, KPI_DEADLINE_DAY, resolveKpiPeriod } from '@/lib/constants'
import { CROSS_TEAM_PM_EMAIL } from '@/lib/rbac'
import KpiCriteriaEditor from '@/components/KpiCriteriaEditor'

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const LOAD_COLOR = (count) => {
  if (count === 0) return 'bg-gray-100 text-gray-400'
  if (count <= 2) return 'bg-green-100 text-green-700'
  if (count <= 4) return 'bg-yellow-100 text-yellow-700'
  if (count <= 6) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const LOAD_LABEL = (count) => {
  if (count === 0) return 'Kosong'
  if (count <= 2) return 'Ringan'
  if (count <= 4) return 'Normal'
  if (count <= 6) return 'Padat'
  return 'Overload'
}

export default function WorkloadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workload, setWorkload] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [filterDivisi, setFilterDivisi] = useState('')
  const [teamList, setTeamList] = useState([])
  const now = new Date()
  const [filterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/team').then(r => r.json()).then(data => setTeamList(Array.isArray(data) ? data : []))
    const isManager = ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR'].includes(session.user.role)

    if (isManager) {
      fetch(`/api/workload?year=${now.getFullYear()}`).then(r => r.json()).then(data => {
        const list = Array.isArray(data) ? data.filter(w => w.user.id !== session.user.id) : []
        setWorkload(list)
        setLoading(false)
      })
    } else {
      // Non-managers: show only their own workload
      fetch(`/api/workload?year=${now.getFullYear()}`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          const mine = data.filter(w => w.user.id === session.user.id)
          setWorkload(mine)
          if (mine.length > 0) setSelectedUser(mine[0])
        }
        setLoading(false)
      })
    }
  }, [status])

  const isManager = ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR'].includes(session?.user.role)

  const filtered = workload.filter(w => !filterDivisi || w.user.divisi === filterDivisi)
  const eventTeam = workload.filter(w => w.user.divisi === 'EVENT')
  const creativeTeam = workload.filter(w => w.user.divisi === 'CREATIVE')

  const totalActive = workload.reduce((sum, w) => sum + w.activeCount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workload Tim</h1>
            <p className="text-sm text-gray-500">{now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} · {totalActive} project aktif total</p>
          </div>
          {isManager && (
            <select className="select w-auto" value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)}>
              <option value="">Semua Divisi</option>
              <option value="EVENT">Event</option>
              <option value="CREATIVE">Creative</option>
              <option value="PH">Production House</option>
              <option value="FINANCE_HRGA">Finance / HR / GA</option>
            </select>
          )}
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat workload...</div>}

        {!loading && isManager && (
          <>
            {/* Summary heatmap */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribusi Beban Kerja</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(w => (
                  <button
                    key={w.user.id}
                    onClick={() => setSelectedUser(selectedUser?.user.id === w.user.id ? null : w)}
                    className={clsx(
                      'rounded-xl p-3 text-left transition-all duration-200 border-2 hover:shadow-md hover:-translate-y-0.5',
                      selectedUser?.user.id === w.user.id ? 'border-orange-400 shadow-md' : 'border-transparent',
                      LOAD_COLOR(w.activeCount)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white bg-opacity-60 flex items-center justify-center font-bold text-sm">
                        {w.user.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{w.user.name}</p>
                        <p className="text-xs opacity-70">{w.user.jobTitle || w.user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold">{w.activeCount}</span>
                        <span className="text-xs opacity-70 ml-1">aktif</span>
                      </div>
                      <span className="text-xs font-medium opacity-80">{LOAD_LABEL(w.activeCount)}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs opacity-70">
                      <span>PIC: {w.picCount}</span>
                      <span>·</span>
                      <span>Member: {w.memberCount}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Kosong (0)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Ringan (1-2)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Normal (3-4)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Padat (5-6)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Overload (7+)</span>
              </div>
            </div>

            {/* Team comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamColumn title="Divisi Event" members={eventTeam} onSelect={setSelectedUser} selectedId={selectedUser?.user.id} />
              <TeamColumn title="Divisi Creative" members={creativeTeam} onSelect={setSelectedUser} selectedId={selectedUser?.user.id} />
            </div>
          </>
        )}

        {/* Detail panel — selected user or self */}
        {(selectedUser || (!isManager && workload.length > 0)) && (
          <UserDetail data={selectedUser || workload[0]} session={session} teamList={teamList} canReassign={isManager} />
        )}

      </main>
    </div>
  )
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function canScoreKpiClient(evaluator, target) {
  if (!evaluator || !target) return false
  if (evaluator.id === target.id) return false
  if (evaluator.role === 'OWNER') return true
  if (['OWNER', 'DIRECTOR'].includes(target.role)) return false
  if (evaluator.role === 'DIRECTOR') return evaluator.divisi === target.divisi
  if (evaluator.email === CROSS_TEAM_PM_EMAIL) return true
  if (evaluator.role === 'PROJECT_MANAGER') return target.role !== 'PROJECT_MANAGER'
  return ['CREATIVE_LEAD', 'FINANCE'].includes(evaluator.role)
}

function KpiPanel({ user, session }) {
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

function TeamColumn({ title, members, onSelect, selectedId }) {
  if (members.length === 0) return null
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {members.map(w => (
          <button
            key={w.user.id}
            onClick={() => onSelect(w)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
              selectedId === w.user.id ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-gray-50'
            )}
          >
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0', LOAD_COLOR(w.activeCount))}>
              {w.user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{w.user.name}</p>
              <p className="text-xs text-gray-400">{w.user.jobTitle}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-800">{w.activeCount}</p>
              <p className="text-xs text-gray-400">aktif</p>
            </div>
            <div className="w-16 bg-gray-100 rounded-full h-1.5 shrink-0">
              <div
                className={clsx('h-1.5 rounded-full', w.activeCount <= 2 ? 'bg-green-400' : w.activeCount <= 4 ? 'bg-yellow-400' : w.activeCount <= 6 ? 'bg-orange-400' : 'bg-red-400')}
                style={{ width: `${Math.min(100, (w.activeCount / 8) * 100)}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function UserDetail({ data, session, teamList = [], canReassign = false }) {
  const [showAll, setShowAll] = useState(false)
  const [tasks, setTasks] = useState(data.tasks || [])
  const [reassigning, setReassigning] = useState(null)

  useEffect(() => { setTasks(data.tasks || []) }, [data])

  const handleReassign = async (taskId, assigneeId) => {
    setReassigning(taskId)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId }),
    })
    setTasks(t => t.filter(x => x.id !== taskId))
    setReassigning(null)
  }

  const activeProjects = data.projects.filter(p => ['PITCHING','PREPARATION','EVENT_DAY','REPORTING','INVOICING'].includes(p.status))
  const closedProjects = data.projects.filter(p => ['DONE','FAILED','CANCELED','HOLD','WAITING_PITCH_RESULT'].includes(p.status))
  const displayed = showAll ? data.projects : activeProjects

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
          {data.user.name[0]}
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{data.user.name}</h2>
          <p className="text-xs text-gray-500">{data.user.jobTitle} · Divisi {data.user.divisi}</p>
        </div>
        <div className="ml-auto flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-orange-600">{data.activeCount}</p>
            <p className="text-xs text-gray-400">Aktif</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700">{data.picCount}</p>
            <p className="text-xs text-gray-400">Sebagai PIC</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700">{data.totalProjects}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>
      </div>

      {KPI_BY_ROLE[data.user.role] && (
        <KpiPanel user={data.user} session={session} />
      )}

      {/* Active task list — for delegation/reassignment */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tugas Berjalan ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">Tidak ada tugas berjalan.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {t.project && <span className="text-xs text-gray-400 font-mono">{t.project.code}</span>}
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium',
                      t.priority === 'HIGH' ? 'bg-red-100 text-red-600' : t.priority === 'LOW' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700')}>
                      {t.priority}
                    </span>
                    <span className="text-xs text-gray-400">{t.status}</span>
                  </div>
                  <p className="text-sm text-gray-800 truncate">{t.title}</p>
                  {t.project && <p className="text-xs text-gray-400 truncate">{t.project.name}</p>}
                </div>
                {canReassign && (
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 shrink-0"
                    value=""
                    disabled={reassigning === t.id}
                    onChange={e => e.target.value && handleReassign(t.id, e.target.value)}
                  >
                    <option value="">Delegasikan ke...</option>
                    {teamList.filter(u => u.id !== data.user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {showAll ? 'Semua Project' : 'Project Aktif'}
        </h3>
        <button onClick={() => setShowAll(!showAll)} className="text-xs text-orange-500 hover:text-orange-600">
          {showAll ? 'Tampilkan aktif saja' : `Tampilkan semua (${data.totalProjects})`}
        </button>
      </div>

      <div className="space-y-2">
        {displayed.map(p => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                {p.isPic && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded font-medium">PIC</span>}
              </div>
              <p className="text-sm text-gray-800 truncate">{p.name}</p>
              {p.startDate && (
                <p className="text-xs text-gray-400">{new Date(p.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              )}
            </div>
            <StatusBadge status={p.status} />
          </Link>
        ))}
        {displayed.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Tidak ada project aktif</p>
        )}
      </div>
    </div>
  )
}
