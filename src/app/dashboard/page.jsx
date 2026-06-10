'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge, CategoryBadge } from '@/components/StatusBadge'
import { STATUS_LABEL, ACTIVE_STATUSES, WON_STATUSES } from '@/lib/constants'
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

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/projects').then(r => r.json()).then(data => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
    }
  }, [status])

  if (status === 'loading' || loading) return <LoadingScreen />

  const activeProjects = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const wonProjects = projects.filter(p => p.pitchResult === 'WIN')
  const loseProjects = projects.filter(p => p.pitchResult === 'LOSE')
  const pitchedTotal = wonProjects.length + loseProjects.length
  const winRate = pitchedTotal > 0 ? Math.round((wonProjects.length / pitchedTotal) * 100) : 0

  const eoProjects = projects.filter(p => (p.division || 'EVENT') !== 'PH')
  const phProjects = projects.filter(p => p.division === 'PH')

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

        {/* EO / Event division */}
        <DivisionSection title="Event Organizer (EO)" projects={eoProjects} />

        {/* Production House division */}
        <DivisionSection title="Production House (PH)" projects={phProjects} />

      </main>
    </div>
  )
}

function DivisionSection({ title, projects }) {
  const active = projects.filter(p => ACTIVE_STATUSES.includes(p.status))
  const countByStatus = {}
  PIPELINE_STAGES.forEach(s => { countByStatus[s.key] = projects.filter(p => p.status === s.key).length })
  const recentActive = active.slice(0, 8)

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
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center mx-auto text-lg font-bold text-orange-600 group-hover:bg-orange-100 transition-colors">
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

      {/* Active projects list */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Project Aktif</h3>
          <Link href="/projects" className="text-xs text-orange-500 hover:text-orange-600">Lihat semua →</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentActive.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Tidak ada project aktif</p>
          )}
          {recentActive.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                  <CategoryBadge category={p.category} />
                </div>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{p.name}</p>
                <p className="text-xs text-gray-500">{p.client?.name} · PIC: {p.pic?.name || '—'}</p>
              </div>
              <div className="shrink-0 mt-0.5">
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-4">
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
