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

function TaskRow({ item, onSave }) {
  const [status, setStatus] = useState(item.latestUpdate?.status || (item.hasTodayUpdate ? item.latestUpdate?.status : ''))
  const [note, setNote] = useState(item.hasTodayUpdate ? (item.latestUpdate?.note || '') : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!status) { setError('Pilih status progress dulu'); return }
    if (NOTE_REQUIRED.includes(status) && !note.trim()) {
      setError('Isi catatan alasan terlebih dahulu')
      return
    }
    setError('')
    setSaving(true)
    await onSave(item, status, note)
    setSaving(false)
  }

  return (
    <div className={clsx('card p-4 border-l-4', item.hasTodayUpdate ? 'border-l-green-400' : 'border-l-gray-200')}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-medium text-ink-800">{item.title}</p>
          {item.project && (
            <Link href={`/projects/${item.project.id}`} className="text-xs text-brand-600 hover:underline">
              {item.project.code} · {item.project.name}
            </Link>
          )}
          {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
          {item.dueDate && (
            <p className="text-xs text-gray-400 mt-0.5">Deadline: {new Date(item.dueDate).toLocaleDateString('id-ID')}</p>
          )}
        </div>
        {item.hasTodayUpdate && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 whitespace-nowrap">
            Sudah update hari ini
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatus(opt.value)}
            className={clsx(
              'text-xs px-3 py-1.5 rounded-full border transition',
              status === opt.value ? opt.color + ' font-semibold' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {(NOTE_REQUIRED.includes(status)) && (
        <textarea
          className="input text-sm mb-2"
          rows={2}
          placeholder="Wajib: jelaskan alasan progress delayed / hold / bermasalah..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      )}
      {!NOTE_REQUIRED.includes(status) && (
        <textarea
          className="input text-sm mb-2"
          rows={2}
          placeholder="Catatan tambahan (opsional)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      )}

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex items-center justify-between">
        {item.latestUpdate && (
          <p className="text-xs text-gray-400">
            Update terakhir: <span className={clsx('px-1.5 py-0.5 rounded text-[11px] border', STATUS_COLOR[item.latestUpdate.status])}>{STATUS_LABEL[item.latestUpdate.status]}</span>
            {' '}({new Date(item.latestUpdate.date).toLocaleDateString('id-ID')})
          </p>
        )}
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-1.5 ml-auto">
          {saving ? 'Menyimpan...' : 'Simpan Update'}
        </button>
      </div>
    </div>
  )
}

export default function MyTasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const load = useCallback(() => {
    fetch('/api/my-tasks').then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d); setLoading(false) })
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
      const err = await res.json()
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
      body: JSON.stringify({ title: newTitle, dueDate: newDue || null }),
    })
    if (res.ok) {
      setNewTitle('')
      setNewDue('')
      load()
    }
    setAdding(false)
  }

  async function removePersonalTask(id) {
    if (!confirm('Hapus item ini?')) return
    await fetch(`/api/my-tasks/personal/${id}`, { method: 'DELETE' })
    load()
  }

  if (status !== 'authenticated' || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>
        </main>
      </div>
    )
  }

  const projectTasks = data.items.filter(i => i.kind === 'task')
  const personalTasks = data.items.filter(i => i.kind === 'personal')
  const pendingToday = data.items.filter(i => !i.hasTodayUpdate)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tugas Saya</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update progress setiap malam, paling lambat pukul 20:00. Keterlambatan update atau progress yang
            tersendat (Delayed / Hold / Bermasalah) tanpa catatan yang jelas akan mengurangi poin kinerja bulanan
            dan menjadi catatan di management.
          </p>
        </div>

        {data.deadlinePassed && pendingToday.length > 0 && (
          <div className="card p-4 border-l-4 border-l-red-400 bg-red-50">
            <p className="text-sm font-semibold text-red-700">
              ⏰ Sudah lewat jam 20:00 dan ada {pendingToday.length} item yang belum di-update hari ini.
            </p>
            <p className="text-xs text-red-600 mt-1">Segera isi update progress di bawah agar tidak mengurangi poin kinerja bulanan.</p>
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
          <form onSubmit={addPersonalTask} className="card p-4 flex flex-col sm:flex-row gap-2">
            <input className="input flex-1" placeholder="Tambah item baru..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <input type="date" className="input sm:w-44" value={newDue} onChange={e => setNewDue(e.target.value)} />
            <button className="btn-primary px-4" disabled={adding}>Tambah</button>
          </form>
          {personalTasks.map(item => (
            <div key={item.id} className="relative">
              <TaskRow item={item} onSave={saveProgress} />
              <button
                onClick={() => removePersonalTask(item.id)}
                className="absolute top-3 right-3 text-xs text-gray-300 hover:text-red-500"
                title="Hapus"
              >
                ✕
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
