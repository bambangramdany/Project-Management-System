'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import clsx from 'clsx'

const STATUS_OPTIONS = [
  { value: 'ON_TRACK', label: 'On Track', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'DELAYED', label: 'Delayed', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'HOLD', label: 'Hold', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'PROBLEM', label: 'Bermasalah', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'DONE', label: 'Selesai', color: 'bg-sky-100 text-sky-700 border-sky-300' },
]

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s.label]))
const STATUS_COLOR = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s.color]))
const NOTE_REQUIRED = ['DELAYED', 'HOLD', 'PROBLEM']

const DIV_COLOR = {
  EVENT:        { border: 'border-t-blue-400',   badge: 'bg-blue-100 text-blue-700',   icon: '🎪' },
  CREATIVE:     { border: 'border-t-violet-400',  badge: 'bg-violet-100 text-violet-700', icon: '🎨' },
  PH:           { border: 'border-t-amber-400',  badge: 'bg-amber-100 text-amber-700', icon: '🎬' },
  FINANCE_HRGA: { border: 'border-t-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: '💼' },
}

// ── TaskRow: kartu update progress ──────────────────────────────────────────
function TaskRow({ item, onSave, readOnly = false }) {
  const [statusVal, setStatusVal] = useState(item.latestUpdate?.status || '')
  const [note, setNote] = useState(item.hasTodayUpdate ? (item.latestUpdate?.note || '') : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!statusVal) { setError('Pilih status progress dulu'); return }
    if (NOTE_REQUIRED.includes(statusVal) && !note.trim()) {
      setError('Isi catatan alasan terlebih dahulu'); return
    }
    setError('')
    setSaving(true)
    await onSave(item, statusVal, note)
    setSaving(false)
  }

  return (
    <div className={clsx('card p-4 border-l-4', item.hasTodayUpdate ? 'border-l-green-400' : 'border-l-gray-200')}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          {/* Nama anggota (tampil di view direktur) */}
          {item.assignee && (
            <p className="text-xs font-semibold text-brand-600 mb-0.5">
              👤 {item.assignee.name}
            </p>
          )}
          <p className="font-medium text-ink-800">{item.title}</p>
          {item.project ? (
            <Link href={`/projects/${item.project.id}`} className="text-xs text-brand-600 hover:underline">
              {item.project.code} · {item.project.name}{item.clientName ? ` (${item.clientName})` : ''}
            </Link>
          ) : (item.clientName || item.projectName) ? (
            <p className="text-xs text-gray-500">{[item.clientName, item.projectName].filter(Boolean).join(' · ')}</p>
          ) : null}
          {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
          {item.dueDate && (
            <p className="text-xs text-gray-400 mt-0.5">Deadline: {new Date(item.dueDate).toLocaleDateString('id-ID')}</p>
          )}
        </div>
        {item.hasTodayUpdate && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 whitespace-nowrap shrink-0">
            ✓ Update hari ini
          </span>
        )}
      </div>

      {/* Status update — hidden di read-only (view direktur per task orang lain) */}
      {!readOnly && (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusVal(opt.value)}
                className={clsx(
                  'text-xs px-3 py-1.5 rounded-full border transition',
                  statusVal === opt.value ? opt.color + ' font-semibold' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            className="input text-sm mb-2"
            rows={2}
            placeholder={NOTE_REQUIRED.includes(statusVal) ? 'Wajib: jelaskan alasan...' : 'Catatan tambahan (opsional)'}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            {item.latestUpdate ? (
              <p className="text-xs text-gray-400">
                Update terakhir:{' '}
                <span className={clsx('px-1.5 py-0.5 rounded text-[11px] border', STATUS_COLOR[item.latestUpdate.status])}>
                  {STATUS_LABEL[item.latestUpdate.status]}
                </span>{' '}
                ({new Date(item.latestUpdate.date).toLocaleDateString('id-ID')})
              </p>
            ) : <span />}
            <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-1.5">
              {saving ? 'Menyimpan...' : 'Simpan Update'}
            </button>
          </div>
        </>
      )}

      {/* Read-only: hanya tampilkan status terakhir */}
      {readOnly && item.latestUpdate && (
        <p className="text-xs text-gray-500 mt-1">
          Status:{' '}
          <span className={clsx('px-1.5 py-0.5 rounded text-[11px] border', STATUS_COLOR[item.latestUpdate.status])}>
            {STATUS_LABEL[item.latestUpdate.status]}
          </span>{' '}
          · {new Date(item.latestUpdate.date).toLocaleDateString('id-ID')}
          {item.latestUpdate.note && <span className="ml-2 text-gray-400">"{item.latestUpdate.note}"</span>}
        </p>
      )}
      {readOnly && !item.latestUpdate && (
        <p className="text-xs text-gray-400 mt-1 italic">Belum ada update</p>
      )}
    </div>
  )
}

// ── DivisionGroup: section collapsible per divisi (view direktur) ────────────
function DivisionGroup({ group, onSave }) {
  const [open, setOpen] = useState(true)
  const style = DIV_COLOR[group.divisi] || DIV_COLOR.EVENT
  const doneCount = group.items.filter(i => i.hasTodayUpdate).length
  const totalCount = group.items.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className={clsx('card border-t-4 overflow-hidden', style.border)}>
      {/* Header — klik untuk expand/collapse */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{style.icon}</span>
          <div>
            <p className="font-semibold text-gray-800">{group.label}</p>
            <p className="text-xs text-gray-500">{totalCount} tugas aktif</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Progress bar update hari ini */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <p className="text-xs text-gray-500">{doneCount}/{totalCount} update hari ini</p>
            <div className="w-28 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all', pct === 100 ? 'bg-green-400' : pct > 50 ? 'bg-amber-400' : 'bg-red-400')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', style.badge)}>
            {pct}%
          </span>
          <span className={`text-gray-400 transition-transform duration-200 text-lg ${open ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </button>

      {/* Items */}
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-3 pt-4">
          {group.items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Tidak ada tugas aktif di divisi ini.</p>
          )}
          {group.items.map(item => (
            <TaskRow key={`${item.kind}-${item.id}`} item={item} onSave={onSave} readOnly={true} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newProjectId, setNewProjectId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/my-tasks').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setData(d)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, load])

  async function saveProgress(item, statusVal, note) {
    const payload = { status: statusVal, note }
    if (item.kind === 'task') payload.taskId = item.id
    else payload.personalTaskId = item.id
    const res = await fetch('/api/my-tasks/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) load()
    else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Gagal menyimpan')
    }
  }

  async function addPersonalTask(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/my-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        dueDate: newDue || null,
        projectId: newProjectId || null,
        clientName: newProjectId ? null : (newClientName || null),
        projectName: newProjectId ? null : (newProjectName || null),
      }),
    })
    if (res.ok) {
      setNewTitle(''); setNewDue(''); setNewProjectId(''); setNewClientName(''); setNewProjectName('')
      load()
    }
    setAdding(false)
  }

  async function removePersonalTask(id) {
    await fetch(`/api/my-tasks/personal/${id}`, { method: 'DELETE' })
    setConfirmDeleteId(null)
    load()
  }

  if (status !== 'authenticated' || loading || !data) {
    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>
        </main>
      </div>
    )
  }

  // ── DIRECTOR / OWNER VIEW ──────────────────────────────────────────────────
  if (data.mode === 'director') {
    const allItems = data.groups.flatMap(g => g.items)
    const totalPending = allItems.filter(i => !i.hasTodayUpdate).length
    const totalDone = allItems.filter(i => i.hasTodayUpdate).length

    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tugas Tim</h1>
              <p className="text-sm text-gray-500 mt-1">
                Semua tugas aktif seluruh tim — dikelompokkan per divisi
              </p>
            </div>
            <div className="flex gap-3">
              <div className="card px-4 py-2 text-center">
                <p className="text-lg font-bold text-green-600">{totalDone}</p>
                <p className="text-xs text-gray-500">Update hari ini</p>
              </div>
              <div className="card px-4 py-2 text-center">
                <p className="text-lg font-bold text-red-500">{totalPending}</p>
                <p className="text-xs text-gray-500">Belum update</p>
              </div>
            </div>
          </div>

          {data.deadlinePassed && totalPending > 0 && (
            <div className="card p-4 border-l-4 border-l-red-400 bg-red-50">
              <p className="text-sm font-semibold text-red-700">
                ⏰ Sudah lewat jam 20:00 — {totalPending} tugas belum di-update hari ini.
              </p>
            </div>
          )}

          {data.groups.length === 0 && (
            <div className="card p-8 text-center text-gray-400">Tidak ada tugas aktif di seluruh tim.</div>
          )}

          {data.groups.map(group => (
            <DivisionGroup key={group.divisi} group={group} onSave={saveProgress} />
          ))}
        </main>
      </div>
    )
  }

  // ── PERSONAL VIEW (user biasa) ─────────────────────────────────────────────
  const projectTasks = data.items.filter(i => i.kind === 'task')
  const personalTasks = data.items.filter(i => i.kind === 'personal')
  const pendingToday = data.items.filter(i => !i.hasTodayUpdate)

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tugas Saya</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update progress setiap malam, paling lambat pukul 20:00. Keterlambatan update atau progress yang
            tersendat tanpa catatan yang jelas akan mengurangi poin kinerja bulanan.
          </p>
        </div>

        {data.deadlinePassed && pendingToday.length > 0 && (
          <div className="card p-4 border-l-4 border-l-red-400 bg-red-50">
            <p className="text-sm font-semibold text-red-700">
              ⏰ Sudah lewat jam 20:00 dan ada {pendingToday.length} item yang belum di-update hari ini.
            </p>
            <p className="text-xs text-red-600 mt-1">Segera isi update progress agar tidak mengurangi poin kinerja bulanan.</p>
          </div>
        )}
        {!data.deadlinePassed && pendingToday.length > 0 && (
          <div className="card p-4 border-l-4 border-l-amber-400 bg-amber-50">
            <p className="text-sm font-semibold text-amber-700">
              {pendingToday.length} item belum di-update hari ini — pastikan diisi sebelum pukul 20:00.
            </p>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-800">Task Project ({projectTasks.length})</h2>
          {projectTasks.length === 0 && <p className="text-sm text-gray-400">Tidak ada task project yang aktif.</p>}
          {projectTasks.map(item => (
            <TaskRow key={item.id} item={item} onSave={saveProgress} />
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-800">Catatan / To-Do Manual ({personalTasks.length})</h2>
          <form onSubmit={addPersonalTask} className="card p-4 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="input flex-1" placeholder="Tambah item baru..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <input type="date" className="input sm:w-44" value={newDue} onChange={e => setNewDue(e.target.value)} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select className="select flex-1" value={newProjectId} onChange={e => { setNewProjectId(e.target.value); if (e.target.value) { setNewClientName(''); setNewProjectName('') } }}>
                <option value="">Pilih project yang sudah ada (opsional)...</option>
                {(data.projectOptions || []).map(p => (
                  <option key={p.id} value={p.id}>{p.code} · {p.name}{p.clientName ? ` (${p.clientName})` : ''}</option>
                ))}
              </select>
            </div>
            {!newProjectId && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input className="input flex-1" placeholder="Nama klien (jika project baru / di luar sistem)" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                <input className="input flex-1" placeholder="Nama project (jika project baru / di luar sistem)" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
              </div>
            )}
            <button className="btn-primary px-4" disabled={adding}>Tambah</button>
          </form>
          {personalTasks.map(item => (
            <div key={item.id} className="relative">
              <TaskRow item={item} onSave={saveProgress} />
              {confirmDeleteId === item.id ? (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                  <span className="text-xs text-gray-500">Hapus?</span>
                  <button onClick={() => removePersonalTask(item.id)} className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white">Ya</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(item.id)}
                  className="absolute top-3 right-3 text-xs text-gray-300 hover:text-red-500"
                  title="Hapus"
                >✕</button>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
