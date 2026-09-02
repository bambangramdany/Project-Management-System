'use client'
import { useState, useEffect, useMemo } from 'react'

const COLOR_OPTIONS = [
  { key: 'violet', label: 'Ungu',  bg: 'bg-violet-500', ring: 'ring-violet-300', text: 'text-violet-700', light: 'bg-violet-50' },
  { key: 'blue',   label: 'Biru',  bg: 'bg-blue-500',   ring: 'ring-blue-300',   text: 'text-blue-700',   light: 'bg-blue-50'   },
  { key: 'green',  label: 'Hijau', bg: 'bg-green-500',  ring: 'ring-green-300',  text: 'text-green-700',  light: 'bg-green-50'  },
  { key: 'orange', label: 'Jingga',bg: 'bg-orange-500', ring: 'ring-orange-300', text: 'text-orange-700', light: 'bg-orange-50' },
  { key: 'red',    label: 'Merah', bg: 'bg-red-500',    ring: 'ring-red-300',    text: 'text-red-700',    light: 'bg-red-50'    },
]
const colorOf = key => COLOR_OPTIONS.find(c => c.key === key) ?? COLOR_OPTIONS[0]

const fmtDate = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const isoDate = d => d ? new Date(d).toISOString().slice(0, 10) : ''
const isPast  = d => new Date(d) < new Date()

// Key milestones derived from project fields
function projectKeyDates(project) {
  const entries = []
  if (project.briefDate)        entries.push({ id: '__brief',     title: 'Client Brief',       date: project.briefDate,        color: 'blue',   fixed: true })
  if (project.submitDate)       entries.push({ id: '__submit',    title: 'Submit Proposal',    date: project.submitDate,       color: 'violet', fixed: true })
  if (project.quotationDeadline)entries.push({ id: '__quotation', title: 'Kirim Quotation',    date: project.quotationDeadline,color: 'orange', fixed: true })
  if (project.startDate)        entries.push({ id: '__start',     title: 'Event Mulai',        date: project.startDate,        color: 'green',  fixed: true })
  if (project.endDate)          entries.push({ id: '__end',       title: 'Event Selesai',      date: project.endDate,          color: 'green',  fixed: true })
  return entries
}

export default function ProjectTimelineTab({ project }) {
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', color: 'violet', note: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/projects/${project.id}/milestones`)
    if (res.ok) setMilestones(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [project.id])

  const keyDates = useMemo(() => projectKeyDates(project), [project])

  const allItems = useMemo(() => {
    const combined = [
      ...keyDates,
      ...milestones.map(m => ({ ...m, fixed: false })),
    ]
    return combined.sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [keyDates, milestones])

  const today = new Date()
  today.setHours(0,0,0,0)

  const nextItem = allItems.find(m => new Date(m.date) >= today && !m.done)
  const progress = milestones.length > 0
    ? Math.round((milestones.filter(m => m.done).length / milestones.length) * 100)
    : null

  async function handleSave() {
    if (!form.title.trim() || !form.date) { alert('Judul dan tanggal wajib diisi'); return }
    setSaving(true)
    try {
      if (editItem) {
        await fetch(`/api/projects/${project.id}/milestones`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestoneId: editItem.id, ...form }),
        })
      } else {
        await fetch(`/api/projects/${project.id}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setShowAdd(false); setEditItem(null); setForm({ title: '', date: '', color: 'violet', note: '' })
      load()
    } finally { setSaving(false) }
  }

  async function toggleDone(m) {
    await fetch(`/api/projects/${project.id}/milestones`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId: m.id, done: !m.done }),
    })
    load()
  }

  async function handleDelete(m) {
    if (!confirm(`Hapus milestone "${m.title}"?`)) return
    await fetch(`/api/projects/${project.id}/milestones?milestoneId=${m.id}`, { method: 'DELETE' })
    load()
  }

  function openEdit(m) {
    setEditItem(m)
    setForm({ title: m.title, date: isoDate(m.date), color: m.color || 'violet', note: m.note || '' })
    setShowAdd(true)
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-500">Milestone Tim</p>
          <p className="text-xl font-bold text-gray-900">{milestones.length}</p>
          {progress != null && (
            <div className="mt-1.5">
              <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
                <span>Progress</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Berikutnya</p>
          {nextItem ? (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate">{nextItem.title}</p>
              <p className={`text-xs font-medium mt-0.5 ${isPast(nextItem.date) ? 'text-red-500' : 'text-violet-600'}`}>
                {fmtDate(nextItem.date)}
              </p>
            </>
          ) : <p className="text-sm text-gray-400">–</p>}
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Selesai</p>
          <p className="text-xl font-bold text-gray-900">{milestones.filter(m => m.done).length}/{milestones.length}</p>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">Timeline Project</p>
        <button onClick={() => { setShowAdd(true); setEditItem(null); setForm({ title: '', date: '', color: 'violet', note: '' }) }}
          className="btn-primary text-xs px-3 py-1.5">
          + Tambah Milestone
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="card p-4 border-violet-200 border-2 space-y-3">
          <p className="text-sm font-semibold text-gray-800">{editItem ? 'Edit Milestone' : 'Tambah Milestone Baru'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Judul *</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="mis: Kirim Proposal Kreatif" />
            </div>
            <div>
              <label className="label">Tanggal *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Warna</label>
              <div className="flex gap-2 mt-1">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.key} onClick={() => setForm(p => ({ ...p, color: c.key }))}
                    className={`w-6 h-6 rounded-full ${c.bg} ${form.color === c.key ? `ring-2 ring-offset-1 ${c.ring}` : ''}`} />
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="label">Catatan</label>
              <input className="input" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Opsional" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowAdd(false); setEditItem(null) }} className="btn-secondary flex-1">Batal</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Memuat timeline…</div>
        ) : allItems.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">Belum ada milestone. Tambahkan milestone pertama untuk mulai tracking progress.</div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="py-4 space-y-0">
              {allItems.map((item, idx) => {
                const c = colorOf(item.color)
                const past = isPast(item.date)
                const isToday = isoDate(item.date) === isoDate(new Date())
                const isNext = item === nextItem
                return (
                  <div key={item.id} className={`relative flex items-start gap-4 px-4 py-3 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'} ${isNext ? 'ring-1 ring-violet-200 rounded-xl mx-2 bg-violet-50/50' : ''}`}>
                    {/* Dot */}
                    <div className={`relative z-10 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-1 ${item.done ? 'bg-green-500' : past ? 'bg-red-400' : c.bg}`}>
                      {item.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                      {!item.done && isToday && <span className="w-2 h-2 bg-white rounded-full" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${item.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.title}</span>
                            {item.fixed && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Key Date</span>}
                            {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">Hari Ini</span>}
                            {isNext && !isToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">Berikutnya</span>}
                          </div>
                          <p className={`text-xs mt-0.5 ${past && !item.done ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {fmtDate(item.date)}{past && !item.done && !item.fixed ? ' · Terlewat' : ''}
                          </p>
                          {item.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.note}</p>}
                        </div>
                        {!item.fixed && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => toggleDone(item)}
                              className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${item.done ? 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                              {item.done ? 'Batal' : '✓ Done'}
                            </button>
                            <button onClick={() => openEdit(item)} className="text-[11px] px-2 py-0.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Edit</button>
                            <button onClick={() => handleDelete(item)} className="text-[11px] px-2 py-0.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
