'use client'
import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import Navbar from '@/components/Navbar'
import { StatusBadge } from '@/components/StatusBadge'
import { STATUS_LABEL, ACTIVE_STATUSES, WON_STATUSES, CATEGORY_LABEL, STATUS_GROUP_COLOR } from '@/lib/constants'
import { HEALTH_LABEL, HEALTH_COLOR, HEALTH_DOT } from '@/lib/health'
import { isFinanceDirector } from '@/lib/rbac'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const RevenueTrendCharts = dynamic(() => import('@/components/RevenueTrendChart'), { ssr: false })

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
  const [debtSummary, setDebtSummary] = useState(null)
  const [cashSummary, setCashSummary] = useState(null)
  const [overview, setOverview] = useState(null)
  const [overviewRange, setOverviewRange] = useState(null) // { from: 'YYYY-MM', to: 'YYYY-MM' }
  const [trendsData, setTrendsData] = useState(null)
  const [trendsYear, setTrendsYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchProjects = () => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }

  // One combined request: projects + role-gated finance widgets, fetched
  // server-side in parallel instead of 4-5 separate client round-trips.
  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/dashboard/summary').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) { setLoading(false); return }
      setProjects(Array.isArray(data.projects) ? data.projects : [])
      if (data.cashPosition) setCashPosition(data.cashPosition)
      if (data.cashSummary) setCashSummary(data.cashSummary)
      if (data.debtSummary) setDebtSummary(data.debtSummary)
      if (data.overview) {
        setOverview(data.overview)
        skipNextOverviewFetch.current = true
        setOverviewRange({ from: data.overview.from, to: data.overview.to })
      }
      setLoading(false)
    })
  }, [status])

  const skipNextOverviewFetch = useRef(false)
  useEffect(() => {
    if (!overviewRange) return
    if (skipNextOverviewFetch.current) { skipNextOverviewFetch.current = false; return }
    const params = new URLSearchParams(overviewRange)
    fetch(`/api/finance/overview?${params}`).then(r => r.ok ? r.json() : null).then(data => { if (data) setOverview(data) })
  }, [overviewRange])

  // Fetch trend charts (Owner/Finance/Director only)
  useEffect(() => {
    if (status !== 'authenticated') return
    const role = session?.user?.role
    if (!['OWNER', 'FINANCE', 'DIRECTOR'].includes(role) && !isFinanceDirector(session?.user)) return
    fetch(`/api/dashboard/trends?year=${trendsYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setTrendsData(data) })
  }, [status, trendsYear, session])

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
    <div className="min-h-screen bg-brand-50">
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

        {/* Finance overview — Owner / Finance / Directors only */}
        {overview && overviewRange && (
          <FinanceOverviewCard data={overview} range={overviewRange} setRange={setOverviewRange} />
        )}

        {/* Trend Charts — Owner / Finance / Directors only */}
        {trendsData && (
          <RevenueTrendCharts
            data={trendsData}
            year={trendsYear}
            onYearChange={setTrendsYear}
          />
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Project" value={projects.length} sub="sepanjang tahun" color="text-gray-900" />
          <StatCard label="Project Aktif" value={activeProjects.length} sub="sedang berjalan" color="text-orange-600" />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wonProjects.length} menang dari ${pitchedTotal} pitch`} color="text-green-600" />
          <StatCard label="Project Selesai" value={projects.filter(p => p.status === 'DONE').length} sub="sudah lunas" color="text-blue-600" />
        </div>

        {/* Breakdown EO / PH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DivisionSummaryCard title="Event Organizer (EO)" projects={eoProjects} />
          <DivisionSummaryCard title="Production House (PH)" projects={phProjects} />
        </div>

        {/* Cash position — Owner / Finance / Finance Director only */}
        {cashPosition && <CashPositionCard data={cashPosition} />}

        {/* Simplified read-only cash condition — division Directors */}
        {cashSummary && <CashConditionCard data={cashSummary} />}

        {/* Debt obligations — Owner / Finance / Directors */}
        {debtSummary && debtSummary.activeDebtCount > 0 && <DebtSummaryCard data={debtSummary} />}

        {/* Projects needing attention */}
        {attentionProjects.length > 0 && (
          <div className="card border-t-4 border-blue-400">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">⚠️</span>Project Perlu Perhatian ({attentionProjects.length})</h3>
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
      <div className="card p-5 border-t-4 border-orange-400">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs">📈</span>Pipeline Project</h3>
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
      <div className="card border-t-4 border-emerald-400">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">📋</span>Project Aktif (urutan briefing)</h3>
          <Link href="/projects" className="text-xs text-orange-500 hover:text-orange-600">Lihat semua →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {briefingActive.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Tidak ada project aktif</p>
          )}
          {ACTIVE_STATUSES.filter(s => briefingActive.some(p => p.status === s)).map(s => {
            const projectsInStatus = briefingActive.filter(p => p.status === s)
            return (
              <details key={s} open className="group">
                <summary className={clsx('px-5 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none list-none', STATUS_GROUP_COLOR[s] || 'bg-gray-500 text-white')}>
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {STATUS_LABEL[s] || s}
                    <span className="text-xs font-normal opacity-80">({projectsInStatus.length})</span>
                  </span>
                  <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="divide-y divide-gray-50 border-t border-gray-50">
                  {projectsInStatus.map(p => (
                    <ProjectRow key={p.id} project={p} canEdit={canEditBase || (role === 'DIRECTOR' && p.division === session?.user?.divisi)} onChanged={onChanged} />
                  ))}
                </div>
              </details>
            )
          })}
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
          <span className="text-xs text-gray-400 font-mono">{p.code} · {CATEGORY_LABEL[p.category] || p.category}</span>
          <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{p.name}</p>
          <p className="text-xs text-gray-500">{p.client?.name} · PIC: {p.pic?.name || '—'}</p>
        </Link>
        <div className="shrink-0 mt-0.5 flex items-center gap-2">
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

// Compact display: "Rp 6,6 M" (miliar) / "Rp 234 jt" (juta) / plain rupiah for small values
function formatCompactRupiah(n) {
  const v = Math.round(n || 0)
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)} jt`
  return formatRupiah(v)
}

const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function MonthYearSelect({ value, onChange }) {
  const [y, m] = value.split('-').map(Number)
  const years = []
  const nowY = new Date().getFullYear()
  for (let yr = nowY - 2; yr <= nowY + 1; yr++) years.push(yr)
  return (
    <div className="flex items-center gap-1">
      <select className="select text-xs py-1 w-16 px-1" value={m} onChange={e => onChange(`${y}-${String(Number(e.target.value)).padStart(2, '0')}`)}>
        {MONTH_LABEL.map((lbl, i) => <option key={i} value={i + 1}>{lbl}</option>)}
      </select>
      <select className="select text-xs py-1 w-[4.5rem] px-1" value={y} onChange={e => onChange(`${e.target.value}-${String(m).padStart(2, '0')}`)}>
        {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  )
}

function FinanceOverviewCard({ data, range, setRange }) {
  const cards = [
    { key: 'omset', label: 'Total Omset', value: formatCompactRupiah(data.totalOmset), sub: `${MONTH_LABEL[Number(range.from.split('-')[1]) - 1]} ${range.from.split('-')[0]} – ${MONTH_LABEL[Number(range.to.split('-')[1]) - 1]} ${range.to.split('-')[0]}`, icon: '📈', color: 'blue' },
    { key: 'ekspektasi', label: 'Ekspektasi Profit', value: formatCompactRupiah(data.ekspektasiProfit), sub: 'estimasi margin vs forecast', icon: '📊', color: 'emerald' },
    { key: 'aktual', label: 'Aktual Nett Profit', value: formatCompactRupiah(data.aktualNettProfit), sub: 'margin aktual − opex', icon: '✅', color: 'emerald' },
    { key: 'opex', label: 'Total Opex', value: formatCompactRupiah(data.totalOpex), sub: 'biaya operasional', icon: '↙️', color: 'rose' },
    { key: 'piutang', label: 'Piutang', value: formatCompactRupiah(data.piutang.amount), sub: `${data.piutang.count} project invoicing`, icon: '📄', color: 'orange' },
    { key: 'pitchgagal', label: 'Pitch Gagal', value: formatCompactRupiah(data.pitchGagal.value), sub: `Profit hilang: ${formatCompactRupiah(data.pitchGagal.lostProfit)}`, icon: '📉', color: 'rose' },
    { key: 'aset', label: 'Total Nilai Aset', value: formatCompactRupiah(data.totalNilaiAset.value), sub: `${data.totalNilaiAset.count} aset tercatat`, icon: '🗂️', color: 'blue' },
    { key: 'hutang', label: 'Total Hutang Aktif', value: formatCompactRupiah(data.totalHutangAktif.value), sub: `Bunga/bln: ${formatCompactRupiah(data.totalHutangAktif.monthlyInterest)}`, icon: '🏦', color: 'rose' },
  ]
  const colorMap = {
    blue: { border: 'border-blue-400', bg: 'bg-blue-100', text: 'text-blue-600' },
    emerald: { border: 'border-emerald-400', bg: 'bg-emerald-100', text: 'text-emerald-600' },
    orange: { border: 'border-orange-400', bg: 'bg-orange-100', text: 'text-orange-600' },
    rose: { border: 'border-rose-400', bg: 'bg-rose-100', text: 'text-rose-600' },
  }
  return (
    <div className="card p-5 border-t-4 border-indigo-400">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">💼</span>
          Overview Keuangan Perusahaan
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Dari</span>
          <MonthYearSelect value={range.from} onChange={v => setRange(r => ({ ...r, from: v }))} />
          <span>Sampai</span>
          <MonthYearSelect value={range.to} onChange={v => setRange(r => ({ ...r, to: v }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => {
          const cm = colorMap[c.color]
          return (
            <div key={c.key} className={`p-3 rounded-xl border-t-4 ${cm.border} bg-gray-50`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{c.label}</p>
                <span className={`w-5 h-5 rounded-full ${cm.bg} ${cm.text} flex items-center justify-center text-[10px]`}>{c.icon}</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900 mt-1 break-words">{c.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{c.sub}</p>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Hanya terlihat oleh Direksi & Management.</p>
    </div>
  )
}

function CashPositionCard({ data }) {
  return (
    <div className="card p-5 border-t-4 border-purple-400">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs">💰</span>Posisi Kas</h3>
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

function DivisionSummaryCard({ title, projects }) {
  const active = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const won = projects.filter(p => p.pitchResult === 'WIN')
  const lose = projects.filter(p => p.pitchResult === 'LOSE')
  const pitchedTotal = won.length + lose.length
  const winRate = pitchedTotal > 0 ? Math.round((won.length / pitchedTotal) * 100) : 0
  const done = projects.filter(p => p.status === 'DONE')

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Total Project</p>
          <p className="text-xl font-bold text-gray-900">{projects.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Aktif</p>
          <p className="text-xl font-bold text-orange-600">{active.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Win Rate</p>
          <p className="text-xl font-bold text-green-600">{winRate}%</p>
          <p className="text-[11px] text-gray-400">{won.length} dari {pitchedTotal} pitch</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Selesai</p>
          <p className="text-xl font-bold text-blue-600">{done.length}</p>
        </div>
      </div>
    </div>
  )
}

function CashConditionCard({ data }) {
  return (
    <div className="card p-5 border-t-4 border-pink-400">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center text-xs">🏦</span>Kondisi Keuangan Watermark</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-500">Saldo Kas Saat Ini</p>
          <p className={`text-2xl font-bold ${data.cashBalance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(data.cashBalance)}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50">
          <p className="text-xs text-gray-500">Kebutuhan Dana Menunggu Cair</p>
          <p className="text-2xl font-bold text-orange-600">{formatRupiah(data.pendingDisbursement)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Pengajuan yang sudah disetujui/dalam proses approval</p>
        </div>
      </div>
    </div>
  )
}

function DebtSummaryCard({ data }) {
  const dueItems = [...data.overdue, ...data.dueThisMonth]
  const overdueCount = data.overdue?.length || 0
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card border-t-4 border-teal-400 overflow-hidden">
      {/* Header — always visible, clickable to expand/collapse */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-sm">📉</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">Kewajiban Hutang</p>
            <p className="text-xs text-gray-400">{data.activeDebtCount} pinjaman · {dueItems.length} cicilan jatuh tempo{overdueCount > 0 && <span className="ml-1 text-red-500 font-medium">({overdueCount} lewat tenggat)</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Sisa pokok</p>
            <p className="text-sm font-bold text-gray-900">{formatRupiah(data.outstandingPrincipal)}</p>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 text-lg leading-none ${expanded ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-gray-500">Sisa Pokok Hutang</p>
              <p className="text-lg font-bold text-gray-900 break-words">{formatRupiah(data.outstandingPrincipal)}</p>
              <p className="text-xs text-gray-400">{data.activeDebtCount} pinjaman aktif</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50">
              <p className="text-xs text-gray-500">Wajib Dibayar Bulan Ini</p>
              <p className="text-lg font-bold text-orange-600 break-words">{formatRupiah(data.monthlyObligation)}</p>
              <p className="text-xs text-gray-400">{dueItems.length} cicilan</p>
            </div>
          </div>

          {dueItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cicilan Jatuh Tempo</p>
              <div className="space-y-2">
                {dueItems.map(item => {
                  const overdue = new Date(item.dueDate) < new Date()
                  const total = item.principalAmount + item.interestAmount
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-2.5 rounded-lg bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">
                          <span className="break-words">{item.lenderName} · cicilan ke-{item.installmentNo}</span>
                          {overdue && <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium align-middle">Lewat Tenggat</span>}
                        </p>
                        <p className="text-xs text-gray-400">Jatuh tempo {new Date(item.dueDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 shrink-0">{formatRupiah(total)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100">
            <Link href="/debts" className="text-xs font-medium text-brand hover:underline">Kelola Hutang →</Link>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Memuat...</p>
      </div>
    </div>
  )
}
