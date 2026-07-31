'use client'
import { useState } from 'react'

const STATUS_LABEL = { UPCOMING: 'Akan Datang', DONE: 'Selesai', CANCELLED: 'Dibatalkan' }
const STATUS_COLOR = {
  UPCOMING: 'bg-brand-100 text-brand-700 border-brand-200',
  DONE:     'bg-green-100 text-green-700 border-green-200',
  CANCELLED:'bg-gray-100 text-gray-500 border-gray-200',
}

function fmt(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Card tampil di Tugas Saya — presenter bisa isi/edit topik
export function MySharingSessionCard({ sessions, onUpdate }) {
  const upcoming = sessions.filter(s => s.status === 'UPCOMING')
  const past = sessions.filter(s => s.status !== 'UPCOMING')
  const next = upcoming[0]

  const [editingId, setEditingId] = useState(null)
  const [topicDraft, setTopicDraft] = useState('')
  const [saving, setSaving] = useState(false)

  async function saveTopic(id) {
    setSaving(true)
    await fetch(`/api/sharing-sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: topicDraft }),
    })
    setSaving(false)
    setEditingId(null)
    onUpdate?.()
  }

  if (!sessions.length) return null

  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎤</span>
          <p className="font-semibold text-brand-800 text-sm">Sharing Session Kamu</p>
        </div>
        {next && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[next.status]}`}>
            {STATUS_LABEL[next.status]}
          </span>
        )}
      </div>

      {next && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-xs text-gray-500">Jadwal berikutnya:</p>
          <p className="text-sm font-semibold text-gray-800">{fmt(next.scheduledDate)}</p>

          {next.notes && (
            <p className="text-xs text-gray-500 italic">📌 {next.notes}</p>
          )}

          {editingId === next.id ? (
            <div className="flex gap-2 mt-2">
              <input
                autoFocus
                className="input text-xs flex-1 py-1"
                placeholder="Tulis topik presentasimu..."
                value={topicDraft}
                onChange={e => setTopicDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTopic(next.id)}
              />
              <button onClick={() => saveTopic(next.id)} disabled={saving} className="btn-primary text-xs px-3 py-1">
                {saving ? '...' : 'Simpan'}
              </button>
              <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              {next.topic
                ? <p className="text-sm text-gray-700 flex-1">💡 <span className="font-medium">{next.topic}</span></p>
                : <p className="text-xs text-amber-600 flex-1">⚠ Belum ada topik — isi topik presentasimu</p>
              }
              <button
                onClick={() => { setEditingId(next.id); setTopicDraft(next.topic || '') }}
                className="text-xs text-brand-600 underline hover:text-brand-800 shrink-0"
              >
                {next.topic ? 'Ubah' : 'Isi Topik'}
              </button>
            </div>
          )}
        </div>
      )}

      {past.length > 0 && (
        <details className="border-t border-brand-100">
          <summary className="px-4 py-2 text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            {past.length} sesi sebelumnya
          </summary>
          <div className="px-4 pb-3 space-y-1.5">
            {past.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs text-gray-500">
                <span>{fmt(s.scheduledDate)}</span>
                {s.topic && <span className="text-gray-700 font-medium truncate max-w-[60%] ml-2">"{s.topic}"</span>}
                <span className={`ml-2 px-1.5 py-0.5 rounded border text-[10px] ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// Baris di halaman Tim — untuk jadwal semua anggota
export function SharingSessionScheduleSection({ sessions, currentUser, onUpdate }) {
  const canManage = currentUser?.role === 'OWNER' || currentUser?.divisi === 'FINANCE_HRGA'
  const [showForm, setShowForm] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [formData, setFormData] = useState({ userId: '', scheduledDate: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [editingStatus, setEditingStatus] = useState(null)

  async function loadUsers() {
    if (allUsers.length) return
    const data = await fetch('/api/team').then(r => r.json())
    setAllUsers(Array.isArray(data) ? data : [])
  }

  async function createSession() {
    if (!formData.userId || !formData.scheduledDate) return
    setSaving(true)
    await fetch('/api/sharing-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    setSaving(false)
    setShowForm(false)
    setFormData({ userId: '', scheduledDate: '', notes: '' })
    onUpdate?.()
  }

  async function markStatus(id, status) {
    await fetch(`/api/sharing-sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setEditingStatus(null)
    onUpdate?.()
  }

  async function deleteSession(id) {
    if (!confirm('Hapus jadwal sharing session ini?')) return
    await fetch(`/api/sharing-sessions/${id}`, { method: 'DELETE' })
    onUpdate?.()
  }

  const upcoming = sessions.filter(s => s.status === 'UPCOMING').sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
  const past = sessions.filter(s => s.status !== 'UPCOMING').sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          🎤 Jadwal Sharing Session
        </h2>
        {canManage && (
          <button
            onClick={() => { setShowForm(s => !s); loadUsers() }}
            className="btn-primary text-xs px-3 py-1.5"
          >
            + Jadwalkan
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-brand-700">Tambah Jadwal Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Presenter</label>
              <select className="select w-full text-sm" value={formData.userId} onChange={e => setFormData(d => ({ ...d, userId: e.target.value }))}>
                <option value="">Pilih anggota tim...</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Tanggal</label>
              <input type="date" className="input w-full text-sm" value={formData.scheduledDate} onChange={e => setFormData(d => ({ ...d, scheduledDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Catatan (opsional)</label>
            <input className="input w-full text-sm" placeholder="Misal: durasi 30 menit, format Q&A..." value={formData.notes} onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={createSession} disabled={saving || !formData.userId || !formData.scheduledDate} className="btn-primary text-xs px-4 py-1.5">
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-700">Batal</button>
          </div>
        </div>
      )}

      {!sessions.length && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-1">📅</p>
          <p className="text-sm">Belum ada jadwal sharing session</p>
          {canManage && <p className="text-xs mt-1">Klik "+ Jadwalkan" untuk menambahkan</p>}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Mendatang</p>
          {upcoming.map(s => (
            <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-3 flex items-start justify-between gap-3">
              <div className="flex gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-brand-700 leading-none">
                    {new Date(s.scheduledDate).toLocaleDateString('id-ID', { day: '2-digit' })}
                  </span>
                  <span className="text-[8px] text-brand-500 uppercase">
                    {new Date(s.scheduledDate).toLocaleDateString('id-ID', { month: 'short' })}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{s.user.name}</p>
                  <p className="text-xs text-gray-400">{s.user.jobTitle || s.user.role}</p>
                  {s.topic
                    ? <p className="text-xs text-brand-700 mt-0.5">💡 {s.topic}</p>
                    : <p className="text-xs text-amber-500 mt-0.5">Topik belum diisi</p>
                  }
                  {s.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic">{s.notes}</p>}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => markStatus(s.id, 'DONE')} className="text-[10px] px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-100">✓ Selesai</button>
                  <button onClick={() => deleteSession(s.id)} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details>
          <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 select-none pt-1">
            {past.length} sesi sebelumnya ▸
          </summary>
          <div className="space-y-1.5 mt-2">
            {past.map(s => (
              <div key={s.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-gray-500 shrink-0">{fmt(s.scheduledDate)}</span>
                  <span className="text-xs font-medium text-gray-700 truncate">{s.user.name}</span>
                  {s.topic && <span className="text-xs text-gray-400 truncate hidden sm:block">"{s.topic}"</span>}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
