'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import BackButton from '@/components/BackButton'

const TYPE_CONFIG = {
  INFO:     { label: 'Info',      color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: 'ℹ️' },
  REMINDER: { label: 'Reminder',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '⏰' },
  WARNING:  { label: 'Peringatan',color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '⚠️' },
  EVENT:    { label: 'Event',     color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎉' },
  HOLIDAY:  { label: 'Libur',     color: 'bg-green-100 text-green-700 border-green-200',   icon: '🏖️' },
}

const DR_CONFIG = {
  VERBAL_WARNING: { label: 'Teguran Lisan',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PIP:            { label: 'PIP',            color: 'bg-orange-100 text-orange-700 border-orange-200' },
  SP1:            { label: 'SP-1',           color: 'bg-red-100 text-red-600 border-red-200' },
  SP2:            { label: 'SP-2',           color: 'bg-red-200 text-red-700 border-red-300' },
  SP3:            { label: 'SP-3',           color: 'bg-red-300 text-red-800 border-red-400' },
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function HrAnnouncementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status !== 'authenticated') return null

  const isAdmin = session.user.role === 'OWNER' ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold text-gray-900">HR — Pengumuman & Pembinaan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pengumuman perusahaan dan dokumen pembinaan karyawan
          </p>
        </div>

        {isAdmin ? <AdminView session={session} /> : <EmployeeView session={session} />}
      </main>
    </div>
  )
}

// ── ADMIN VIEW ──────────────────────────────────────────────────────────────
function AdminView({ session }) {
  const [tab, setTab] = useState('announcements')
  const [announcements, setAnnouncements] = useState([])
  const [disciplinary, setDisciplinary] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [ann, dis, usr] = await Promise.all([
      fetch('/api/announcements?all=1').then(r => r.json()),
      fetch('/api/disciplinary').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ])
    setAnnouncements(Array.isArray(ann) ? ann : [])
    setDisciplinary(Array.isArray(dis) ? dis : [])
    setUsers(Array.isArray(usr) ? usr : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200">
        {[['announcements','📢 Pengumuman'],['disciplinary','📋 Surat Pembinaan']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===id ? 'border-brand text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : tab === 'announcements'
        ? <AnnouncementsAdmin items={announcements} users={users} onRefresh={load} />
        : <DisciplinaryAdmin items={disciplinary} users={users} onRefresh={load} />
      }
    </div>
  )
}

function AnnouncementsAdmin({ items, users, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title:'', content:'', type:'INFO', targetUserId:'', expiresAt:'', pinned:false })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, targetUserId: form.targetUserId || null, expiresAt: form.expiresAt || null }),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ title:'', content:'', type:'INFO', targetUserId:'', expiresAt:'', pinned:false })
    onRefresh()
  }

  const del = async (id) => {
    if (!confirm('Hapus pengumuman ini?')) return
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const togglePin = async (item) => {
    await fetch(`/api/announcements/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !item.pinned }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{items.length} pengumuman</p>
        <button onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          + Buat Pengumuman
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Buat Pengumuman Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Judul *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Judul pengumuman..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Penerima</label>
              <select value={form.targetUserId} onChange={e => setForm({...form, targetUserId: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30">
                <option value="">🌐 Semua Karyawan</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Isi Pengumuman</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                placeholder="Isi pengumuman (opsional)..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Berlaku Sampai (opsional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="pinned" checked={form.pinned} onChange={e => setForm({...form, pinned: e.target.checked})}
                className="rounded" />
              <label htmlFor="pinned" className="text-sm text-gray-700">Sematkan (Pin) di atas</label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving || !form.title.trim()}
              className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 && <Empty text="Belum ada pengumuman" />}
        {items.map(item => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO
          const readCount = item.reads?.length || 0
          const expired = item.expiresAt && new Date(item.expiresAt) < new Date()
          return (
            <div key={item.id} className={`bg-white border rounded-xl p-4 shadow-sm ${expired ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {item.pinned && <span className="text-xs text-amber-600 font-semibold">📌 Pin</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                    {item.targetUser
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">🔒 Personal: {item.targetUser.name}</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">🌐 Semua</span>}
                    {expired && <span className="text-xs text-gray-400">Kedaluwarsa</span>}
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                  {item.content && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.content}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    Oleh {item.author.name} · {fmtDate(item.publishedAt)}
                    {item.expiresAt && ` · Berlaku s/d ${fmtDate(item.expiresAt)}`}
                    {!item.targetUser && ` · Dibaca oleh ${readCount} orang`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => togglePin(item)}
                    title={item.pinned ? 'Lepas pin' : 'Pin'}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-amber-500 transition-colors text-sm">
                    📌
                  </button>
                  <button onClick={() => del(item.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors text-sm">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DisciplinaryAdmin({ items, users, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ userId:'', type:'VERBAL_WARNING', title:'', description:'', targetDate:'' })
  const [saving, setSaving] = useState(false)
  const [filterUser, setFilterUser] = useState('')

  const save = async () => {
    if (!form.userId || !form.title.trim()) return
    setSaving(true)
    await fetch('/api/disciplinary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, targetDate: form.targetDate || null }),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ userId:'', type:'VERBAL_WARNING', title:'', description:'', targetDate:'' })
    onRefresh()
  }

  const filtered = filterUser ? items.filter(i => i.userId === filterUser) : items

  // Group by user
  const byUser = {}
  filtered.forEach(r => {
    if (!byUser[r.userId]) byUser[r.userId] = { user: r.user, records: [] }
    byUser[r.userId].records.push(r)
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">{items.length} dokumen pembinaan</p>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none">
            <option value="">Semua Karyawan</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
          + Buat Dokumen Pembinaan
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-red-100 rounded-xl p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-gray-800">Dokumen Pembinaan Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Karyawan *</label>
              <select value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200">
                <option value="">-- Pilih Karyawan --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Dokumen *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200">
                {Object.entries(DR_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Judul *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                placeholder="Mis: SP-1 — Tidak Memenuhi Target KPI Bulan Agustus 2026" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Uraian / Alasan</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                placeholder="Uraikan pelanggaran, kondisi, dan rencana perbaikan yang diharapkan..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Evaluasi Ulang</label>
              <input type="date" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving || !form.userId || !form.title.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan & Kirim ke Karyawan'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Batal
            </button>
          </div>
        </div>
      )}

      {Object.keys(byUser).length === 0 && <Empty text="Belum ada dokumen pembinaan" />}

      {Object.values(byUser).map(({ user, records }) => (
        <div key={user.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">
              {user.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role} · {user.divisi}</p>
            </div>
            <span className="ml-auto text-xs text-gray-500">{records.length} dokumen</span>
          </div>
          <div className="divide-y divide-gray-100">
            {records.map(r => {
              const cfg = DR_CONFIG[r.type] || DR_CONFIG.VERBAL_WARNING
              return (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 mt-0.5 ${cfg.color}`}>{cfg.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
                      {r.description && <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{r.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>Diterbitkan {fmtDate(r.createdAt)}</span>
                        {r.targetDate && <span>· Evaluasi ulang {fmtDate(r.targetDate)}</span>}
                        {r.acknowledgedAt
                          ? <span className="text-green-600 font-medium">✅ Dikonfirmasi {fmtDate(r.acknowledgedAt)}</span>
                          : <span className="text-amber-600 font-medium">⏳ Belum dikonfirmasi</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── EMPLOYEE VIEW ────────────────────────────────────────────────────────────
function EmployeeView({ session }) {
  const [announcements, setAnnouncements] = useState([])
  const [disciplinary, setDisciplinary] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [ann, dis] = await Promise.all([
      fetch('/api/announcements').then(r => r.json()),
      fetch('/api/disciplinary').then(r => r.json()),
    ])
    setAnnouncements(Array.isArray(ann) ? ann : [])
    setDisciplinary(Array.isArray(dis) ? dis : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markRead = async (id) => {
    await fetch(`/api/announcements/${id}/read`, { method: 'POST' })
    setAnnouncements(prev => prev.map(a =>
      a.id === id ? { ...a, reads: [{ readAt: new Date().toISOString() }] } : a
    ))
  }

  const acknowledge = async (id) => {
    if (!confirm('Konfirmasi bahwa kamu telah membaca dan memahami dokumen pembinaan ini?')) return
    await fetch(`/api/disciplinary/${id}/acknowledge`, { method: 'POST' })
    setDisciplinary(prev => prev.map(d =>
      d.id === id ? { ...d, acknowledgedAt: new Date().toISOString() } : d
    ))
  }

  if (loading) return <Spinner />

  const unread = announcements.filter(a => !a.reads?.length)
  const personal = disciplinary.filter(d => !d.acknowledgedAt)

  return (
    <div className="space-y-6">
      {personal.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-3">⚠️ Kamu memiliki {personal.length} dokumen pembinaan yang perlu dikonfirmasi</p>
          {personal.map(r => {
            const cfg = DR_CONFIG[r.type] || DR_CONFIG.VERBAL_WARNING
            return (
              <div key={r.id} className="bg-white border border-red-100 rounded-lg p-4 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <p className="font-semibold text-gray-800 text-sm mt-2">{r.title}</p>
                    {r.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.description}</p>}
                    <div className="text-xs text-gray-400 mt-2">
                      Dari {r.author?.name} · {fmtDate(r.createdAt)}
                      {r.targetDate && ` · Evaluasi ulang: ${fmtDate(r.targetDate)}`}
                    </div>
                  </div>
                </div>
                <button onClick={() => acknowledge(r.id)}
                  className="mt-3 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  Saya Telah Membaca & Memahami
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          📢 Pengumuman
          {unread.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{unread.length}</span>}
        </h2>
        {announcements.length === 0 && <Empty text="Tidak ada pengumuman saat ini" />}
        <div className="space-y-3">
          {announcements.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO
            const read = item.reads?.length > 0
            return (
              <div key={item.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-colors ${!read ? 'border-brand/30 bg-blue-50/30' : 'border-gray-200'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {item.pinned && <span className="text-xs text-amber-600 font-semibold">📌</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                      {!read && <span className="text-xs px-1.5 py-0.5 bg-blue-500 text-white rounded-full font-medium">Baru</span>}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                    {item.content && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{item.content}</p>}
                    <p className="text-xs text-gray-400 mt-2">{fmtDate(item.publishedAt)}</p>
                  </div>
                  {!read && (
                    <button onClick={() => markRead(item.id)}
                      className="shrink-0 text-xs px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                      Tandai Dibaca
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {disciplinary.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📋 Riwayat Dokumen Pembinaan</h2>
          <div className="space-y-3">
            {disciplinary.map(r => {
              const cfg = DR_CONFIG[r.type] || DR_CONFIG.VERBAL_WARNING
              return (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <p className="font-semibold text-gray-800 text-sm mt-2">{r.title}</p>
                      {r.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.description}</p>}
                      <div className="text-xs text-gray-400 mt-2">
                        Dari {r.author?.name} · {fmtDate(r.createdAt)}
                        {r.targetDate && ` · Evaluasi ulang: ${fmtDate(r.targetDate)}`}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {r.acknowledgedAt
                        ? <span className="text-xs text-green-600 font-medium">✅ Dikonfirmasi</span>
                        : <button onClick={() => acknowledge(r.id)}
                            className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            Konfirmasi
                          </button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
}

function Empty({ text }) {
  return <div className="text-center py-10 text-sm text-gray-400">{text}</div>
}
