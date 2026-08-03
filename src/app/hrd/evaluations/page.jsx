'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const ASPECTS = [
  { key: 'scoreMateri', label: 'Materi' },
  { key: 'scorePenyampaian', label: 'Penyampaian' },
  { key: 'scoreInteraksi', label: 'Interaksi' },
  { key: 'scoreWaktu', label: 'Waktu' },
]

function ScorePill({ value }) {
  if (value == null) return <span className="text-gray-300 text-xs">—</span>
  const color = value >= 4 ? 'text-green-600' : value >= 3 ? 'text-amber-600' : 'text-red-500'
  return <span className={`font-semibold ${color}`}>{value.toFixed(1)}</span>
}

function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n === value ? null : n)}
          className={`w-7 h-7 rounded text-sm font-bold transition-colors ${
            value >= n ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-400 hover:bg-orange-100'
          }`}>{n}</button>
      ))}
    </div>
  )
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          {icon && <span>{icon}</span>}{title}
        </span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ── Bobot Komponen ───────────────────────────────────────────────────────────
function BobotSection() {
  const [bobot, setBobot] = useState({ kpiWeight: 40, attendanceWeight: 20, sharingWeight: 15, attitudeWeight: 15, skillWeight: 10 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetch('/api/hrd/weights').then(r => r.json()).then(data => {
      if (data.kpiWeight != null) setBobot(data)
    })
  }, [])

  const total = Object.values(bobot).reduce((s, v) => s + (Number(v) || 0), 0)

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/hrd/weights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kpiWeight: Number(bobot.kpiWeight), attendanceWeight: Number(bobot.attendanceWeight), sharingWeight: Number(bobot.sharingWeight), attitudeWeight: Number(bobot.attitudeWeight), skillWeight: Number(bobot.skillWeight) }),
      })
      const data = await res.json()
      if (!res.ok) setMsg({ type: 'error', text: data.error || 'Gagal menyimpan' })
      else setMsg({ type: 'ok', text: 'Bobot berhasil disimpan' })
    } catch (e) {
      setMsg({ type: 'error', text: `Error: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'kpiWeight', label: 'KPI' },
    { key: 'attendanceWeight', label: 'Absensi' },
    { key: 'sharingWeight', label: 'Sharing Session' },
    { key: 'attitudeWeight', label: 'Attitude / Kedisiplinan' },
    { key: 'skillWeight', label: 'Skill Development' },
  ]

  return (
    <Section title="Bobot Komponen Penilaian" icon="⚖️">
      <div className="mt-3 space-y-3">
        {fields.map(f => (
          <div key={f.key} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-44">{f.label}</span>
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={100} step={1}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-right"
                value={bobot[f.key]}
                onChange={e => setBobot(b => ({ ...b, [f.key]: e.target.value }))} />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        ))}
        <div className={`text-sm font-semibold ${Math.abs(total - 100) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
          Total: {total}% {Math.abs(total - 100) > 0.01 && <span className="font-normal text-xs">(harus tepat 100% untuk bisa disimpan)</span>}
        </div>
        {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
        <button onClick={save} disabled={saving || Math.abs(total - 100) > 0.01}
          className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Menyimpan...' : 'Simpan Bobot'}
        </button>
      </div>
    </Section>
  )
}

// ── Jadwal Sharing Session ───────────────────────────────────────────────────
function JadwalSection() {
  const [sessions, setSessions] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [form, setForm] = useState({ userId: '', scheduledDate: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('UPCOMING')

  const load = useCallback(() => {
    fetch('/api/sharing-sessions').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSessions(data)
    })
  }, [])

  useEffect(() => {
    load()
    fetch('/api/team').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAllUsers(data)
    })
  }, [load])

  async function create() {
    if (!form.userId || !form.scheduledDate) return
    setSaving(true)
    await fetch('/api/sharing-sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowForm(false)
    setForm({ userId: '', scheduledDate: '', notes: '' })
    load()
  }

  async function markDone(id) {
    await fetch(`/api/sharing-sessions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    load()
  }

  async function del(id) {
    if (!confirm('Hapus jadwal ini?')) return
    await fetch(`/api/sharing-sessions/${id}`, { method: 'DELETE' })
    load()
  }

  const STATUS_LABEL = { UPCOMING: 'Mendatang', DONE: 'Selesai', CANCELLED: 'Dibatalkan' }
  const STATUS_COLOR = {
    UPCOMING: 'bg-brand-100 text-brand-700 border-brand-200',
    DONE: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  const list = sessions
    .filter(s => filterStatus === 'ALL' ? true : s.status === filterStatus)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))

  return (
    <Section title="Jadwal Sharing Session" icon="📅">
      <div className="mt-3 flex flex-wrap gap-2 items-center justify-between mb-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {['UPCOMING', 'DONE', 'ALL'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 transition-colors ${filterStatus === s ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s === 'UPCOMING' ? 'Mendatang' : s === 'DONE' ? 'Selesai' : 'Semua'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(f => !f)} className="btn-primary text-xs px-3 py-1.5">
          {showForm ? 'Tutup' : '+ Jadwalkan'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3 mb-4">
          <p className="text-xs font-semibold text-brand-700">Jadwal Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Presenter</label>
              <select className="select w-full text-sm" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">Pilih anggota tim...</option>
                {allUsers.sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.jobTitle || u.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 mb-1 block">Tanggal</label>
              <input type="date" className="input w-full text-sm" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
          </div>
          <input className="input w-full text-sm" placeholder="Catatan HRD (opsional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={create} disabled={saving || !form.userId || !form.scheduledDate} className="btn-primary text-xs px-4 py-1.5 disabled:opacity-40">
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 hover:text-gray-700">Batal</button>
          </div>
        </div>
      )}

      {list.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Tidak ada jadwal</p>}

      <div className="space-y-2">
        {list.map(s => (
          <div key={s.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800">{s.user?.name}</p>
              <p className="text-xs text-gray-500">{new Date(s.scheduledDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
              {s.topic && <p className="text-xs text-gray-600 mt-0.5">💡 {s.topic}</p>}
              {s.notes && <p className="text-xs text-gray-400 mt-0.5">📌 {s.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_COLOR[s.status]}`}>
                {STATUS_LABEL[s.status]}
              </span>
              {s.status === 'UPCOMING' && (
                <button onClick={() => markDone(s.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 whitespace-nowrap">✓ Selesai</button>
              )}
              <button onClick={() => del(s.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 hover:bg-red-100 border border-red-100">✕</button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Sharing Session Scoring ──────────────────────────────────────────────────
function SharingScoringSection() {
  const [sessions, setSessions] = useState([])
  const [filter, setFilter] = useState('unscore') // unscore | all
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    fetch('/api/sharing-sessions').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSessions(data)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const list = sessions.filter(s => {
    if (filter === 'unscore') return !s.scoreMateri || !s.scorePenyampaian || !s.scoreInteraksi || !s.scoreWaktu
    return true
  }).sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))

  function openScore(s) {
    setSelected(s)
    setForm({
      agenda: s.agenda || '',
      scoreMateri: s.scoreMateri ?? null,
      scorePenyampaian: s.scorePenyampaian ?? null,
      scoreInteraksi: s.scoreInteraksi ?? null,
      scoreWaktu: s.scoreWaktu ?? null,
      scoreNotes: s.scoreNotes || '',
    })
    setMsg(null)
  }

  async function saveScore() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(`/api/sharing-sessions/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Gagal menyimpan' }); return }
      setSelected(null)
      load()
    } catch (e) {
      setMsg({ type: 'error', text: `Error: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  const avgScore = form.scoreMateri && form.scorePenyampaian && form.scoreInteraksi && form.scoreWaktu
    ? ((form.scoreMateri + form.scorePenyampaian + form.scoreInteraksi + form.scoreWaktu) / 4).toFixed(2)
    : null

  return (
    <Section title="Penilaian Sharing Session" icon="🎤">
      <div className="mt-3 flex gap-2 mb-3">
        {[['unscore', 'Belum dinilai'], ['all', 'Semua']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === v ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Tidak ada sesi</p>}

      <div className="space-y-2">
        {list.map(s => {
          const scored = s.scoreMateri && s.scorePenyampaian && s.scoreInteraksi && s.scoreWaktu
          const avg = scored ? ((s.scoreMateri + s.scorePenyampaian + s.scoreInteraksi + s.scoreWaktu) / 4).toFixed(2) : null
          return (
            <div key={s.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-2 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.user?.name}</p>
                <p className="text-xs text-gray-500">{new Date(s.scheduledDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {s.topic && <p className="text-xs text-gray-400 truncate">{s.topic}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {avg ? <span className="text-sm font-bold text-green-600">★ {avg}</span>
                  : <span className="text-xs text-amber-500">Belum dinilai</span>}
                <button onClick={() => openScore(s)}
                  className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-2 py-1 rounded border border-orange-200 transition-colors">
                  {scored ? 'Edit' : 'Nilai'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Score Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{selected.user?.name}</h3>
              <p className="text-xs text-gray-500">{new Date(selected.scheduledDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Agenda / Topik</label>
                <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  placeholder="Isi agenda atau topik presentasi"
                  value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} />
              </div>
              {ASPECTS.map(a => (
                <div key={a.key}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{a.label}</label>
                  <StarInput value={form[a.key]} onChange={v => setForm(f => ({ ...f, [a.key]: v }))} />
                </div>
              ))}
              {avgScore && (
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">Rata-rata nilai</p>
                  <p className="text-2xl font-bold text-green-700">{avgScore}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Catatan</label>
                <textarea rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none"
                  placeholder="Catatan evaluasi (opsional)"
                  value={form.scoreNotes} onChange={e => setForm(f => ({ ...f, scoreNotes: e.target.value }))} />
              </div>
              {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setSelected(null)} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={saveScore} disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-40">
                {saving ? 'Menyimpan...' : 'Simpan Nilai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}

// ── Penilaian Bulanan ────────────────────────────────────────────────────────
function PenilaianBulananSection() {
  const today = new Date()
  const [period, setPeriod] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [team, setTeam] = useState([])
  const [evals, setEvals] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    fetch('/api/team').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setTeam(data.filter(u => u.role !== 'OWNER'))
    })
  }, [])

  const loadEvals = useCallback(() => {
    fetch(`/api/hrd/evaluations?period=${period}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEvals(data)
    })
  }, [period])

  useEffect(() => { loadEvals() }, [loadEvals])

  function evalFor(userId) { return evals.find(e => e.userId === userId) }

  function openUser(user) {
    const existing = evalFor(user.id)
    setSelected(user)
    setForm({
      attitudeScore: existing?.attitudeScore ?? null,
      attitudeNotes: existing?.attitudeNotes || '',
      skillScore: existing?.skillScore ?? null,
      skillNotes: existing?.skillNotes || '',
      skillActivities: existing?.skillActivities || '',
    })
    setMsg(null)
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/hrd/evaluations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, period, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Gagal menyimpan' }); return }
      setSelected(null)
      loadEvals()
    } catch (e) {
      setMsg({ type: 'error', text: `Error: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  // generate period options: current month - 11 months
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    return { val, label }
  })

  return (
    <Section title="Penilaian Bulanan" icon="📋">
      <div className="mt-3 mb-4">
        <select className="border border-gray-200 rounded px-3 py-1.5 text-sm"
          value={period} onChange={e => setPeriod(e.target.value)}>
          {periodOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {team.sort((a, b) => a.name.localeCompare(b.name)).map(user => {
          const ev = evalFor(user.id)
          const hasAtd = ev?.attitudeScore != null
          const hasSkl = ev?.skillScore != null
          return (
            <div key={user.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-2 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.jobTitle || user.role}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-xs text-right space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Attitude:</span>
                    <ScorePill value={ev?.attitudeScore} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">Skill:</span>
                    <ScorePill value={ev?.skillScore} />
                  </div>
                </div>
                <button onClick={() => openUser(user)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    hasAtd && hasSkl
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                  }`}>
                  {hasAtd && hasSkl ? 'Edit' : 'Isi'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{selected.name}</h3>
              <p className="text-xs text-gray-500">{periodOptions.find(o => o.val === period)?.label}</p>
            </div>
            <div className="p-4 space-y-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Attitude / Kedisiplinan</p>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Nilai (1–5)</label>
                  <StarInput value={form.attitudeScore} onChange={v => setForm(f => ({ ...f, attitudeScore: v }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Catatan</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none"
                    placeholder="Catatan attitude / kedisiplinan"
                    value={form.attitudeNotes} onChange={e => setForm(f => ({ ...f, attitudeNotes: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Skill Development</p>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Nilai (1–5)</label>
                  <StarInput value={form.skillScore} onChange={v => setForm(f => ({ ...f, skillScore: v }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Aktivitas / Training</label>
                  <input type="text" className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                    placeholder="Contoh: Workshop Figma, Kursus Excel"
                    value={form.skillActivities} onChange={e => setForm(f => ({ ...f, skillActivities: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Catatan</label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded px-3 py-2 text-sm resize-none"
                    placeholder="Catatan skill development"
                    value={form.skillNotes} onChange={e => setForm(f => ({ ...f, skillNotes: e.target.value }))} />
                </div>
              </div>

              {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setSelected(null)} className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-40">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}

// ── Ringkasan Penilaian Tim ──────────────────────────────────────────────────
function RingkasanTimSection() {
  const today = new Date()
  const [viewType, setViewType] = useState('monthly')
  const [period, setPeriod] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('name') // name | final | kpi | attitude | skill | sharing | attendance
  const [sortDir, setSortDir] = useState('asc')
  const [filterDivisi, setFilterDivisi] = useState('ALL')

  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    return { val, label }
  })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/hrd/accumulation/team?period=${period}&type=${viewType}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period, viewType])

  const sc = v => v == null ? null : v >= 4 ? 'text-green-600' : v >= 3 ? 'text-amber-600' : 'text-red-500'
  const fmt = v => v == null ? <span className="text-gray-300">—</span> : <span className={sc(v)}>{v.toFixed(2)}</span>

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir(col === 'name' ? 'asc' : 'desc') }
  }

  const SortBtn = ({ col, label }) => (
    <button onClick={() => toggleSort(col)}
      className={`flex items-center gap-0.5 hover:text-gray-700 transition-colors ${sortBy === col ? 'text-orange-600 font-semibold' : ''}`}>
      {label}
      <span className="text-[9px]">{sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  )

  const results = data?.results ?? []

  const divisis = ['ALL', ...Array.from(new Set(results.map(r => r.user.divisi).filter(Boolean)))]

  const filtered = results.filter(r => filterDivisi === 'ALL' || r.user.divisi === filterDivisi)

  const sorted = [...filtered].sort((a, b) => {
    let va, vb
    if (sortBy === 'name') { va = a.user.name; vb = b.user.name; return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va) }
    const getVal = (r) => ({ final: r.finalScore, kpi: r.components.kpi, attitude: r.components.attitude, skill: r.components.skill, sharing: r.components.sharing, attendance: r.components.attendance })[sortBy]
    va = getVal(a) ?? -1; vb = getVal(b) ?? -1
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const DIVISI_LABEL = { EVENT: 'Event', CREATIVE: 'Creative', PH: 'PH', FINANCE_HRGA: 'Finance/HRD' }

  // Summary stats
  const withScore = sorted.filter(r => r.finalScore != null)
  const teamAvg = withScore.length ? (withScore.reduce((s, r) => s + r.finalScore, 0) / withScore.length) : null
  const top = withScore.length ? [...withScore].sort((a, b) => b.finalScore - a.finalScore)[0] : null
  const needDev = withScore.filter(r => r.finalScore < 3)

  return (
    <Section title="Ringkasan Penilaian Tim" icon="📊" defaultOpen={true}>
      {/* Filter bar */}
      <div className="mt-3 flex flex-wrap gap-2 items-center mb-4">
        <div className="flex gap-1">
          {[['monthly', 'Bulanan'], ['quarterly', 'Per 3 Bulan'], ['yearly', 'Tahunan']].map(([v, l]) => (
            <button key={v} onClick={() => setViewType(v)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${viewType === v ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {l}
            </button>
          ))}
        </div>
        <select className="border border-gray-200 rounded px-2 py-1 text-sm"
          value={period} onChange={e => setPeriod(e.target.value)}>
          {periodOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        {divisis.length > 2 && (
          <select className="border border-gray-200 rounded px-2 py-1 text-sm"
            value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)}>
            <option value="ALL">Semua Divisi</option>
            {divisis.filter(d => d !== 'ALL').map(d => <option key={d} value={d}>{DIVISI_LABEL[d] || d}</option>)}
          </select>
        )}
      </div>

      {loading && <div className="py-8 text-center text-gray-400 text-sm">Menghitung...</div>}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Rata-rata Tim', value: teamAvg, icon: '👥' },
              { label: 'Tertinggi', value: top?.finalScore, sub: top?.user.name, icon: '🏆' },
              { label: 'Perlu Pengembangan', value: needDev.length, isCount: true, sub: needDev.length ? needDev.map(r => r.user.name.split(' ')[0]).join(', ') : null, icon: '📈' },
              { label: 'Data tersedia', value: withScore.length, isCount: true, sub: `dari ${sorted.length} anggota`, icon: '📋' },
            ].map(({ label, value, sub, icon, isCount }) => (
              <div key={label} className="card p-3 text-center">
                <p className="text-lg">{icon}</p>
                <p className={`text-xl font-bold mt-1 ${isCount ? 'text-gray-700' : sc(value) || 'text-gray-400'}`}>
                  {value == null ? '—' : isCount ? value : value.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-gray-400 truncate mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Table */}
          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada data untuk periode ini</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2.5"><SortBtn col="name" label="Nama" /></th>
                    <th className="px-3 py-2.5 text-center"><SortBtn col="final" label="Akhir" /></th>
                    <th className="px-3 py-2.5 text-center hidden sm:table-cell"><SortBtn col="kpi" label={`KPI (${data.weights?.kpi}%)`} /></th>
                    <th className="px-3 py-2.5 text-center hidden sm:table-cell"><SortBtn col="attendance" label={`Absensi (${data.weights?.attendance}%)`} /></th>
                    <th className="px-3 py-2.5 text-center hidden md:table-cell"><SortBtn col="sharing" label={`Sharing (${data.weights?.sharing}%)`} /></th>
                    <th className="px-3 py-2.5 text-center hidden md:table-cell"><SortBtn col="attitude" label={`Attitude (${data.weights?.attitude}%)`} /></th>
                    <th className="px-3 py-2.5 text-center hidden md:table-cell"><SortBtn col="skill" label={`Skill (${data.weights?.skill}%)`} /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map(({ user, components, finalScore }) => (
                    <tr key={user.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="text-xs font-semibold text-gray-800">{user.name}</p>
                        <p className="text-[10px] text-gray-400">{user.jobTitle || user.role}{user.divisi ? ` · ${DIVISI_LABEL[user.divisi] || user.divisi}` : ''}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-sm font-bold ${sc(finalScore) || 'text-gray-300'}`}>
                          {finalScore != null ? finalScore.toFixed(2) : '—'}
                        </span>
                        {finalScore != null && (
                          <div className="w-12 mx-auto mt-1 bg-gray-100 rounded-full h-1 overflow-hidden">
                            <div className={`h-full rounded-full ${finalScore >= 4 ? 'bg-green-400' : finalScore >= 3 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${(finalScore / 5) * 100}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs hidden sm:table-cell">{fmt(components.kpi)}</td>
                      <td className="px-3 py-2.5 text-center text-xs hidden sm:table-cell">{fmt(components.attendance)}</td>
                      <td className="px-3 py-2.5 text-center text-xs hidden md:table-cell">{fmt(components.sharing)}</td>
                      <td className="px-3 py-2.5 text-center text-xs hidden md:table-cell">{fmt(components.attitude)}</td>
                      <td className="px-3 py-2.5 text-center text-xs hidden md:table-cell">{fmt(components.skill)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ── Data Tanggal Lahir ────────────────────────────────────────────────────────
function BirthdaySection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/users/birthdays').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data)
      setLoading(false)
    })
  }, [])

  async function saveBirthday(userId, birthDate) {
    setSaving(s => ({ ...s, [userId]: true }))
    try {
      const res = await fetch('/api/users/birthdays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, birthDate: birthDate || null }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers(us => us.map(u => u.id === userId ? { ...u, birthDate: data.birthDate } : u))
      }
    } finally {
      setSaving(s => ({ ...s, [userId]: false }))
    }
  }

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

  function toInputDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toISOString().split('T')[0]
  }

  function formatBirthday(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
  }

  const today = new Date()
  const todayMD = `${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <Section title="Data Tanggal Lahir Tim" icon="🎂">
      <div className="mt-3">
        <input placeholder="Cari anggota..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm mb-3 focus:outline-none focus:border-brand-400" />
        {loading ? <p className="text-sm text-gray-400">Memuat...</p> : (
          <div className="space-y-2">
            {filtered.map(u => {
              const bdStr = toInputDate(u.birthDate)
              const isBdToday = bdStr && bdStr.slice(5) === todayMD
              return (
                <div key={u.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isBdToday ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name} {isBdToday && '🎉'}</p>
                    <p className="text-xs text-gray-400">{u.divisi || u.jobTitle || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.birthDate && (
                      <span className="text-xs text-gray-500 hidden sm:block">{formatBirthday(u.birthDate)}</span>
                    )}
                    <input type="date" value={bdStr}
                      onChange={e => saveBirthday(u.id, e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-brand-400" />
                    {saving[u.id] && <span className="text-xs text-gray-400">💾</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Section>
  )
}

// ── Pengumuman HRD ────────────────────────────────────────────────────────────
const TYPE_LABELS = { INFO: { label: 'Info', color: 'bg-blue-100 text-blue-700' }, EVENT: { label: 'Event', color: 'bg-purple-100 text-purple-700' }, WARNING: { label: 'Perhatian', color: 'bg-amber-100 text-amber-700' }, BIRTHDAY: { label: 'Ulang Tahun', color: 'bg-pink-100 text-pink-700' } }

function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', content: '', type: 'INFO', expiresAt: '', pinned: false })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    fetch('/api/announcements').then(r => r.json()).then(data => {
      if (data.announcements) setAnnouncements(data.announcements)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function saveAnnouncement() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null }),
      })
      if (res.ok) {
        setForm({ title: '', content: '', type: 'INFO', expiresAt: '', pinned: false })
        setShowForm(false)
        load()
      }
    } finally { setSaving(false) }
  }

  async function deleteAnnouncement(id) {
    if (!confirm('Hapus pengumuman ini?')) return
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    load()
  }

  async function togglePin(ann) {
    await fetch(`/api/announcements/${ann.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !ann.pinned }),
    })
    load()
  }

  return (
    <Section title="Pengumuman HRD" icon="📢">
      <div className="mt-3 space-y-3">
        {!showForm ? (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-1.5 px-4">+ Buat Pengumuman</button>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-blue-50">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Judul *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Judul pengumuman" className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tipe</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm">
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Isi (opsional)</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={3} placeholder="Detail pengumuman..." className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm resize-none" />
            </div>
            <div className="flex gap-4 items-center flex-wrap">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Berlaku sampai (opsional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="border border-gray-200 rounded px-2 py-1 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 mt-4">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                Pinned (tampil di atas)
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={saveAnnouncement} disabled={saving || !form.title.trim()}
                className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button onClick={() => setShowForm(false)} className="btn-outline text-sm py-1.5 px-4">Batal</button>
            </div>
          </div>
        )}

        {loading ? <p className="text-sm text-gray-400">Memuat...</p> : announcements.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Belum ada pengumuman aktif.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map(ann => {
              const tl = TYPE_LABELS[ann.type] || TYPE_LABELS.INFO
              return (
                <div key={ann.id} className="flex items-start gap-3 border border-gray-200 rounded-lg px-3 py-2.5 bg-white">
                  {ann.pinned && <span className="text-xs mt-0.5">📌</span>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tl.color}`}>{tl.label}</span>
                      <p className="text-sm font-medium text-gray-800">{ann.title}</p>
                    </div>
                    {ann.content && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ann.content}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {ann.author?.name} · {new Date(ann.publishedAt).toLocaleDateString('id-ID')}
                      {ann.expiresAt && ` · s/d ${new Date(ann.expiresAt).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => togglePin(ann)} title={ann.pinned ? 'Unpin' : 'Pin'}
                      className="text-gray-400 hover:text-gray-600 text-xs px-1.5 py-1 rounded hover:bg-gray-100">📌</button>
                    <button onClick={() => deleteAnnouncement(ann.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-1.5 py-1 rounded hover:bg-red-50">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HrdEvaluationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') {
      const u = session.user
      if (!u?.canHrdEvaluate && u?.role !== 'OWNER') router.push('/')
    }
  }, [status, session, router])

  if (status !== 'authenticated') return null

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Input Penilaian HRD</h1>
          <p className="text-sm text-gray-500 mt-0.5">Data akan masuk ke akumulasi penilaian masing-masing anggota</p>
        </div>
        <BobotSection />
        <RingkasanTimSection />
        <BirthdaySection />
        <AnnouncementSection />
        <JadwalSection />
        <SharingScoringSection />
        <PenilaianBulananSection />
      </main>
    </div>
  )
}
