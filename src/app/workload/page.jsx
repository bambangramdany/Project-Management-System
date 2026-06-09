'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import clsx from 'clsx'

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const LOAD_COLOR = (count) => {
  if (count === 0) return 'bg-gray-100 text-gray-400'
  if (count <= 2) return 'bg-green-100 text-green-700'
  if (count <= 4) return 'bg-yellow-100 text-yellow-700'
  if (count <= 6) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const LOAD_LABEL = (count) => {
  if (count === 0) return 'Kosong'
  if (count <= 2) return 'Ringan'
  if (count <= 4) return 'Normal'
  if (count <= 6) return 'Padat'
  return 'Overload'
}

export default function WorkloadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workload, setWorkload] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [filterDivisi, setFilterDivisi] = useState('')
  const now = new Date()
  const [filterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const isManager = ['OWNER', 'PROJECT_MANAGER'].includes(session.user.role)

    if (isManager) {
      fetch(`/api/workload?year=${now.getFullYear()}`).then(r => r.json()).then(data => {
        setWorkload(Array.isArray(data) ? data : [])
        setLoading(false)
      })
    } else {
      // Non-managers: show only their own workload
      fetch(`/api/workload?year=${now.getFullYear()}`).then(r => r.json()).then(data => {
        if (Array.isArray(data)) {
          const mine = data.filter(w => w.user.id === session.user.id)
          setWorkload(mine)
          if (mine.length > 0) setSelectedUser(mine[0])
        }
        setLoading(false)
      })
    }
  }, [status])

  const isManager = ['OWNER', 'PROJECT_MANAGER'].includes(session?.user.role)

  const filtered = workload.filter(w => !filterDivisi || w.user.divisi === filterDivisi)
  const eventTeam = workload.filter(w => w.user.divisi === 'EVENT')
  const creativeTeam = workload.filter(w => w.user.divisi === 'CREATIVE')

  const totalActive = workload.reduce((sum, w) => sum + w.activeCount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workload Tim</h1>
            <p className="text-sm text-gray-500">{now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} · {totalActive} project aktif total</p>
          </div>
          {isManager && (
            <select className="select w-auto" value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)}>
              <option value="">Semua Divisi</option>
              <option value="EVENT">Event</option>
              <option value="CREATIVE">Creative</option>
            </select>
          )}
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat workload...</div>}

        {!loading && isManager && (
          <>
            {/* Summary heatmap */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribusi Beban Kerja</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(w => (
                  <button
                    key={w.user.id}
                    onClick={() => setSelectedUser(selectedUser?.user.id === w.user.id ? null : w)}
                    className={clsx(
                      'rounded-xl p-3 text-left transition-all border-2',
                      selectedUser?.user.id === w.user.id ? 'border-orange-400 shadow-md' : 'border-transparent',
                      LOAD_COLOR(w.activeCount)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white bg-opacity-60 flex items-center justify-center font-bold text-sm">
                        {w.user.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{w.user.name}</p>
                        <p className="text-xs opacity-70">{w.user.jobTitle || w.user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold">{w.activeCount}</span>
                        <span className="text-xs opacity-70 ml-1">aktif</span>
                      </div>
                      <span className="text-xs font-medium opacity-80">{LOAD_LABEL(w.activeCount)}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs opacity-70">
                      <span>PIC: {w.picCount}</span>
                      <span>·</span>
                      <span>Member: {w.memberCount}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Kosong (0)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Ringan (1-2)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Normal (3-4)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Padat (5-6)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Overload (7+)</span>
              </div>
            </div>

            {/* Team comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamColumn title="Divisi Event" members={eventTeam} onSelect={setSelectedUser} selectedId={selectedUser?.user.id} />
              <TeamColumn title="Divisi Creative" members={creativeTeam} onSelect={setSelectedUser} selectedId={selectedUser?.user.id} />
            </div>
          </>
        )}

        {/* Detail panel — selected user or self */}
        {(selectedUser || (!isManager && workload.length > 0)) && (
          <UserDetail data={selectedUser || workload[0]} />
        )}

      </main>
    </div>
  )
}

function TeamColumn({ title, members, onSelect, selectedId }) {
  if (members.length === 0) return null
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {members.map(w => (
          <button
            key={w.user.id}
            onClick={() => onSelect(w)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
              selectedId === w.user.id ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-gray-50'
            )}
          >
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0', LOAD_COLOR(w.activeCount))}>
              {w.user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{w.user.name}</p>
              <p className="text-xs text-gray-400">{w.user.jobTitle}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-800">{w.activeCount}</p>
              <p className="text-xs text-gray-400">aktif</p>
            </div>
            <div className="w-16 bg-gray-100 rounded-full h-1.5 shrink-0">
              <div
                className={clsx('h-1.5 rounded-full', w.activeCount <= 2 ? 'bg-green-400' : w.activeCount <= 4 ? 'bg-yellow-400' : w.activeCount <= 6 ? 'bg-orange-400' : 'bg-red-400')}
                style={{ width: `${Math.min(100, (w.activeCount / 8) * 100)}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function UserDetail({ data }) {
  const [showAll, setShowAll] = useState(false)
  const activeProjects = data.projects.filter(p => ['HOLD','PITCHING','WAITING_PITCH_RESULT','PREPARATION','EVENT_DAY','REPORTING','INVOICING'].includes(p.status))
  const closedProjects = data.projects.filter(p => ['DONE','FAILED','CANCELED'].includes(p.status))
  const displayed = showAll ? data.projects : activeProjects

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
          {data.user.name[0]}
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{data.user.name}</h2>
          <p className="text-xs text-gray-500">{data.user.jobTitle} · Divisi {data.user.divisi}</p>
        </div>
        <div className="ml-auto flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-orange-600">{data.activeCount}</p>
            <p className="text-xs text-gray-400">Aktif</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700">{data.picCount}</p>
            <p className="text-xs text-gray-400">Sebagai PIC</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700">{data.totalProjects}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {showAll ? 'Semua Project' : 'Project Aktif'}
        </h3>
        <button onClick={() => setShowAll(!showAll)} className="text-xs text-orange-500 hover:text-orange-600">
          {showAll ? 'Tampilkan aktif saja' : `Tampilkan semua (${data.totalProjects})`}
        </button>
      </div>

      <div className="space-y-2">
        {displayed.map(p => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                {p.isPic && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded font-medium">PIC</span>}
              </div>
              <p className="text-sm text-gray-800 truncate">{p.name}</p>
              {p.startDate && (
                <p className="text-xs text-gray-400">{new Date(p.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              )}
            </div>
            <StatusBadge status={p.status} />
          </Link>
        ))}
        {displayed.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Tidak ada project aktif</p>
        )}
      </div>
    </div>
  )
}
