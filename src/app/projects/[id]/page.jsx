'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge, CategoryBadge, PitchResultBadge } from '@/components/StatusBadge'
import { STATUS_PIPELINE, STATUS_LABEL, CATEGORY_LABEL, RECOMMENDATION_ICON, DIVISION_LABEL, PROJECT_SCORE_CRITERIA, KPI_SCORE_LABEL } from '@/lib/constants'
import { canScoreProject } from '@/lib/rbac'
import ProjectBonusTab from '@/components/ProjectBonusTab'
import Link from 'next/link'

export default function ProjectDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', assigneeId: '', priority: 'MEDIUM', openEnded: false, dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityLoaded, setActivityLoaded] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchProject = () => {
    fetch(`/api/projects/${id}`).then(r => r.json()).then(data => {
      setProject(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProject()
      fetch('/api/team').then(r => r.json()).then(setTeam)
    }
  }, [status, id])

  const isManager = ['OWNER', 'PROJECT_MANAGER'].includes(session?.user.role)
    || (session?.user.role === 'DIRECTOR' && project?.division === session?.user.divisi)

  async function updateStatus(newStatus) {
    if (!isManager) return
    setSaving(true)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchProject()
    setSaving(false)
  }

  async function toggleTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'DONE' ? 'TODO' : currentStatus === 'TODO' ? 'IN_PROGRESS' : 'DONE'
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error)
      return
    }
    fetchProject()
  }

  async function addTask(e) {
    e.preventDefault()
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...taskForm, projectId: id }),
    })
    if (res.ok) {
      setTaskForm({ title: '', assigneeId: '', priority: 'MEDIUM', openEnded: false, dueDate: '' })
      setShowTaskForm(false)
      fetchProject()
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Hapus task ini?')) return
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    fetchProject()
  }

  async function addMember(userId) {
    if (!userId) return
    const currentIds = (project.members || []).map(m => m.user.id)
    if (currentIds.includes(userId)) return
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: [...currentIds, userId] }),
    })
    fetchProject()
  }

  async function removeMember(userId) {
    const currentIds = (project.members || []).map(m => m.user.id).filter(uid => uid !== userId)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberIds: currentIds }),
    })
    fetchProject()
  }

  if (loading || !project) return <LoadingScreen />

  const doneTasks = project.tasks?.filter(t => t.status === 'DONE').length || 0
  const totalTasks = project.tasks?.length || 0
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const currentStageIndex = STATUS_PIPELINE.indexOf(project.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">Projects</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 truncate">{project.name}</span>
        </div>

        {/* Project header */}
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs text-gray-400 font-mono">{project.code}</span>
                <CategoryBadge category={project.category} />
                {project.recommendation && (
                  <span className="text-xs text-gray-500">{RECOMMENDATION_ICON[project.recommendation]}</span>
                )}
              </div>
              <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                <span>Client: <strong>{project.client?.name || '—'}</strong></span>
                <span>PIC: <strong>{project.pic?.name || '—'}</strong></span>
                {project.startDate && <span>Event: <strong>{new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>}
                {project.budgetTier && <span>Budget: <strong>{project.budgetTier}</strong></span>}
                {project.eventComplexity && <span>Kompleksitas: <strong>{project.eventComplexity}</strong></span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PitchResultBadge result={project.pitchResult} />
              <StatusBadge status={project.status} />
            </div>
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Task Progress</span>
                <span>{doneTasks}/{totalTasks} selesai ({progress}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Pipeline stepper */}
          {isManager && !['FAILED', 'CANCELED'].includes(project.status) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Pindah stage:</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_PIPELINE.filter(s => !['FAILED', 'CANCELED'].includes(s)).map((s, i) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={saving || s === project.status}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all active:scale-95 ${
                      s === project.status
                        ? 'bg-orange-500 text-white shadow-sm'
                        : i < currentStageIndex
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
                <button onClick={() => updateStatus('FAILED')} disabled={saving} className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100">Failed</button>
                <button onClick={() => updateStatus('CANCELED')} disabled={saving} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200">Canceled</button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {['tasks', 'team', 'activity', 'info', ...(canScoreProject(session?.user, project) ? ['bonus'] : [])].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                if (tab === 'activity' && !activityLoaded) {
                  fetch(`/api/projects/${id}/activity`).then(r => r.ok ? r.json() : []).then(data => {
                    setActivity(Array.isArray(data) ? data : [])
                    setActivityLoaded(true)
                  })
                }
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              {tab === 'tasks' ? `Tasks (${totalTasks})` : tab === 'team' ? `Tim (${(project.members?.length || 0) + (project.pic ? 1 : 0)})` : tab === 'bonus' ? 'Penilaian Tim' : tab === 'activity' ? 'Aktivitas' : 'Info'}
            </button>
          ))}
        </div>

        {/* TAB: Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {project.tasks?.map(task => (
              <div key={task.id} className={`card px-4 py-3 flex items-start gap-3 hover:shadow-sm transition-all duration-200 ${task.status === 'BLOCKED' ? 'opacity-60' : ''}`}>
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                    task.status === 'DONE' ? 'bg-green-500 border-green-500' :
                    task.status === 'IN_PROGRESS' ? 'border-orange-500' :
                    task.status === 'BLOCKED' ? 'border-gray-300 cursor-not-allowed' :
                    'border-gray-300 hover:border-orange-400'
                  }`}
                  disabled={task.status === 'BLOCKED'}
                >
                  {task.status === 'DONE' && <span className="text-white text-xs">✓</span>}
                  {task.status === 'IN_PROGRESS' && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                  {task.status === 'BLOCKED' && <span className="text-gray-400 text-xs">🔒</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-0.5">
                    {task.assignee && <span className="text-xs text-gray-400">{task.assignee.name}</span>}
                    {task.dueDate && !task.openEnded && (
                      <span className="text-xs text-gray-400">{new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    )}
                    {task.openEnded && <span className="text-xs text-blue-400">Open-ended</span>}
                    {task.status === 'BLOCKED' && (
                      <span className="text-xs text-amber-500">
                        Tunggu: {task.dependencies?.map(d => d.requiredTask.title).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    task.priority === 'URGENT' ? 'bg-red-100 text-red-600' :
                    task.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>{task.priority}</span>
                  {isManager && (
                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
              </div>
            ))}

            {isManager && !showTaskForm && (
              <button onClick={() => setShowTaskForm(true)} className="w-full card px-4 py-3 text-sm text-gray-400 hover:text-orange-500 text-left hover:bg-orange-50 transition-colors">
                + Tambah task...
              </button>
            )}

            {showTaskForm && (
              <form onSubmit={addTask} className="card p-4 space-y-3">
                <div>
                  <label className="label">Nama Task *</label>
                  <input className="input" value={taskForm.title} onChange={e => setTaskForm(f => ({...f, title: e.target.value}))} required placeholder="Deskripsi task..." autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Assignee</label>
                    <select className="select" value={taskForm.assigneeId} onChange={e => setTaskForm(f => ({...f, assigneeId: e.target.value}))}>
                      <option value="">Pilih anggota</option>
                      {[project.pic, ...(project.members?.map(m => m.user) || [])].filter(Boolean).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Prioritas</label>
                    <select className="select" value={taskForm.priority} onChange={e => setTaskForm(f => ({...f, priority: e.target.value}))}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="label">Deadline</label>
                    <input type="date" className="input" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({...f, dueDate: e.target.value}))} disabled={taskForm.openEnded} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mt-5 cursor-pointer">
                    <input type="checkbox" checked={taskForm.openEnded} onChange={e => setTaskForm(f => ({...f, openEnded: e.target.checked}))} className="rounded" />
                    Open-ended
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">Simpan Task</button>
                  <button type="button" onClick={() => setShowTaskForm(false)} className="btn-secondary">Batal</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB: Team */}
        {activeTab === 'team' && (
          <div className="space-y-2">
            {/* PIC */}
            {project.pic && (
              <div className="card px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0">
                  {project.pic.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.pic.name}</p>
                  <p className="text-xs text-gray-500">{project.pic.jobTitle || project.pic.role}</p>
                </div>
                <span className="ml-auto text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">PIC</span>
              </div>
            )}

            {project.members?.map(({ user }) => (
              <div key={user.id} className="card px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.jobTitle || user.role} · {user.divisi}</p>
                </div>
                {isManager && (
                  <button onClick={() => removeMember(user.id)} className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
                )}
              </div>
            ))}

            {!project.pic && project.members?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Belum ada anggota tim</p>
            )}

            {isManager && (
              <div className="card p-3">
                <label className="label">+ Tambah anggota (semua divisi)</label>
                <select className="select" value="" onChange={e => addMember(e.target.value)}>
                  <option value="">Pilih anggota...</option>
                  {team
                    .filter(u => u.id !== project.pic?.id && !project.members?.some(m => m.user.id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name} — {u.jobTitle || u.role} ({u.divisi})</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* TAB: Activity feed */}
        {activeTab === 'activity' && (
          <div className="card divide-y divide-gray-50">
            {!activityLoaded && <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>}
            {activityLoaded && activity.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Belum ada aktivitas tercatat</p>
            )}
            {activity.map(log => (
              <div key={log.id} className="px-4 py-3">
                <p className="text-sm text-gray-800">{log.summary}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* TAB: Bonus scoring */}
        {activeTab === 'bonus' && (
          <ProjectBonusTab project={project} session={session} />
        )}

        {/* TAB: Info */}
        {activeTab === 'info' && (
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <InfoRow label="Client" value={project.client?.name} />
              <InfoRow label="Industri" value={project.client?.industry} />
              <InfoRow label="PIC" value={project.pic?.name} />
              <InfoRow label="Kategori" value={CATEGORY_LABEL[project.category]} />
              <InfoRow label="Budget Tier" value={project.budgetTier} />
              <InfoRow label="Kompleksitas" value={project.eventComplexity} />
              <InfoRow label="Tanggal Brief" value={project.briefDate ? new Date(project.briefDate).toLocaleDateString('id-ID') : null} />
              <InfoRow label="Tanggal Submit" value={project.submitDate ? new Date(project.submitDate).toLocaleDateString('id-ID') : null} />
              <InfoRow label="Durasi Pitch" value={project.pitchDuration ? `${project.pitchDuration} hari` : null} />
              <InfoRow label="Tanggal Event" value={project.startDate ? new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
              <InfoRow label="Tanggal Selesai" value={project.endDate ? new Date(project.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
              <InfoRow label="Durasi" value={project.projectDuration ? `${project.projectDuration} hari` : null} />
              <InfoRow label="Hari Loading / GR" value={project.loadInDays ? `${project.loadInDays} hari` : null} />
              <InfoRow label="Divisi" value={DIVISION_LABEL[project.division] || project.division} />
              <InfoRow label="Pitch Status" value={project.pitchStatus?.replace('_', ' ')} />
              <InfoRow label="Hasil Pitch" value={project.pitchResult?.replace('_', ' ')} />
              <InfoRow label="Alasan Menang/Kalah" value={project.wonLossReason} />
              {project.vendorWinner && <InfoRow label="Vendor Pemenang" value={project.vendorWinner} />}
            </div>
            {project.notes && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Catatan</p>
                <p className="text-sm text-gray-700">{project.notes}</p>
              </div>
            )}
            {['HOLD', 'FAILED', 'DONE', 'CANCELED'].includes(project.status) && (
              <EvaluationNote project={project} setProject={setProject} />
            )}
          </div>
        )}

      </main>
    </div>
  )
}

function EvaluationNote({ project, setProject }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(project.evaluationNote || '')
  const [saving, setSaving] = useState(false)

  const STATUS_HINT = {
    FAILED: 'Mis: alasan kalah (budget/kreatif), kalah dari kompetitor mana, dll.',
    DONE: 'Mis: kritik/feedback dari klien, catatan vendor (siapa & bagaimana hasil kerjanya), dll.',
    HOLD: 'Catatan evaluasi project ini untuk referensi ke depan.',
    CANCELED: 'Catatan evaluasi mengapa project ini dibatalkan.',
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluationNote: value }),
    })
    setSaving(false)
    if (res.ok) {
      setProject(p => ({ ...p, evaluationNote: value }))
      setEditing(false)
    }
  }

  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">Catatan Evaluasi Tim</p>
        {!editing && (
          <button onClick={() => { setValue(project.evaluationNote || ''); setEditing(true) }} className="text-xs text-brand-600 hover:underline">
            {project.evaluationNote ? 'Edit' : 'Tambah catatan'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">{STATUS_HINT[project.status]}</p>
      {editing ? (
        <div className="space-y-2">
          <textarea className="input text-sm w-full" rows={4} value={value} onChange={e => setValue(e.target.value)} placeholder={STATUS_HINT[project.status]} />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline">Batal</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.evaluationNote || <span className="text-gray-400">Belum ada catatan evaluasi.</span>}</p>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
