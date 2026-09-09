'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { MySharingSessionCard, AllSharingSessionsTable } from '@/components/SharingSessionCard'
import EventDayBanner from '@/components/EventDayBanner'
import PersonalStatsWidget from '@/components/PersonalStatsWidget'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'ON_TRACK',  label: 'Berjalan',   color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  { value: 'DELAYED',   label: 'Terlambat',  color: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  { value: 'HOLD',      label: 'Hold',       color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  { value: 'PROBLEM',   label: 'Bermasalah', color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
  { value: 'DONE',      label: 'Selesai',    color: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300' },
]
const STATUS_MAP  = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]))
const NOTE_REQUIRED = ['DELAYED', 'HOLD', 'PROBLEM']

const DIV_STYLE = {
  EVENT:        { gradient: 'from-blue-500 to-blue-600',      abbr: 'EO' },
  CREATIVE:     { gradient: 'from-violet-500 to-violet-600',  abbr: 'CR' },
  PH:           { gradient: 'from-amber-500 to-amber-600',    abbr: 'PH' },
  FINANCE_HRGA: { gradient: 'from-emerald-500 to-emerald-600', abbr: 'FN' },
}

function fmtDate(d) {
  if (!d) return null
  const dt = new Date(d)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.floor((dt - today) / 86400000)
  if (diff < 0) return { label: `Terlambat ${Math.abs(diff)} hari`, urgent: true }
  if (diff === 0) return { label: 'Deadline hari ini', urgent: true }
  if (diff === 1) return { label: 'Besok', urgent: false }
  return { label: dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), urgent: false }
}

// ── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ done, total }) {
  const pct = total > 0 ? done / total : 0
  const r = 28, circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct === 1 ? '#22c55e' : pct > 0.5 ? '#f59e0b' : '#6366f1'

  return (
    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-bold text-gray-800 leading-none">{done}</p>
        <p className="text-[10px] text-gray-400">/{total}</p>
      </div>
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ item, onSave, readOnly = false, onDelete }) {
  const [statusVal, setStatusVal] = useState(item.latestUpdate?.status || '')
  const [note, setNote] = useState(item.hasTodayUpdate ? (item.latestUpdate?.note || '') : '')
  const [showNote, setShowNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const currentStatus = STATUS_MAP[statusVal]
  const lastStatus    = STATUS_MAP[item.latestUpdate?.status]
  const dateInfo = fmtDate(item.dueDate)
  const needNote = NOTE_REQUIRED.includes(statusVal)

  useEffect(() => {
    if (NOTE_REQUIRED.includes(statusVal)) setShowNote(true)
  }, [statusVal])

  async function save() {
    if (!statusVal) { setError('Pilih status dulu'); return }
    if (needNote && !note.trim()) { setError('Isi catatan alasan'); return }
    setError(''); setSaving(true)
    await onSave(item, statusVal, note)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (readOnly) {
    return (
      <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors">
        <div className="flex-1 min-w-0">
          {item.assignee && <p className="text-[11px] font-semibold text-violet-600 mb-0.5">{item.assignee.name}</p>}
          <p className="text-sm font-medium text-gray-900 leading-tight">{item.title}</p>
          {item.project && (
            <Link href={`/projects/${item.project.id}`} className="text-[11px] text-violet-500 hover:underline">
              {item.project.code} · {item.project.name}
            </Link>
          )}
        </div>
        {lastStatus ? (
          <span className={`text-[11px] px-2 py-1 rounded-lg font-semibold shrink-0 ${lastStatus.bg} ${lastStatus.text} border ${lastStatus.border}`}>
            {lastStatus.label}
          </span>
        ) : (
          <span className="text-[11px] px-2 py-1 rounded-lg font-semibold shrink-0 bg-gray-100 text-gray-400">Belum ada update</span>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
      saved ? 'border-green-400 bg-green-50/30' :
      item.hasTodayUpdate ? 'border-green-200 bg-white' :
      dateInfo?.urgent ? 'border-red-200 bg-red-50/20' :
      'border-gray-100 bg-white'
    }`}>
      {/* Card header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 leading-tight">{item.title}</p>
            {item.project ? (
              <Link href={`/projects/${item.project.id}`} className="text-xs text-violet-500 hover:underline mt-0.5 block">
                {item.project.code} · {item.project.name}
                {item.clientName ? ` · ${item.clientName}` : ''}
              </Link>
            ) : (item.clientName || item.projectName) ? (
              <p className="text-xs text-gray-400 mt-0.5">{[item.clientName, item.projectName].filter(Boolean).join(' · ')}</p>
            ) : null}
            {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.hasTodayUpdate && !saved && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">✓ Updated</span>
            )}
            {saved && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">Tersimpan</span>
            )}
            {dateInfo && (
              <span className={`text-[11px] font-semibold ${dateInfo.urgent ? 'text-red-500' : 'text-gray-400'}`}>
                {dateInfo.urgent ? '⚠ ' : ''}{dateInfo.label}
              </span>
            )}
            {onDelete && !confirmDel && (
              <button onClick={() => setConfirmDel(true)} className="text-[11px] text-gray-300 hover:text-red-400 mt-1">✕</button>
            )}
            {confirmDel && (
              <div className="flex gap-1 mt-1">
                <button onClick={() => onDelete(item.id)} className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded">Hapus</button>
                <button onClick={() => setConfirmDel(false)} className="text-[10px] text-gray-400">Batal</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status chips */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setStatusVal(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold border-2 transition-all duration-150 active:scale-95 ${
                statusVal === opt.value
                  ? `${opt.bg} ${opt.text} ${opt.border} shadow-sm scale-105`
                  : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note field — shown for NOTE_REQUIRED statuses or if manually toggled */}
      {(showNote || needNote) && (
        <div className="px-4 pb-2">
          <textarea
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none placeholder-gray-300"
            rows={2}
            placeholder={needNote ? '⚠ Wajib — jelaskan alasannya...' : 'Catatan tambahan (opsional)...'}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      )}

      {/* Footer: prev update + action */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!showNote && !needNote && (
            <button onClick={() => setShowNote(v => !v)}
              className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
              ✏ Catatan
            </button>
          )}
          {lastStatus && (
            <span className="text-[11px] text-gray-400 hidden sm:block">
              Sebelumnya: <span className={`font-semibold ${lastStatus.text}`}>{lastStatus.label}</span>
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
        <button onClick={save} disabled={saving || !statusVal}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 ${
            !statusVal ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
            saving ? 'bg-violet-400 text-white' :
            'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200'
          }`}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

// ── CheckInCard ───────────────────────────────────────────────────────────────

function CheckInCard({ checkIn, onMorningAck, onEveningSubmit }) {
  const [eveningNote, setEveningNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!checkIn?.eveningAt)

  const hasMorning = !!checkIn?.morningAckAt
  const hasEvening = !!checkIn?.eveningAt || submitted
  const showEvening = checkIn?.showEveningForm
  const isOverdue   = checkIn?.eveningOverdue

  async function submitEvening(e) {
    e.preventDefault()
    if (!eveningNote.trim()) return
    setSubmitting(true)
    await onEveningSubmit(eveningNote)
    setSubmitted(true); setSubmitting(false)
  }

  if (!checkIn) return null

  return (
    <div className="space-y-2">
      {!hasMorning ? (
        <div className="rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 p-4 flex items-center justify-between gap-4 shadow-lg shadow-red-100">
          <div>
            <p className="font-bold text-white text-sm">Belum check-in pagi!</p>
            <p className="text-xs text-red-100 mt-0.5">Konfirmasi kamu sudah lihat tugas hari ini (batas 09:30)</p>
          </div>
          <button onClick={onMorningAck}
            className="shrink-0 px-4 py-2 rounded-xl bg-white text-red-600 text-sm font-bold hover:bg-red-50 transition-colors active:scale-95">
            ✓ Sudah Cek
          </button>
        </div>
      ) : !showEvening ? (
        <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-2.5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <p className="text-sm text-green-700 font-semibold">
            Check-in pagi tercatat — {new Date(checkIn.morningAckAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
          </p>
        </div>
      ) : null}

      {showEvening && (
        hasEvening ? (
          <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <p className="text-sm text-blue-700 font-semibold">Laporan sore sudah dikirim {checkIn.eveningAt ? `· ${new Date(checkIn.eveningAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : ''}</p>
          </div>
        ) : (
          <form onSubmit={submitEvening} className={`rounded-2xl border-2 p-4 space-y-3 ${isOverdue ? 'border-orange-300 bg-orange-50' : 'border-blue-200 bg-blue-50/50'}`}>
            <div>
              <p className={`font-bold text-sm ${isOverdue ? 'text-orange-700' : 'text-blue-700'}`}>
                {isOverdue ? 'Terlambat — laporan harus dikirim sebelum 20:00' : 'Laporan Progress Sore (17:00–20:00 WIB)'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Ceritakan apa yang sudah dikerjakan dan status setiap tugas</p>
            </div>
            <textarea value={eveningNote} onChange={e => setEveningNote(e.target.value)} rows={3}
              placeholder="Contoh: Sudah survey lokasi, sedang proses rundown target selesai besok pagi..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            <button type="submit" disabled={submitting || !eveningNote.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors active:scale-95">
              {submitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        )
      )}
    </div>
  )
}

// ── AddTaskForm ───────────────────────────────────────────────────────────────

function AddTaskForm({ projectOptions, onAdd }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [projectId, setProjectId] = useState('')
  const [adding, setAdding] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    await onAdd({ title, dueDate: due || null, projectId: projectId || null })
    setTitle(''); setDue(''); setProjectId(''); setOpen(false)
    setAdding(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-violet-200 text-violet-500 hover:bg-violet-50 hover:border-violet-400 transition-all font-medium text-sm">
      <span className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg leading-none">+</span>
      Tambah tugas personal
    </button>
  )

  return (
    <div className="rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-4 space-y-3">
      <p className="text-sm font-bold text-violet-700">Tugas Baru</p>
      <input className="input w-full" placeholder="Nama tugas..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <input type="date" className="input flex-1" value={due} onChange={e => setDue(e.target.value)} />
        <select className="select flex-1" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">Tanpa project</option>
          {(projectOptions || []).map(p => (
            <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1 py-2">Batal</button>
        <button onClick={submit} disabled={adding || !title.trim()} className="btn-primary flex-1 py-2">{adding ? 'Menyimpan...' : 'Tambah'}</button>
      </div>
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent = 'bg-gray-400', color = 'text-gray-700' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-1 h-4 rounded-full shrink-0 ${accent}`} />
      <span className={`text-sm font-bold ${color}`}>{label}</span>
      {count > 0 && (
        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-semibold">{count}</span>
      )}
    </div>
  )
}

// ── DivisionGroup (director view) ─────────────────────────────────────────────

function DivisionGroup({ group, onSave }) {
  const [open, setOpen] = useState(true)
  const style = DIV_STYLE[group.divisi] || DIV_STYLE.EVENT
  const doneCount  = group.items.filter(i => i.hasTodayUpdate).length
  const totalCount = group.items.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left bg-gradient-to-r ${style.gradient} hover:opacity-95 transition-opacity`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-xs shrink-0">{style.abbr}</div>
          <div>
            <p className="font-bold text-white text-sm">{group.label}</p>
            <p className="text-xs text-white/70">{totalCount} tugas aktif</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/80">{doneCount}/{totalCount} update hari ini</p>
            <div className="w-28 h-1.5 rounded-full bg-white/30 overflow-hidden mt-1">
              <div className={`h-full rounded-full bg-white transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-sm font-black text-white bg-white/20 px-2.5 py-1 rounded-full">{pct}%</span>
          <span className={`text-white text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </button>
      {open && (
        <div className="bg-white px-4 pb-4 space-y-2 pt-3">
          {group.items.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Tidak ada tugas aktif.</p>
            : group.items.map(item => (
                <TaskCard key={`${item.kind}-${item.id}`} item={item} onSave={onSave} readOnly={true} />
              ))
          }
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ title, count, defaultOpen = true, icon, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors">
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {count != null && <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{count}</span>}
        </div>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState(null)
  const [sharingSessions, setSharingSessions] = useState([])
  const [todayEvents, setTodayEvents] = useState([])

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
    if (status !== 'authenticated') return
    fetch('/api/daily-checkin').then(r => r.ok ? r.json() : null).then(d => { if (d) setCheckIn(d) })
    fetch('/api/sharing-sessions').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setSharingSessions(d) })
    fetch('/api/event-day').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setTodayEvents(d) })
    load()
  }, [status, load])

  async function handleMorningAck() {
    await fetch('/api/daily-checkin', { method: 'POST' })
    fetch('/api/daily-checkin').then(r => r.ok ? r.json() : null).then(d => { if (d) setCheckIn(d) })
  }

  async function handleEveningSubmit(note) {
    const res = await fetch('/api/daily-checkin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eveningNote: note }),
    })
    if (res.ok) { const d = await res.json(); setCheckIn(prev => ({ ...prev, today: d, eveningAt: d.eveningAt })) }
  }

  async function saveProgress(item, statusVal, note) {
    const payload = { status: statusVal, note }
    if (item.kind === 'task') payload.taskId = item.id
    else payload.personalTaskId = item.id
    const res = await fetch('/api/my-tasks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) load()
    else { const err = await res.json().catch(() => ({})); alert(err.error || 'Gagal menyimpan') }
  }

  async function addPersonalTask({ title, dueDate, projectId }) {
    const res = await fetch('/api/my-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueDate, projectId }),
    })
    if (res.ok) load()
  }

  async function removePersonalTask(id) {
    await fetch(`/api/my-tasks/personal/${id}`, { method: 'DELETE' })
    load()
  }

  if (status !== 'authenticated' || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </main>
      </div>
    )
  }

  // ── DIRECTOR VIEW ───────────────────────────────────────────────────────────
  if (data.mode === 'director') {
    const allItems   = data.groups.flatMap(g => g.items)
    const totalDone  = allItems.filter(i => i.hasTodayUpdate).length
    const totalItems = allItems.length
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Monitoring Tim</h1>
              <p className="text-sm text-gray-500 mt-0.5">Progress update seluruh tim hari ini</p>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing done={totalDone} total={totalItems} />
              <div>
                <p className="text-sm font-bold text-gray-800">{totalDone} selesai</p>
                <p className="text-xs text-gray-400">{totalItems - totalDone} belum update</p>
              </div>
            </div>
          </div>
          {data.deadlinePassed && (totalItems - totalDone) > 0 && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
              <p className="text-sm font-bold text-red-700">⏰ Sudah lewat jam 20:00 — {totalItems - totalDone} anggota belum update</p>
            </div>
          )}
          {data.groups.map(group => (
            <DivisionGroup key={group.divisi} group={group} onSave={saveProgress} />
          ))}
          {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
            <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
              <AllSharingSessionsTable sessions={sharingSessions} />
            </CollapsibleSection>
          )}
        </main>
      </div>
    )
  }

  // ── TEAM LEAD VIEW ──────────────────────────────────────────────────────────
  if (data.mode === 'team_lead') {
    const myItems      = data.myItems || []
    const teamItems    = data.groups.flatMap(g => g.items)
    const myDone       = myItems.filter(i => i.hasTodayUpdate).length
    const teamDone     = teamItems.filter(i => i.hasTodayUpdate).length
    const myPending    = myItems.filter(i => !i.hasTodayUpdate)
    const myProjectTasks  = myItems.filter(i => i.kind === 'task')
    const myPersonalTasks = myItems.filter(i => i.kind === 'personal')
    const mySharing = sharingSessions.filter(s => s.userId === session?.user?.id)

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-5 text-white shadow-lg shadow-violet-200">
            <p className="text-sm text-violet-200 font-medium">Halo, {session?.user?.name?.split(' ')[0]}</p>
            <p className="text-xs text-violet-300 mt-0.5">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-2xl font-black">{myDone}<span className="text-lg text-violet-300">/{myItems.length}</span></p>
                <p className="text-xs text-violet-200 mt-0.5">tugasmu sudah diupdate</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{teamDone}/{teamItems.length}</p>
                <p className="text-xs text-violet-200">tim sudah update</p>
              </div>
            </div>
            {myItems.length > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${myItems.length > 0 ? (myDone / myItems.length) * 100 : 0}%` }} />
              </div>
            )}
          </div>

          <CheckInCard checkIn={checkIn} onMorningAck={handleMorningAck} onEveningSubmit={handleEveningSubmit} />

          {mySharing.length > 0 && <MySharingSessionCard sessions={mySharing} onUpdate={() => fetch('/api/sharing-sessions').then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && setSharingSessions(d))} />}

          {todayEvents.length > 0 && (
            <EventDayBanner events={todayEvents} canManageRundown={true} />
          )}

          {/* Overdue alert */}
          {data.deadlinePassed && myPending.length > 0 && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
              <p className="text-sm font-bold text-red-700">⏰ Sudah lewat 20:00 — {myPending.length} tugasmu belum di-update</p>
            </div>
          )}

          {/* My tasks */}
          {myProjectTasks.length > 0 && (
            <div>
              <SectionHeader label="Task Project Saya" count={myProjectTasks.length} accent="bg-violet-400" />
              <div className="space-y-3">
                {myProjectTasks.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
              </div>
            </div>
          )}

          {/* Personal tasks */}
          <div>
            <SectionHeader label="Catatan & To-Do Saya" count={myPersonalTasks.length} accent="bg-gray-300" />
            <div className="space-y-3">
              {myPersonalTasks.map(item => (
                <TaskCard key={item.id} item={item} onSave={saveProgress}
                  onDelete={removePersonalTask} />
              ))}
              <AddTaskForm projectOptions={data.projectOptions} onAdd={addPersonalTask} />
            </div>
          </div>

          {/* Team sections */}
          {data.groups.length > 0 && (
            <div>
              <SectionHeader label="Update Tim" accent="bg-blue-400" />
              <div className="space-y-3">
                {data.groups.map(group => <DivisionGroup key={group.divisi} group={group} onSave={saveProgress} />)}
              </div>
            </div>
          )}

          {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
            <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
              <AllSharingSessionsTable sessions={sharingSessions} />
            </CollapsibleSection>
          )}
        </main>
      </div>
    )
  }

  // ── PERSONAL VIEW (operational staff) ──────────────────────────────────────
  const allItems    = data.items || []
  const projectTasks  = allItems.filter(i => i.kind === 'task')
  const personalTasks = allItems.filter(i => i.kind === 'personal')
  const doneToday   = allItems.filter(i => i.hasTodayUpdate).length
  const pendingCount = allItems.filter(i => !i.hasTodayUpdate).length
  const mySharing = sharingSessions.filter(s => s.userId === session?.user?.id)

  // Group project tasks by urgency
  const today = new Date(); today.setHours(0,0,0,0)
  const overdueTasks  = projectTasks.filter(t => !t.hasTodayUpdate && t.dueDate && new Date(t.dueDate) < today)
  const dueTodayTasks = projectTasks.filter(t => !t.hasTodayUpdate && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) === today.getTime())
  const ongoingTasks  = projectTasks.filter(t => !t.hasTodayUpdate && (!t.dueDate || new Date(t.dueDate) >= today) && !dueTodayTasks.includes(t))
  const updatedTasks  = projectTasks.filter(t => t.hasTodayUpdate)

  const pct = allItems.length > 0 ? Math.round((doneToday / allItems.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Hero header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-200/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-violet-200 font-medium">
                Halo, {session?.user?.name?.split(' ')[0]}
              </p>
              <p className="text-xs text-violet-300 mt-0.5">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-4">
                {pct === 100 ? (
                  <p className="text-lg font-black">Semua tugas sudah diupdate.</p>
                ) : pendingCount === 0 && allItems.length === 0 ? (
                  <p className="text-lg font-bold">Tidak ada tugas hari ini.</p>
                ) : (
                  <>
                    <p className="text-2xl font-black">{pendingCount} <span className="text-lg font-bold text-violet-200">tugas perlu update</span></p>
                    <p className="text-xs text-violet-300 mt-0.5">Update sebelum pukul 20:00 WIB</p>
                  </>
                )}
              </div>
            </div>
            <ProgressRing done={doneToday} total={allItems.length} />
          </div>
          {allItems.length > 0 && (
            <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* ── Check-in ── */}
        <CheckInCard checkIn={checkIn} onMorningAck={handleMorningAck} onEveningSubmit={handleEveningSubmit} />

        {/* ── Event Day Mode ── */}
        {todayEvents.length > 0 && (
          <EventDayBanner
            events={todayEvents}
            canManageRundown={false}
          />
        )}

        {/* ── Deadline alert ── */}
        {data.deadlinePassed && pendingCount > 0 && (
          <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
            <p className="text-sm font-bold text-red-700">Sudah lewat jam 20:00</p>
            <p className="text-xs text-red-500 mt-0.5">{pendingCount} tugas belum di-update — segera isi sebelum dicatat sebagai tidak hadir</p>
          </div>
        )}

        {/* ── Sharing session ── */}
        {mySharing.length > 0 && (
          <MySharingSessionCard sessions={mySharing}
            onUpdate={() => fetch('/api/sharing-sessions').then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && setSharingSessions(d))} />
        )}

        {/* ── Terlambat ── */}
        {overdueTasks.length > 0 && (
          <div>
            <SectionHeader label="Terlambat" count={overdueTasks.length} accent="bg-red-500" color="text-red-600" />
            <div className="space-y-3">
              {overdueTasks.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
            </div>
          </div>
        )}

        {/* ── Deadline Hari Ini ── */}
        {dueTodayTasks.length > 0 && (
          <div>
            <SectionHeader label="Deadline Hari Ini" count={dueTodayTasks.length} accent="bg-amber-500" color="text-amber-700" />
            <div className="space-y-3">
              {dueTodayTasks.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
            </div>
          </div>
        )}

        {/* ── Berjalan ── */}
        {ongoingTasks.length > 0 && (
          <div>
            <SectionHeader label="Task Berjalan" count={ongoingTasks.length} accent="bg-violet-400" />
            <div className="space-y-3">
              {ongoingTasks.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
            </div>
          </div>
        )}

        {/* ── Personal tasks ── */}
        <div>
          <SectionHeader label="Catatan & To-Do" count={personalTasks.length} accent="bg-gray-300" />
          <div className="space-y-3">
            {personalTasks.map(item => (
              <TaskCard key={item.id} item={item} onSave={saveProgress} onDelete={removePersonalTask} />
            ))}
            <AddTaskForm projectOptions={data.projectOptions} onAdd={addPersonalTask} />
          </div>
        </div>

        {/* ── Sudah di-update (collapsed) ── */}
        {updatedTasks.length > 0 && (
          <CollapsibleSection title="Sudah Di-update Hari Ini" count={updatedTasks.length} defaultOpen={false}>
            <div className="space-y-2">
              {updatedTasks.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
            </div>
          </CollapsibleSection>
        )}

        {/* ── Sharing sessions ── */}
        {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
          <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
            <AllSharingSessionsTable sessions={sharingSessions} />
          </CollapsibleSection>
        )}

        {/* ── Kinerja & Pengumuman ── */}
        <PersonalStatsWidget />

        {/* Empty state */}
        {allItems.length === 0 && personalTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-semibold text-gray-500">Tidak ada tugas aktif</p>
            <p className="text-sm mt-1">Tambahkan to-do atau tunggu PM assign task baru</p>
          </div>
        )}

      </main>
    </div>
  )
}
