'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge, CategoryBadge, PitchResultBadge } from '@/components/StatusBadge'
import { STATUS_PIPELINE, STATUS_LABEL, CATEGORY_LABEL, EO_CATEGORIES, PH_CATEGORIES, RECOMMENDATION_ICON, DIVISION_LABEL, PROJECT_SCORE_CRITERIA, KPI_SCORE_LABEL, LOSE_REASON_OPTIONS, CLIENT_BRIEF_TEMPLATES } from '@/lib/constants'
import { canScoreProject } from '@/lib/rbac'
import ProjectBonusTab from '@/components/ProjectBonusTab'
import QuotationProjectTab from '@/components/QuotationProjectTab'
import Link from 'next/link'

export default function ProjectDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      return p.get('tab') || 'tasks'
    }
    return 'tasks'
  })
  const [isNewProject] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('new') === '1'
    }
    return false
  })
  const [nextStepsDismissed, setNextStepsDismissed] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', assigneeId: '', priority: 'MEDIUM', openEnded: false, dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityLoaded, setActivityLoaded] = useState(false)
  const [openCommentsTaskId, setOpenCommentsTaskId] = useState(null)
  const [comments, setComments] = useState({})
  const [commentText, setCommentText] = useState({})
  const [mentionBox, setMentionBox] = useState(null) // { taskId, query }
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [editingClient, setEditingClient] = useState(false)
  const [clientValue, setClientValue] = useState('')
  const [allClients, setAllClients] = useState([])
  const [editingCategory, setEditingCategory] = useState(false)
  const [categoryValue, setCategoryValue] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [editingPic, setEditingPic] = useState(false)
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState(null)
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState(null)
  const [editingDates, setEditingDates] = useState(false)
  const [datesForm, setDatesForm] = useState({ briefDate: '', startDate: '', endDate: '' })
  const [picValue, setPicValue] = useState('')

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
      fetch('/api/clients?simple=1').then(r => r.json()).then(setAllClients)
    }
  }, [status, id])

  const isManager = ['OWNER', 'PROJECT_MANAGER'].includes(session?.user.role)
    || (session?.user.role === 'DIRECTOR' && project?.division === session?.user.divisi)

  async function saveTitle() {
    const value = titleValue.trim()
    if (!value || value === project.name) { setEditingTitle(false); return }
    setSaving(true)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    })
    setEditingTitle(false)
    setSaving(false)
    fetchProject()
  }

  async function saveClient() {
    if (!clientValue || clientValue === project.client?.id) { setEditingClient(false); return }
    setSaving(true)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: clientValue }),
    })
    setEditingClient(false)
    setSaving(false)
    fetchProject()
  }

  async function saveCategory() {
    const value = (categoryValue === '__CUSTOM__' ? customCategory.trim() : categoryValue)
    if (!value || value === project.category) { setEditingCategory(false); return }
    setSaving(true)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: value }),
    })
    setEditingCategory(false)
    setSaving(false)
    fetchProject()
  }

  async function saveDates() {
    setSaving(true)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        briefDate: datesForm.briefDate || null,
        startDate: datesForm.startDate || null,
        endDate: datesForm.endDate || null,
      }),
    })
    setEditingDates(false)
    setSaving(false)
    fetchProject()
  }

  async function savePic() {
    if (!picValue || picValue === project.pic?.id) { setEditingPic(false); return }
    setSaving(true)
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picId: picValue }),
    })
    setEditingPic(false)
    setSaving(false)
    fetchProject()
  }

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
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    setConfirmDeleteTaskId(null)
    fetchProject()
  }

  async function toggleComments(taskId) {
    if (openCommentsTaskId === taskId) {
      setOpenCommentsTaskId(null)
      return
    }
    setOpenCommentsTaskId(taskId)
    if (!comments[taskId]) {
      const res = await fetch(`/api/tasks/${taskId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(c => ({ ...c, [taskId]: data }))
      }
    }
  }

  async function sendComment(taskId) {
    const content = (commentText[taskId] || '').trim()
    if (!content) return
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setComments(c => ({ ...c, [taskId]: [...(c[taskId] || []), newComment] }))
      setCommentText(t => ({ ...t, [taskId]: '' }))
      setMentionBox(null)
      fetchProject()
    }
  }

  function handleCommentChange(taskId, value) {
    setCommentText(t => ({ ...t, [taskId]: value }))
    const match = value.match(/@(\w*)$/)
    if (match) {
      setMentionBox({ taskId, query: match[1].toLowerCase() })
    } else {
      setMentionBox(null)
    }
  }

  function insertMention(taskId, name) {
    const current = commentText[taskId] || ''
    const replaced = current.replace(/@(\w*)$/, `@${name.replace(/\s+/g, '_')} `)
    setCommentText(t => ({ ...t, [taskId]: replaced }))
    setMentionBox(null)
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
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">Projects</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 truncate">{project.name}</span>
        </div>

        {/* ── "Langkah Selanjutnya" banner — muncul setelah buat project baru ── */}
        {isNewProject && !nextStepsDismissed && project && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-green-800">🎉 Project berhasil dibuat! Langkah selanjutnya:</p>
                <p className="text-sm text-green-700 mt-0.5">Pastikan quotation dibuat dan dihubungkan ke project ini agar anggaran dan laporan keuangan akurat.</p>
              </div>
              <button onClick={() => setNextStepsDismissed(true)} className="text-green-400 hover:text-green-600 text-lg leading-none shrink-0">✕</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link href={`/quotation/new?projectId=${id}`}
                className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium">
                📄 Buat Quotation Baru untuk Project Ini
              </Link>
              <button
                onClick={() => { setActiveTab('quotation'); setNextStepsDismissed(true) }}
                className="text-sm px-4 py-2 rounded-lg border border-green-300 text-green-700 hover:bg-green-100">
                🔗 Tautkan Quotation yang Sudah Ada
              </button>
              <button onClick={() => setNextStepsDismissed(true)}
                className="text-sm px-4 py-2 rounded-lg border border-green-200 text-green-600 hover:bg-green-50">
                ⏭ Nanti saja
              </button>
            </div>
          </div>
        )}

        {/* ── Reminder: project lama tanpa quotation ── */}
        {!isNewProject && project && !project.quotations?.some(q => ['WON','APPROVED','PENDING_DIRECTOR','PENDING_WULAN'].includes(q.status)) &&
         ['ACTIVE','PITCHING','HOLD'].includes(project.status) &&
         ['OWNER','DIRECTOR','PROJECT_MANAGER'].includes(session?.user?.role) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-sm text-amber-800 flex-1 min-w-0">
              <span className="shrink-0">⚠</span>
              <div>
                <span>Project ini belum memiliki quotation. Budget dan omset tidak akan terhitung di laporan keuangan.</span>
                {project.quotationDeadline && (() => {
                  const diff = Math.ceil((new Date(project.quotationDeadline) - new Date()) / 86400000)
                  return diff < 0
                    ? <span className="block font-semibold text-red-600 mt-0.5">Target pengiriman sudah lewat {Math.abs(diff)} hari!</span>
                    : <span className="block text-amber-600 mt-0.5">{diff} hari lagi target kirim.</span>
                })()}
              </div>
            </div>
            <Link href={`/quotation/new?projectId=${id}`}
              className="shrink-0 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
              Buat Quotation →
            </Link>
          </div>
        )}

        {/* Project header */}
        <div className="card p-5 border-t-4 border-blue-400">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs text-gray-400 font-mono">{project.code}</span>
                {editingCategory ? (
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <select
                      autoFocus
                      className="select text-xs py-0.5 px-1.5 w-auto"
                      value={categoryValue}
                      onChange={e => { setCategoryValue(e.target.value); setCustomCategory('') }}
                    >
                      {(project.division === 'PH' ? PH_CATEGORIES : EO_CATEGORIES).map(k => (
                        <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
                      ))}
                      <option value="__CUSTOM__">+ Kategori lain (custom)…</option>
                    </select>
                    {categoryValue === '__CUSTOM__' && (
                      <input
                        autoFocus
                        className="input text-xs py-0.5 px-1.5 w-36"
                        placeholder="Tulis nama kategori…"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCategory(); if (e.key === 'Escape') setEditingCategory(false) }}
                      />
                    )}
                    <button onClick={saveCategory} className="text-xs text-brand-600 hover:underline">Simpan</button>
                    <button onClick={() => setEditingCategory(false)} className="text-xs text-gray-400 hover:underline">Batal</button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CategoryBadge category={project.category} />
                    {isManager && (
                      <button
                        onClick={() => { setCategoryValue(project.category || ''); setCustomCategory(''); setEditingCategory(true) }}
                        className="text-gray-300 hover:text-brand-600"
                        title="Ganti kategori"
                      >✏️</button>
                    )}
                  </span>
                )}
                {project.recommendation && (
                  <span className="text-xs text-gray-500">{RECOMMENDATION_ICON[project.recommendation]}</span>
                )}
              </div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="input text-lg font-bold py-1"
                    value={titleValue}
                    onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  />
                  <button onClick={saveTitle} className="text-xs text-brand-600 hover:underline shrink-0">Simpan</button>
                  <button onClick={() => setEditingTitle(false)} className="text-xs text-gray-400 hover:underline shrink-0">Batal</button>
                </div>
              ) : (
                <h1 className="text-lg font-bold text-gray-900 group flex items-center gap-2">
                  {project.name}
                  {isManager && (
                    <button onClick={() => { setTitleValue(project.name); setEditingTitle(true) }} className="text-xs text-gray-300 hover:text-brand-600" title="Edit nama project">✏️</button>
                  )}
                </h1>
              )}
              {/* Info baris — view mode */}
              {!editingClient && !editingPic && !editingDates && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                  <span>Client: <strong>{project.client?.name || '—'}</strong></span>
                  <span>PIC: <strong>{project.pic?.name || '—'}</strong></span>
                  <span>Brief: <strong>{project.briefDate ? new Date(project.briefDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></span>
                  <span>
                    Event: <strong>{project.startDate ? new Date(project.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</strong>
                    {project.endDate && <> s/d <strong>{new Date(project.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></>}
                  </span>
                  {project.budgetTier && <span>Budget: <strong>{project.budgetTier}</strong></span>}
                  {isManager && (
                    <button
                      onClick={() => {
                        setClientValue(project.client?.id || '')
                        setPicValue(project.pic?.id || '')
                        setDatesForm({
                          briefDate: project.briefDate ? project.briefDate.slice(0, 10) : '',
                          startDate: project.startDate ? project.startDate.slice(0, 10) : '',
                          endDate: project.endDate ? project.endDate.slice(0, 10) : '',
                        })
                        setEditingClient(true)
                        setEditingPic(true)
                        setEditingDates(true)
                      }}
                      className="text-gray-300 hover:text-brand-600"
                      title="Edit info"
                    >✏️</button>
                  )}
                </div>
              )}

              {/* Edit form terpadu — semua field sekaligus */}
              {isManager && (editingClient || editingPic || editingDates) && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">Client</label>
                      <select className="select" value={clientValue} onChange={e => setClientValue(e.target.value)}>
                        <option value="">— Pilih client —</option>
                        {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">PIC</label>
                      <select className="select" value={picValue} onChange={e => setPicValue(e.target.value)}>
                        <option value="">— Belum ada PIC —</option>
                        {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tgl Brief</label>
                      <input type="date" className="input" value={datesForm.briefDate} onChange={e => setDatesForm(f => ({ ...f, briefDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Tgl Event / Mulai</label>
                      <input type="date" className="input" value={datesForm.startDate} onChange={e => setDatesForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Tgl Selesai (opsional)</label>
                      <input type="date" className="input" value={datesForm.endDate} onChange={e => setDatesForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        setSaving(true)
                        const tasks = []
                        if (clientValue !== (project.client?.id || '')) tasks.push(fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientValue || null }) }))
                        if (picValue !== (project.pic?.id || '')) tasks.push(fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ picId: picValue || null }) }))
                        const dateChanged = datesForm.briefDate !== (project.briefDate?.slice(0,10)||'') || datesForm.startDate !== (project.startDate?.slice(0,10)||'') || datesForm.endDate !== (project.endDate?.slice(0,10)||'')
                        if (dateChanged) tasks.push(fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ briefDate: datesForm.briefDate||null, startDate: datesForm.startDate||null, endDate: datesForm.endDate||null }) }))
                        await Promise.all(tasks)
                        setEditingClient(false); setEditingPic(false); setEditingDates(false)
                        setSaving(false)
                        fetchProject()
                      }}
                      disabled={saving}
                      className="btn-primary flex-1"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => { setEditingClient(false); setEditingPic(false); setEditingDates(false) }}
                      className="btn-secondary"
                    >Batal</button>
                  </div>
                </div>
              )}
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
                <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
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
                        ? 'bg-brand-500 text-white shadow-sm'
                        : i < currentStageIndex
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
                {/* Divider + terminal states */}
                <span className="self-center text-gray-300 select-none">|</span>
                <span className="self-center text-[10px] text-gray-400 font-medium uppercase tracking-wide">Tutup:</span>
                <button onClick={() => updateStatus('FAILED')} disabled={saving} className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 border border-red-100">Failed</button>
                <button onClick={() => updateStatus('CANCELED')} disabled={saving} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200">Canceled</button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {['tasks', 'quotation', 'team', 'activity', 'info', ...(canScoreProject(session?.user, project) ? ['bonus'] : [])].map(tab => (
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
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              {tab === 'tasks' ? `Tasks (${totalTasks})` : tab === 'quotation' ? 'Quotation' : tab === 'team' ? `Tim (${(project.members?.length || 0) + (project.pic ? 1 : 0)})` : tab === 'bonus' ? 'Penilaian Tim' : tab === 'activity' ? 'Aktivitas' : 'Info'}
            </button>
          ))}
        </div>

        {/* TAB: Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {project.tasks?.map(task => (
              <div key={task.id} className={`card px-4 py-3 ${task.status === 'BLOCKED' ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3 hover:shadow-sm transition-all duration-200">
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all active:scale-90 ${
                    task.status === 'DONE' ? 'bg-green-500 border-green-500' :
                    task.status === 'IN_PROGRESS' ? 'border-brand-500' :
                    task.status === 'BLOCKED' ? 'border-gray-300 cursor-not-allowed' :
                    'border-gray-300 hover:border-brand-400'
                  }`}
                  disabled={task.status === 'BLOCKED'}
                >
                  {task.status === 'DONE' && <span className="text-white text-xs">✓</span>}
                  {task.status === 'IN_PROGRESS' && <span className="w-2 h-2 bg-brand-500 rounded-full" />}
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
                    task.priority === 'HIGH' ? 'bg-brand-100 text-brand-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>{task.priority}</span>
                  {isManager && (
                    confirmDeleteTaskId === task.id ? (
                      <span className="inline-flex items-center gap-1">
                        <button onClick={() => deleteTask(task.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">Hapus</button>
                        <button onClick={() => setConfirmDeleteTaskId(null)} className="text-[10px] text-gray-400 hover:underline">Batal</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDeleteTaskId(task.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                    )
                  )}
                </div>
              </div>

              {/* Comments / discussion */}
              <div className="mt-2 pl-8">
                <button onClick={() => toggleComments(task.id)} className="text-xs text-gray-400 hover:text-brand-500">
                  💬 {openCommentsTaskId === task.id ? 'Tutup diskusi' : `Diskusi${task._count?.comments ? ` (${task._count.comments})` : ''}`}
                </button>

                {openCommentsTaskId === task.id && (
                  <div className="mt-2 space-y-2">
                    {(comments[task.id] || []).map(c => (
                      <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{c.author?.name}</span>
                          <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                    ))}
                    {(comments[task.id]?.length === 0 || !comments[task.id]) && (comments[task.id]?.length === 0) && (
                      <p className="text-xs text-gray-400">Belum ada diskusi.</p>
                    )}

                    <div className="relative">
                      <div className="flex gap-2">
                        <input
                          className="input text-sm"
                          placeholder="Tulis komentar... ketik @ untuk tag anggota"
                          value={commentText[task.id] || ''}
                          onChange={e => handleCommentChange(task.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !mentionBox) sendComment(task.id) }}
                        />
                        <button onClick={() => sendComment(task.id)} className="btn-primary text-sm shrink-0">Kirim</button>
                      </div>
                      {mentionBox?.taskId === task.id && (
                        <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-md mt-1 w-48 max-h-40 overflow-y-auto">
                          {[project.pic, ...(project.members?.map(m => m.user) || [])]
                            .filter(Boolean)
                            .filter(u => u.name.toLowerCase().includes(mentionBox.query))
                            .map(u => (
                              <button
                                key={u.id}
                                onClick={() => insertMention(task.id, u.name)}
                                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 text-gray-700"
                              >
                                {u.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>
            ))}

            {isManager && !showTaskForm && (
              <button onClick={() => setShowTaskForm(true)} className="w-full card px-4 py-3 text-sm text-gray-400 hover:text-brand-500 text-left hover:bg-brand-50 transition-colors">
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

        {/* TAB: Quotation */}
        {activeTab === 'quotation' && (
          <QuotationProjectTab
            project={project}
            session={session}
            onProjectUpdated={fetchProject}
          />
        )}

        {/* TAB: Team */}
        {activeTab === 'team' && (
          <div className="space-y-2">
            {/* PIC */}
            {project.pic && (
              <div className="card px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                  {project.pic.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.pic.name}</p>
                  <p className="text-xs text-gray-500">{project.pic.jobTitle || project.pic.role}</p>
                </div>
                <span className="ml-auto text-xs font-medium bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">PIC</span>
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
                  confirmRemoveMemberId === user.id ? (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <button onClick={() => { removeMember(user.id); setConfirmRemoveMemberId(null) }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">Ya</button>
                      <button onClick={() => setConfirmRemoveMemberId(null)} className="text-[10px] text-gray-400 hover:underline">Batal</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmRemoveMemberId(user.id)} className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
                  )
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
          <div className="card divide-y divide-gray-50 border-t-4 border-brand-400">
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
          <div className="card p-5 space-y-4 border-t-4 border-emerald-400">
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
            <EvaluationNote project={project} setProject={setProject} />
          </div>
        )}

        {/* TAB: Info — Quotation & Invoice tracking (pre-launch data) */}
        {activeTab === 'info' && (
          <QuotationInvoiceInfoSection
            project={project}
            isManager={isManager}
            canFinance={['OWNER','FINANCE','FINANCE_STAFF','DIRECTOR'].includes(session?.user?.role)}
            fetchProject={fetchProject}
          />
        )}

        {/* TAB: Info — client brief */}
        {activeTab === 'info' && (
          <ClientBriefSection project={project} setProject={setProject} isManager={isManager} fetchProject={fetchProject} />
        )}

      </main>
    </div>
  )
}

function ClientBriefSection({ project, isManager, fetchProject }) {
  const [rows, setRows] = useState(project.briefItems?.length ? project.briefItems.map(b => ({ question: b.question, answer: b.answer || '' })) : [])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRows(project.briefItems?.length ? project.briefItems.map(b => ({ question: b.question, answer: b.answer || '' })) : [])
  }, [project.briefItems])

  function loadTemplate() {
    const template = CLIENT_BRIEF_TEMPLATES[project.division] || CLIENT_BRIEF_TEMPLATES.EVENT
    setRows(template.map(q => ({ question: q, answer: '' })))
    setEditing(true)
  }

  function addRow() {
    setRows(r => [...r, { question: '', answer: '' }])
  }

  function removeRow(i) {
    setRows(r => r.filter((_, idx) => idx !== i))
  }

  function updateRow(i, field, value) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  async function save() {
    setSaving(true)
    const items = rows.filter(r => r.question.trim() !== '')
    await fetch(`/api/projects/${project.id}/brief`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setSaving(false)
    setEditing(false)
    fetchProject()
  }

  return (
    <div className="card p-5 space-y-3 border-t-4 border-sky-400">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-bold text-gray-900">Brief Klien</p>
          <p className="text-xs text-gray-500">Dokumentasi kebutuhan klien — bisa ditambah/hapus barisnya sesuai kebutuhan project.</p>
        </div>
        {isManager && !editing && (
          <div className="flex items-center gap-2">
            {rows.length === 0 && (
              <button onClick={loadTemplate} className="text-xs text-brand-600 hover:underline font-medium">Pakai template {project.division === 'PH' ? 'Production House' : 'Event Organizer'}</button>
            )}
            <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline font-medium">{rows.length === 0 ? 'Buat manual' : 'Edit'}</button>
          </div>
        )}
      </div>

      {rows.length === 0 && !editing && (
        <p className="text-sm text-gray-400">Belum ada brief klien untuk project ini.</p>
      )}

      {!editing && rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-2.5">
              <p className="text-xs font-semibold text-gray-700">{i + 1}. {r.question}</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{r.answer || <span className="text-gray-300">— belum diisi —</span>}</p>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="flex items-center gap-2 mb-2">
              <button onClick={loadTemplate} className="text-xs text-brand-600 hover:underline font-medium">Pakai template {project.division === 'PH' ? 'Production House' : 'Event Organizer'}</button>
            </div>
          )}
          {rows.map((r, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-400 mt-2 shrink-0">{i + 1}.</span>
                <textarea
                  className="input text-xs flex-1"
                  rows={1}
                  placeholder="Pertanyaan / poin brief"
                  value={r.question}
                  onChange={e => updateRow(i, 'question', e.target.value)}
                />
                <button onClick={() => removeRow(i)} className="text-xs text-red-400 hover:text-red-600 shrink-0 mt-2">Hapus</button>
              </div>
              <textarea
                className="input text-sm"
                rows={2}
                placeholder="Jawaban / hasil diskusi dengan klien"
                value={r.answer}
                onChange={e => updateRow(i, 'answer', e.target.value)}
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button onClick={addRow} className="text-xs text-brand-600 hover:underline font-medium">+ Tambah baris</button>
            <div className="flex-1" />
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:underline">Batal</button>
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// evaluationNote is stored as a JSON string with a shape depending on project status:
// DONE (menang):    { type: 'WIN', clientFeedback: string[], internalFeedback: string[], crewVendorTalent: string[] }
// FAILED (kalah):   { type: 'LOSE', loseReasons: string[], loseReasonOther: string, competitors: string }
// other statuses:   { type: 'FREE', note: string }
function parseEvaluationNote(raw, project) {
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.type) return parsed
    } catch {
      // legacy plain-text note — surface as a free-form note regardless of status
      return { type: 'FREE', note: raw }
    }
  }
  if (project.status === 'DONE' || project.pitchResult === 'WIN') return { type: 'WIN', clientFeedback: [''], internalFeedback: [''], crewVendorTalent: [''] }
  if (project.status === 'FAILED' || project.pitchResult === 'LOSE') return { type: 'LOSE', loseReasons: [], loseReasonOther: '', competitors: '' }
  return { type: 'FREE', note: '' }
}

function MultiFieldList({ label, items, onChange, placeholder }) {
  return (
    <div>
      <p className="text-xs text-gray-600 font-medium mb-1">{label}</p>
      <div className="space-y-1.5">
        {items.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input text-sm flex-1"
              value={v}
              placeholder={placeholder}
              onChange={e => onChange(items.map((x, j) => j === i ? e.target.value : x))}
            />
            {items.length > 1 && (
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline">Hapus</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, ''])} className="text-xs text-brand-600 hover:underline mt-1">+ Tambah poin</button>
    </div>
  )
}

function EvaluationNote({ project, setProject }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => parseEvaluationNote(project.evaluationNote, project))
  const [saving, setSaving] = useState(false)

  const STATUS_HINT = {
    FAILED: 'Dokumentasikan alasan kalah dan kompetitor yang ikut serta, sebagai learning points untuk pitching berikutnya.',
    DONE: 'Dokumentasikan evaluasi dari klien, internal, dan crew/vendor/talent sebagai learning points project ini.',
    HOLD: 'Catatan evaluasi project ini untuk referensi ke depan.',
    CANCELED: 'Catatan evaluasi mengapa project ini dibatalkan.',
  }
  const hint = STATUS_HINT[project.status] || 'Learning points untuk didokumentasikan tim, untuk referensi project ke depan.'

  function startEdit() {
    setDraft(parseEvaluationNote(project.evaluationNote, project))
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    // Drop empty trailing entries before saving
    const clean = { ...draft }
    if (clean.clientFeedback) clean.clientFeedback = clean.clientFeedback.filter(v => v.trim())
    if (clean.internalFeedback) clean.internalFeedback = clean.internalFeedback.filter(v => v.trim())
    if (clean.crewVendorTalent) clean.crewVendorTalent = clean.crewVendorTalent.filter(v => v.trim())
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluationNote: JSON.stringify(clean) }),
    })
    setSaving(false)
    if (res.ok) {
      setProject(p => ({ ...p, evaluationNote: JSON.stringify(clean) }))
      setEditing(false)
    }
  }

  const view = parseEvaluationNote(project.evaluationNote, project)
  const hasContent = project.evaluationNote && (
    (view.clientFeedback?.some(v => v.trim())) ||
    (view.internalFeedback?.some(v => v.trim())) ||
    (view.crewVendorTalent?.some(v => v.trim())) ||
    (view.loseReasons?.length) || view.loseReasonOther?.trim() || view.competitors?.trim() ||
    view.note?.trim()
  )

  return (
    <div className="pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">Catatan Evaluasi Tim</p>
        {!editing && (
          <button onClick={startEdit} className="text-xs text-brand-600 hover:underline">
            {hasContent ? 'Edit' : 'Tambah catatan'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      {editing ? (
        <div className="space-y-3">
          {draft.type === 'WIN' && (
            <>
              <MultiFieldList label="Evaluasi dari Klien" items={draft.clientFeedback} placeholder="cth. Klien puas dengan eksekusi venue"
                onChange={v => setDraft(d => ({ ...d, clientFeedback: v }))} />
              <MultiFieldList label="Evaluasi Internal" items={draft.internalFeedback} placeholder="cth. Koordinasi tim H-1 perlu diperbaiki"
                onChange={v => setDraft(d => ({ ...d, internalFeedback: v }))} />
              <MultiFieldList label="Evaluasi Crew, Vendor & Talent" items={draft.crewVendorTalent} placeholder="cth. Vendor sound: responsif & on-time"
                onChange={v => setDraft(d => ({ ...d, crewVendorTalent: v }))} />
            </>
          )}
          {draft.type === 'LOSE' && (
            <>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Alasan Kalah</p>
                <div className="space-y-1.5">
                  {LOSE_REASON_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draft.loseReasons.includes(opt)}
                        onChange={e => setDraft(d => ({
                          ...d,
                          loseReasons: e.target.checked ? [...d.loseReasons, opt] : d.loseReasons.filter(r => r !== opt),
                        }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                <input
                  className="input text-sm w-full mt-2"
                  placeholder="Alasan lain (opsional, isi manual)"
                  value={draft.loseReasonOther}
                  onChange={e => setDraft(d => ({ ...d, loseReasonOther: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Kompetitor yang Menang & Turut Serta</p>
                <input
                  className="input text-sm w-full"
                  placeholder="cth. PT Kompetitor A (menang), PT Kompetitor B"
                  value={draft.competitors}
                  onChange={e => setDraft(d => ({ ...d, competitors: e.target.value }))}
                />
              </div>
            </>
          )}
          {draft.type === 'FREE' && (
            <textarea className="input text-sm w-full" rows={4} value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} placeholder={hint} />
          )}
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline">Batal</button>
          </div>
        </div>
      ) : !hasContent ? (
        <p className="text-sm text-gray-400">Belum ada catatan evaluasi.</p>
      ) : view.type === 'WIN' ? (
        <div className="space-y-2 text-sm text-gray-700">
          {view.clientFeedback?.some(v => v.trim()) && (
            <div>
              <p className="font-medium text-gray-600">Evaluasi dari Klien</p>
              <ul className="list-disc list-inside">{view.clientFeedback.filter(v => v.trim()).map((v, i) => <li key={i}>{v}</li>)}</ul>
            </div>
          )}
          {view.internalFeedback?.some(v => v.trim()) && (
            <div>
              <p className="font-medium text-gray-600">Evaluasi Internal</p>
              <ul className="list-disc list-inside">{view.internalFeedback.filter(v => v.trim()).map((v, i) => <li key={i}>{v}</li>)}</ul>
            </div>
          )}
          {view.crewVendorTalent?.some(v => v.trim()) && (
            <div>
              <p className="font-medium text-gray-600">Evaluasi Crew, Vendor & Talent</p>
              <ul className="list-disc list-inside">{view.crewVendorTalent.filter(v => v.trim()).map((v, i) => <li key={i}>{v}</li>)}</ul>
            </div>
          )}
        </div>
      ) : view.type === 'LOSE' ? (
        <div className="space-y-2 text-sm text-gray-700">
          {(view.loseReasons?.length > 0 || view.loseReasonOther?.trim()) && (
            <div>
              <p className="font-medium text-gray-600">Alasan Kalah</p>
              <ul className="list-disc list-inside">
                {view.loseReasons?.map(r => <li key={r}>{r}</li>)}
                {view.loseReasonOther?.trim() && <li>{view.loseReasonOther}</li>}
              </ul>
            </div>
          )}
          {view.competitors?.trim() && (
            <div>
              <p className="font-medium text-gray-600">Kompetitor yang Menang & Turut Serta</p>
              <p>{view.competitors}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{view.note}</p>
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

// ── Quotation & Invoice tracking section (editable, shown in Info tab) ────────
// Shows the legacy quotation/invoice numbers from pre-system data,
// and lets Finance/Manager update them + fix pitchResult for DONE projects.
function QuotationInvoiceInfoSection({ project, isManager, canFinance, fetchProject }) {
  const canEdit = isManager || canFinance
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({
    pitchResult:     project.pitchResult     || '',
    quotationNumber: project.quotationNumber || '',
    invoiceNumber:   project.invoiceNumber   || '',
    projectValue:    project.projectValue    != null ? String(project.projectValue) : '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pitchResult:     form.pitchResult     || null,
        quotationNumber: form.quotationNumber  || null,
        invoiceNumber:   form.invoiceNumber    || null,
        projectValue:    form.projectValue ? parseFloat(form.projectValue) : null,
      }),
    })
    setSaving(false)
    if (res.ok) { setEditing(false); fetchProject() }
    else alert('Gagal menyimpan')
  }

  return (
    <div className="card p-5 border-t-4 border-amber-400 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Data Quotation & Invoice</p>
          <p className="text-xs text-gray-400 mt-0.5">Nomor quotation dan invoice dari sistem lama / sebelum launching</p>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-brand hover:underline">✏ Edit</button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400">Hasil Pitch</p>
            <p className={`text-sm font-semibold mt-0.5 ${
              project.pitchResult === 'WIN'  ? 'text-green-600' :
              project.pitchResult === 'LOSE' ? 'text-red-500'   : 'text-gray-500'
            }`}>
              {project.pitchResult === 'WIN' ? '✓ Menang' : project.pitchResult === 'LOSE' ? '✗ Kalah' : project.pitchResult || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Nilai Project</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {project.projectValue ? 'Rp ' + Math.round(project.projectValue).toLocaleString('id-ID') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">No. Quotation</p>
            <p className="text-sm font-mono text-gray-700 mt-0.5">{project.quotationNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">No. Invoice</p>
            <p className={`text-sm font-mono mt-0.5 ${project.invoiceNumber ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
              {project.invoiceNumber || '— belum ada'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Hasil Pitch</label>
              <select className="select" value={form.pitchResult} onChange={e => setForm(f => ({ ...f, pitchResult: e.target.value }))}>
                <option value="">— Belum ada —</option>
                <option value="WIN">✓ Menang (WIN)</option>
                <option value="LOSE">✗ Kalah (LOSE)</option>
                <option value="NOT_FINAL">Belum final</option>
              </select>
            </div>
            <div>
              <label className="label">Nilai Project (Rp)</label>
              <input type="number" className="input" value={form.projectValue}
                onChange={e => setForm(f => ({ ...f, projectValue: e.target.value }))}
                placeholder="0" />
            </div>
            <div>
              <label className="label">No. Quotation</label>
              <input className="input font-mono text-sm" value={form.quotationNumber}
                onChange={e => setForm(f => ({ ...f, quotationNumber: e.target.value }))}
                placeholder="WTM/EO/QUOT/2026/073" />
            </div>
            <div>
              <label className="label">
                No. Invoice
                <span className="ml-1 text-[11px] text-amber-600 font-medium">← isi ini = sudah diinvoice sebelum launching</span>
              </label>
              <input className="input font-mono text-sm" value={form.invoiceNumber}
                onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="WTM/EO/INV/2026/073" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Batal</button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
