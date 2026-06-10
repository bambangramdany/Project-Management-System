'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge, CategoryBadge } from '@/components/StatusBadge'
import { STATUS_LABEL, ACTIVE_STATUSES, WON_STATUSES } from '@/lib/constants'
import { HEALTH_LABEL, HEALTH_COLOR, HEALTH_DOT } from '@/lib/health'
import { isFinanceDirector } from '@/lib/rbac'
import Link from 'next/link'

const PIPELINE_STAGES = [
  { key: 'HOLD', label: 'Hold' },
  { key: 'PITCHING', label: 'Pitching' },
  { key: 'WAITING_PITCH_RESULT', label: 'Waiting Result' },
  { key: 'PREPARATION', label: 'Preparation' },
  { key: 'EVENT_DAY', label: 'Event Day' },
  { key: 'REPORTING', label: 'Reporting' },
  { key: 'INVOICING', label: 'Invoicing' },
]

// Order for the morning briefing list — pitching through invoicing
const BRIEFING_ORDER = ['PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING']

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [cashPosition, setCashPosition] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchProjects = () => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated') fetchProjects()
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return
    const role = session.user.role
    if (role === 'OWNER' || role === 'FINANCE' || isFinanceDirector(session.user)) {
      fetch('/api/cashflow/position').then(r => r.ok ? r.json() : null).then(setCashPosition)
    }
  }, [status, session])

  if (status === 'loading' || loading) return <LoadingScreen />

  const activeProjects = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const wonProjects = projects.filter(p => p.pitchResult === 'WIN')
  const loseProjects = projects.filter(p => p.pitchResult === 'LOSE')
  const pitchedTotal = wonProjects.length + loseProjects.length
  const winRate = pitchedTotal > 0 ? Math.round((wonProjects.length / pitchedTotal) * 100) : 0

  const eoProjects = projects.filter(p => (p.division || 'EVENT') !== 'PH')
  const phProjects = projects.filter(p => p.division === 'PH')
  const attentionProjects = projects.filter(p => p.health && ['red', 'yellow'].includes(p.health.level))
    .sort((a, b) => (a.health.level === 'red' ? -1 : 1) - (b.health.level === 'red' ? -1 : 1))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Selamat datang, {session?.user.name}</p>
          </div>
          <Link href="/projects/new" className="btn-primary self-start sm:self-auto">
            + Project Baru
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Project" value={projects.length} sub="sepanjang tahun" color="text-gray-900" />
          <StatCard label="Project Aktif" value={activeProjects.length} sub="sedang berjalan" color="text-orange-600" />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wonProjects.length} menang dari ${pitchedTotal} pitch`} color="text-green-600" />
          <StatCard label="Project Selesai" value={projects.filter(p => p.status === 'DONE').length} sub="sudah lunas" color="text-blue-600" />
        </div>

        {/* Cash position — Owner / Finance / Finance Director only */}
        {cashPosition && <CashPositionCard data={cashPosition} />}

        {/* Projects needing attention */}
        {attentionProjects.length > 0 && (
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">⚠️ Project Perlu Perhatian ({attentionProjects.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {attentionProjects.map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[p.health.level]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.health.reasons.join(' · ')}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${HEALTH_COLOR[p.health.level]}`}>
                    {HEALTH_LABEL[p.health.level]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* EO / Event division */}
        <DivisionSection title="Event Organizer (EO)" projects={eoProjects} session={session} onChanged={fetchProjects} />

        {/* Production House division */}
        <DivisionSection title="Production House (PH)" projects={phProjects} session={session} onChanged={fetchProjects} />

      </main>
    </div>
  )
}

function DivisionSection({ title, projects, session, onChanged }) {
  const active = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const countByStatus = {}
  PIPELINE_STAGES.forEach(s => { countByStatus[s.key] = projects.filter(p => p.status === s.key).length })
  // Sort for morning briefing: Pitching -> Waiting Result -> Preparation -> Event Day -> Reporting -> Invoicing
  const briefingActive = [...active].sort((a, b) => BRIEFING_ORDER.indexOf(a.status) - BRIEFING_ORDER.indexOf(b.status))
  const role = session?.user?.role
  const canEditBase = ['OWNER', 'PROJECT_MANAGER'].includes(role)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        {title}
        <span className="text-xs font-normal text-gray-400">({active.length} aktif dari {projects.length})</span>
      </h2>

      {/* Pipeline overview, ordered to end with Reporting & Invoicing for morning briefing */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Pipeline Project</h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <Link key={stage.key} href={`/projects?status=${stage.key}`} className="group text-center">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center mx-auto text-lg font-bold text-orange-600 group-hover:bg-orange-100 group-hover:scale-110 group-hover:border-orange-300 transition-all duration-200">
                  {countByStatus[stage.key]}
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-1 w-2 h-0.5 bg-gray-200" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{stage.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Active projects list — ordered for morning briefing */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Project Aktif (urutan briefing)</h3>
          <Link href="/projects" className="text-xs text-orange-500 hover:text-orange-600">Lihat semua →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {briefingActive.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Tidak ada project aktif</p>
          )}
          {briefingActive.map(p => (
            <ProjectRow key={p.id} project={p} canEdit={canEditBase || (role === 'DIRECTOR' && p.division === session?.user?.divisi)} onChanged={onChanged} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectRow({ project: p, canEdit, onChanged }) {
  const [open, setOpen] = useState(false)
  const [statusVal, setStatusVal] = useState(p.status)
  const [dateVal, setDateVal] = useState(p.startDate ? p.startDate.slice(0, 10) : '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const data = { status: statusVal, startDate: dateVal || null }
    if (note.trim()) data.notes = p.notes ? `${p.notes}\n[${new Date().toLocaleDateString('id-ID')}] ${note.trim()}` : note.trim()
    const res = await fetch(`/api/projects/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      setOpen(false)
      setNote('')
      onChanged?.()
    } else {
      alert('Gagal menyimpan perubahan')
    }
  }

  return (
    <div className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <Link href={`/projects/${p.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-mono">{p.code}</span>
            <CategoryBadge category={p.category} />
          </div>
          <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{p.name}</p>
          <p className="text-xs text-gray-500">{p.client?.name} · PIC: {p.pic?.name || '—'}</p>
        </Link>
        <div className="shrink-0 mt-0.5 flex items-center gap-2">
          <StatusBadge status={p.status} />
          {canEdit && (
            <button onClick={() => setOpen(v => !v)} className="text-xs text-gray-400 hover:text-orange-500 border border-gray-200 rounded px-1.5 py-0.5">
              {open ? 'Tutup' : 'Update'}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 ml-0 sm:ml-0 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="label">Pindah Stage</label>
              <select className="select" value={statusVal} onChange={e => setStatusVal(e.target.value)}>
                {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                <option value="DONE">Done</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>
            <div>
              <label className="label">Tanggal Pelaksanaan</label>
              <input type="date" className="input" value={dateVal} onChange={e => setDateVal(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Catatan Tambahan</label>
            <textarea className="input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan untuk update ini (opsional)" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setOpen(false)} className="btn-secondary text-xs px-3 py-1.5">Batal</button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
}

function CashPositionCard({ data }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Posisi Kas</h3>
        <Link href="/cashflow" className="text-xs font-medium text-brand hover:underline">Kelola Kas →</Link>
      </div>
      <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
        <p className="text-xs text-gray-500">Saldo Kas Saat Ini</p>
        <p className={`text-2xl font-bold ${data.cashBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(data.cashBalance)}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-orange-50">
          <p className="text-xs text-gray-500">Menunggu Approval</p>
          <p className="text-lg font-bold text-orange-600">{formatRupiah(data.pendingApproval.amount)}</p>
          <p className="text-xs text-gray-400">{data.pendingApproval.count} pengajuan</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50">
          <p className="text-xs text-gray-500">Siap Dibayar</p>
          <p className="text-lg font-bold text-blue-600">{formatRupiah(data.readyToPay.amount)}</p>
          <p className="text-xs text-gray-400">{data.readyToPay.count} pengajuan</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50">
          <p className="text-xs text-gray-500">Sudah Dibayar Bulan Ini</p>
          <p className="text-lg font-bold text-green-600">{formatRupiah(data.paidThisMonth.amount)}</p>
          <p className="text-xs text-gray-400">{data.paidThisMonth.count} pembayaran</p>
        </div>
      </div>

      {data.upcoming.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Jatuh Tempo 14 Hari ke Depan</p>
          <div className="space-y-1.5">
            {data.upcoming.map(item => (
              <Link key={item.id} href={`/projects/${item.project.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{item.label} <span className="text-gray-400">— {item.project.name}</span></p>
                  <p className="text-xs text-gray-400">{new Date(item.neededDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{formatRupiah(item.amount)}</p>
                  {item.hasPendingPayment ? (
                    <p className="text-[10px] text-blue-500">Sudah diajukan</p>
                  ) : (
                    <p className="text-[10px] text-red-500">Belum diajukan</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Memuat...</p>
      </div>
    </div>
  )
}
