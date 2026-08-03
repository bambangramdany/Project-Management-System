'use client'
import { useState } from 'react'

export const STATUS_LABEL = { UPCOMING: 'Akan Datang', DONE: 'Selesai', CANCELLED: 'Dibatalkan' }
export const STATUS_COLOR = {
  UPCOMING: 'bg-brand-100 text-brand-700 border-brand-200',
  DONE:     'bg-green-100 text-green-700 border-green-200',
  CANCELLED:'bg-gray-100 text-gray-500 border-gray-200',
}

export function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Card kecil di Tugas Saya: jadwal milik user sendiri ────────────────────
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
    <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white overflow-hidden">
      <div className="px-4 py-3 border-b border-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎤</span>
          <p className="font-semibold text-brand-800 text-sm">Sharing Session Kamu</p>
        </div>
        {next && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR.UPCOMING}`}>
            Terjadwal
          </span>
        )}
      </div>

      {next ? (
        <div className="px-4 py-3 space-y-2">
          <p className="text-xs text-gray-500">Jadwal berikutnya:</p>
          <p className="text-sm font-semibold text-gray-800">{fmtDate(next.scheduledDate)}</p>
          {next.notes && <p className="text-xs text-gray-500 italic">📌 {next.notes}</p>}

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
      ) : (
        <div className="px-4 py-3 text-xs text-gray-400">Tidak ada jadwal mendatang.</div>
      )}

      {past.length > 0 && (
        <details className="border-t border-brand-100">
          <summary className="px-4 py-2 text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            {past.length} sesi selesai
          </summary>
          <div className="px-4 pb-3 space-y-1">
            {past.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs text-gray-500">
                <span>{fmtDate(s.scheduledDate)}</span>
                {s.topic && <span className="text-gray-700 font-medium truncate max-w-[55%] ml-2">"{s.topic}"</span>}
                <span className={`ml-2 px-1.5 py-0.5 rounded border text-[10px] ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Tabel semua jadwal (tampil di Tugas Saya — read-only, hanya info) ───────
export function AllSharingSessionsTable({ sessions }) {
  const [sortBy, setSortBy] = useState('date')
  const [filterStatus, setFilterStatus] = useState('UPCOMING')

  const filtered = sessions.filter(s => filterStatus === 'ALL' ? true : s.status === filterStatus)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') return new Date(a.scheduledDate) - new Date(b.scheduledDate)
    return a.user?.name?.localeCompare(b.user?.name || '')
  })

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {['UPCOMING', 'DONE', 'ALL'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 transition-colors ${filterStatus === s ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {s === 'UPCOMING' ? 'Mendatang' : s === 'DONE' ? 'Selesai' : 'Semua'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Urutkan:</span>
          <button onClick={() => setSortBy('date')} className={`px-2 py-1 rounded border ${sortBy === 'date' ? 'border-brand-400 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-500'}`}>Tanggal</button>
          <button onClick={() => setSortBy('name')} className={`px-2 py-1 rounded border ${sortBy === 'name' ? 'border-brand-400 text-brand-700 bg-brand-50' : 'border-gray-200 text-gray-500'}`}>Nama</button>
        </div>
      </div>

      {/* Tabel */}
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-1">📅</p>
          <p className="text-sm">Belum ada jadwal sharing session</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wide">
                <th className="text-left px-3 py-2">Tanggal</th>
                <th className="text-left px-3 py-2">Presenter</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">Topik</th>
                <th className="text-left px-3 py-2 hidden sm:table-cell">Catatan HRD</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDate(s.scheduledDate)}</td>
                  <td className="px-3 py-2.5">
                    <p className="text-xs font-semibold text-gray-800">{s.user?.name}</p>
                    <p className="text-[10px] text-gray-400">{s.user?.jobTitle || s.user?.role}</p>
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {s.topic
                      ? <span className="text-xs text-gray-700">{s.topic}</span>
                      : <span className="text-[10px] text-amber-500 italic">Belum diisi</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <span className="text-[10px] text-gray-400 italic">{s.notes || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLOR[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
