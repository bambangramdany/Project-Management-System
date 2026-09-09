'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const VIEWER_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE', 'PROJECT_MANAGER']

const DIVISI_LABEL = {
  EVENT:        'Event Organizer',
  CREATIVE:     'Creative',
  PH:           'Production House',
  FINANCE_HRGA: 'Finance & HRGA',
}

const ROLE_LABEL = {
  PROJECT_MANAGER: 'Project Manager',
  PRODUCTION:      'Production',
  PROJECT_OFFICER: 'Project Officer',
  CREATIVE_LEAD:   'Creative Lead',
  GRAPHIC_DESIGNER:'Graphic Designer',
  STAGE_DESIGNER:  'Stage Designer',
  CONTENT_CREATOR: 'Content Creator',
  INTERNSHIP:      'Magang',
  MEMBER:          'Staff',
  DIRECTOR:        'Direktur',
  FINANCE:         'Finance',
  FINANCE_STAFF:   'Finance Staff',
  PRODUCER:        'Producer',
  EDITOR:          'Editor',
}

function pctColor(val) {
  if (val === null || val === undefined) return 'text-gray-300'
  if (val >= 80) return 'text-green-600'
  if (val >= 60) return 'text-amber-600'
  return 'text-red-500'
}

function pctBg(val) {
  if (val === null || val === undefined) return 'bg-gray-50'
  if (val >= 80) return 'bg-green-50'
  if (val >= 60) return 'bg-amber-50'
  return 'bg-red-50'
}

function ScoreBadge({ value, suffix = '%', dim }) {
  if (value === null || value === undefined) return <span className="text-xs text-gray-300">—</span>
  return (
    <span className={`text-sm font-bold tabular-nums ${pctColor(dim ?? value)}`}>
      {value}{suffix}
    </span>
  )
}

function MiniBar({ value, color = 'bg-violet-400' }) {
  if (value === null || value === undefined) return null
  return (
    <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden mt-0.5">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%`, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function TotalScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className="text-xs text-gray-300">Belum ada data</span>
  const bg = score >= 80 ? 'bg-green-500' : score >= 65 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-white text-sm font-black ${bg}`}>
      {score}
    </span>
  )
}

function UserRow({ user, expanded, onToggle }) {
  const kpiDim = user.kpiAvg !== null ? (user.kpiAvg / 5) * 100 : null
  const attDim = user.attitudeScore !== null ? (user.attitudeScore / 5) * 100 : null
  const skDim  = user.skillScore    !== null ? (user.skillScore    / 5) * 100 : null

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50/60 transition-colors cursor-pointer ${expanded ? 'bg-violet-50/30' : ''}`}
        onClick={onToggle}>
        <td className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
          <p className="text-[11px] text-gray-400">{user.jobTitle || ROLE_LABEL[user.role] || user.role}</p>
        </td>
        <td className="px-4 py-3 text-center">
          <ScoreBadge value={user.checkInRate} dim={user.checkInRate} />
          <MiniBar value={user.checkInRate}
            color={user.checkInRate >= 80 ? 'bg-green-400' : user.checkInRate >= 60 ? 'bg-amber-400' : 'bg-red-400'} />
        </td>
        <td className="px-4 py-3 text-center">
          <ScoreBadge value={user.updateRate} dim={user.updateRate} />
          <MiniBar value={user.updateRate} color="bg-violet-400" />
        </td>
        <td className="px-4 py-3 text-center">
          <ScoreBadge value={user.onTimeRate} dim={user.onTimeRate} />
        </td>
        <td className="px-4 py-3 text-center">
          {user.kpiAvg !== null
            ? <><span className={`text-sm font-bold tabular-nums ${pctColor(kpiDim)}`}>{user.kpiAvg.toFixed(1)}</span><span className="text-[10px] text-gray-400">/5</span></>
            : <span className="text-xs text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {user.attitudeScore !== null
            ? <><span className={`text-sm font-bold tabular-nums ${pctColor(attDim)}`}>{user.attitudeScore.toFixed(1)}</span><span className="text-[10px] text-gray-400">/5</span></>
            : <span className="text-xs text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          <TotalScoreBadge score={user.totalScore} />
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-violet-50/20 border-b border-violet-100">
          <td colSpan={8} className="px-4 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white rounded-xl px-3 py-2.5">
                <p className="text-gray-400 font-medium">Check-in Pagi</p>
                <p className="text-base font-black text-gray-900 mt-0.5">{user.morningCount} <span className="text-gray-400 font-normal">/ {user.workDays} hari kerja</span></p>
              </div>
              <div className="bg-white rounded-xl px-3 py-2.5">
                <p className="text-gray-400 font-medium">Laporan Sore</p>
                <p className="text-base font-black text-gray-900 mt-0.5">{user.eveningCount} <span className="text-gray-400 font-normal">kali</span></p>
              </div>
              <div className="bg-white rounded-xl px-3 py-2.5">
                <p className="text-gray-400 font-medium">Update Tugas</p>
                <p className="text-base font-black text-gray-900 mt-0.5">{user.uniqueUpdateDays} <span className="text-gray-400 font-normal">hari aktif</span></p>
              </div>
              <div className="bg-white rounded-xl px-3 py-2.5">
                <p className="text-gray-400 font-medium">Sharing Session</p>
                <p className="text-base font-black text-gray-900 mt-0.5">{user.sharingCount} <span className="text-gray-400 font-normal">sesi</span></p>
              </div>
              {user.kpiAvg !== null && (
                <div className="bg-white rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 font-medium">Skor KPI</p>
                  <p className="text-base font-black text-gray-900 mt-0.5">{user.kpiAvg.toFixed(1)}/5 <span className="text-gray-400 font-normal">({user.kpiCount} item)</span></p>
                </div>
              )}
              {user.attitudeScore !== null && (
                <div className="bg-white rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 font-medium">Sikap (HRD)</p>
                  <p className="text-base font-black text-gray-900 mt-0.5">{user.attitudeScore.toFixed(1)}/5</p>
                </div>
              )}
              {user.skillScore !== null && (
                <div className="bg-white rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 font-medium">Skill (HRD)</p>
                  <p className="text-base font-black text-gray-900 mt-0.5">{user.skillScore.toFixed(1)}/5</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth]   = useState(() => new Date().toISOString().slice(0, 7))
  const [divisi, setDivisi] = useState('')
  const [sortCol, setSortCol] = useState('totalScore')
  const [sortDir, setSortDir] = useState('desc')
  const [expanded, setExpanded] = useState({})
  const [search, setSearch]  = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !VIEWER_ROLES.includes(session.user.role)) router.push('/my-tasks')
  }, [status, session, router])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ month })
    if (divisi) params.set('divisi', divisi)
    fetch(`/api/reports/team-performance?${params}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) setData(d)
      setLoading(false)
    })
  }, [month, divisi])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const users = data?.users || []
  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? -1, bv = b[sortCol] ?? -1
    return sortDir === 'desc' ? bv - av : av - bv
  })

  // Group by divisi
  const grouped = {}
  sorted.forEach(u => {
    const key = u.divisi || 'LAINNYA'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(u)
  })

  const SortTh = ({ col, label }) => (
    <th className={`px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none hover:text-violet-600 transition-colors ${sortCol === col ? 'text-violet-600' : 'text-gray-400'}`}
      onClick={() => toggleSort(col)}>
      {label} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  const monthLabel = new Date(month + '-15').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // Summary stats
  const hasData = filtered.length > 0
  const avgCheckIn = hasData ? Math.round(filtered.reduce((s, u) => s + u.checkInRate, 0) / filtered.length) : 0
  const avgUpdate  = hasData ? Math.round(filtered.reduce((s, u) => s + u.updateRate,  0) / filtered.length) : 0
  const avgScore   = hasData ? (() => { const ws = filtered.filter(u => u.totalScore !== null); return ws.length ? Math.round(ws.reduce((s, u) => s + u.totalScore, 0) / ws.length) : null })() : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">Dashboard</Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-700 font-medium">Laporan Kinerja</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Laporan Kinerja Tim</h1>
            <p className="text-sm text-gray-500 mt-0.5">{monthLabel} · {filtered.length} anggota</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="input text-sm" />
            <select value={divisi} onChange={e => setDivisi(e.target.value)} className="select text-sm">
              <option value="">Semua Divisi</option>
              {Object.entries(DIVISI_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input className="input text-sm w-40" placeholder="Cari nama..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Summary cards */}
        {!loading && hasData && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Rata-rata Check-in</p>
              <p className={`text-2xl font-black mt-1 ${pctColor(avgCheckIn)}`}>{avgCheckIn}%</p>
              <MiniBar value={avgCheckIn} color={avgCheckIn >= 80 ? 'bg-green-400' : avgCheckIn >= 60 ? 'bg-amber-400' : 'bg-red-400'} />
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Rata-rata Update Tugas</p>
              <p className={`text-2xl font-black mt-1 ${pctColor(avgUpdate)}`}>{avgUpdate}%</p>
              <MiniBar value={avgUpdate} color="bg-violet-400" />
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100">
              <p className="text-xs text-gray-400 font-medium">Rata-rata Total Skor</p>
              <p className={`text-2xl font-black mt-1 ${avgScore !== null ? pctColor(avgScore) : 'text-gray-300'}`}>
                {avgScore !== null ? avgScore : '—'}
              </p>
              {avgScore !== null && <MiniBar value={avgScore} color={avgScore >= 80 ? 'bg-green-400' : avgScore >= 65 ? 'bg-amber-400' : 'bg-red-400'} />}
            </div>
          </div>
        )}

        {/* Weight legend */}
        {data?.weights && (
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-400">
            <span className="font-semibold text-gray-500">Bobot skor:</span>
            <span>KPI {data.weights.kpiWeight}%</span>
            <span>·</span>
            <span>Absensi {data.weights.attendanceWeight}%</span>
            <span>·</span>
            <span>Sharing {data.weights.sharingWeight}%</span>
            <span>·</span>
            <span>Sikap {data.weights.attitudeWeight}%</span>
            <span>·</span>
            <span>Skill {data.weights.skillWeight}%</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex gap-4 px-4 py-4 border-b border-gray-50">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-40 animate-pulse" />
                  <div className="h-2.5 bg-gray-100 rounded w-24 animate-pulse" />
                </div>
                {[1,2,3,4,5].map(j => <div key={j} className="w-16 h-3.5 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">Tidak ada data untuk periode ini</p>
          </div>
        ) : (
          Object.entries(grouped).map(([div, divUsers]) => (
            <div key={div} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-violet-400" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{DIVISI_LABEL[div] || div}</span>
                <span className="text-[11px] text-gray-400">{divUsers.length} orang</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Nama</th>
                      <SortTh col="checkInRate" label="Check-in" />
                      <SortTh col="updateRate" label="Update" />
                      <SortTh col="onTimeRate" label="Tepat Waktu" />
                      <SortTh col="kpiAvg" label="KPI" />
                      <SortTh col="attitudeScore" label="Sikap" />
                      <SortTh col="totalScore" label="Total Skor" />
                      <th className="px-4 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {divUsers.map(user => (
                      <UserRow key={user.id} user={user}
                        expanded={!!expanded[user.id]}
                        onToggle={() => setExpanded(p => ({ ...p, [user.id]: !p[user.id] }))} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* Footnote */}
        <p className="text-[11px] text-gray-400 text-center pb-4">
          Data real-time · {data?.workDays ?? 0} hari kerja dihitung sampai hari ini · Skor total dihitung berdasarkan bobot yang dikonfigurasi di pengaturan evaluasi
        </p>
      </main>
    </div>
  )
}
