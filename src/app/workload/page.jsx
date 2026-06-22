'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import clsx from 'clsx'
import { KPI_BY_ROLE, KPI_SCORE_LABEL, KPI_DEADLINE_DAY, resolveKpiPeriod, STATUS_PIPELINE, STATUS_LABEL } from '@/lib/constants'
import { CROSS_TEAM_PM_EMAIL } from '@/lib/rbac'
import KpiCriteriaEditor from '@/components/KpiCriteriaEditor'
import KpiPanel from '@/components/KpiPanel'
import * as XLSX from 'xlsx'

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const LOAD_COLOR = (score) => {
  if (score <= 0) return 'bg-gray-100 text-gray-400'
  if (score <= 2) return 'bg-green-100 text-green-700'
  if (score <= 4) return 'bg-yellow-100 text-yellow-700'
  if (score <= 6) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const LOAD_LABEL = (score) => {
  if (score <= 0) return 'Kosong'
  if (score <= 2) return 'Ringan'
  if (score <= 4) return 'Normal'
  if (score <= 6) return 'Padat'
  return 'Overload'
}

const formatScore = (score) => Number.isInteger(score) ? String(score) : score.toFixed(1)

const MANAGER_ROLES = ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF']

export default function WorkloadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('workload') // 'workload' | 'recap'
  const [workload, setWorkload] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [filterDivisi, setFilterDivisi] = useState('')
  const [teamList, setTeamList] = useState([])
  const now = new Date()

  // Rekap bulanan state
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [recapMonth, setRecapMonth] = useState(currentMonthStr)
  const [recap, setRecap] = useState(null)
  const [recapLoading, setRecapLoading] = useState(false)

  const toDateStr = (d) => d.toISOString().slice(0, 10)
  const defaultTo = toDateStr(now)
  const defaultFrom = toDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))

  const [dateFrom, setDateFrom] = useState(defaultFrom)
  const [dateTo, setDateTo] = useState(defaultTo)

  const fetchWorkload = (from, to) => {
    if (status !== 'authenticated') return
    setLoading(true)
    const isManager = MANAGER_ROLES.includes(session?.user.role)
    const params = `dateFrom=${from}&dateTo=${to}`
    fetch(`/api/workload?${params}`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        if (isManager) {
          setWorkload(data.filter(w => w.user.id !== session.user.id))
        } else {
          const mine = data.filter(w => w.user.id === session.user.id)
          setWorkload(mine)
          if (mine.length > 0) setSelectedUser(mine[0])
        }
      }
      setLoading(false)
    })
  }

  const fetchRecap = (month) => {
    setRecapLoading(true)
    fetch(`/api/workload/monthly-recap?month=${month}`)
      .then(r => r.json())
      .then(data => { setRecap(data); setRecapLoading(false) })
      .catch(() => setRecapLoading(false))
  }

  const exportRecapExcel = () => {
    if (!recap?.recap) return
    const [y, m] = recap.month.split('-')
    const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    const rows = recap.recap.map(r => ({
      'Nama': r.nama,
      'Jabatan': r.jabatan,
      'Divisi': r.divisi,
      'Total Tugas': r.totalTugas,
      'Selesai': r.selesai,
      'Belum Selesai': r.belumSelesai,
      'Terlambat': r.terlambat,
      'Completion Rate (%)': r.completionRate,
      'Hari Kerja': r.hariKerja,
      'Hari Dengan Update': r.hariUpdate,
      'Update Compliance (%)': r.updateCompliance,
      'On Track': r.onTrack,
      'Delayed': r.delayed,
      'Hold': r.hold,
      'Problem': r.problem,
      'Done (Update)': r.doneUpdates,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    // Set column widths
    ws['!cols'] = [
      { wch: 22 }, { wch: 22 }, { wch: 16 },
      { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
      { wch: 12 }, { wch: 20 }, { wch: 22 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${monthName}`)
    XLSX.writeFile(wb, `Rekap-Tim-${recap.month}.xlsx`)
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/team').then(r => r.json()).then(data => setTeamList(Array.isArray(data) ? data : []))
    fetchWorkload(dateFrom, dateTo)
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (activeTab === 'recap' && !recap) fetchRecap(recapMonth)
  }, [activeTab, status])

  const isManager = MANAGER_ROLES.includes(session?.user.role)

  const filtered = workload.filter(w => !filterDivisi || w.user.divisi === filterDivisi)
  const eventTeam = workload.filter(w => w.user.divisi === 'EVENT')
  const creativeTeam = workload.filter(w => w.user.divisi === 'CREATIVE')

  const totalActive = workload.reduce((sum, w) => sum + w.activeCount, 0)

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Workload Tim</h1>
              <p className="text-sm text-gray-500">{totalActive} project aktif dalam periode ini</p>
            </div>
            {isManager && activeTab === 'workload' && (
              <select className="select w-auto" value={filterDivisi} onChange={e => setFilterDivisi(e.target.value)}>
                <option value="">Semua Divisi</option>
                <option value="EVENT">Event</option>
                <option value="CREATIVE">Creative</option>
                <option value="PH">Production House</option>
                <option value="FINANCE_HRGA">Finance / HR / GA</option>
              </select>
            )}
          </div>

          {/* Tab selector — only show to managers */}
          {isManager && (
            <div className="flex gap-1 border-b border-gray-200">
              {[
                { key: 'workload', label: '📊 Workload Tim' },
                { key: 'recap', label: '📋 Rekap Bulanan' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.key
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'workload' && (
            <div className="card p-3 flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Dari</label>
                <input type="date" className="input text-sm py-1.5" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Sampai</label>
                <input type="date" className="input text-sm py-1.5" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <button
                onClick={() => fetchWorkload(dateFrom, dateTo)}
                className="btn-primary text-sm py-1.5 px-4"
              >Tampilkan</button>
              <button
                onClick={() => { setDateFrom(defaultFrom); setDateTo(defaultTo); fetchWorkload(defaultFrom, defaultTo) }}
                className="text-sm text-gray-400 hover:text-brand-600 underline"
              >Reset (30 hari)</button>
            </div>
          )}
        </div>

        {/* ── REKAP BULANAN TAB ── */}
        {activeTab === 'recap' && isManager && (
          <div className="space-y-4">
            <div className="card p-4 flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Bulan</label>
                <input
                  type="month"
                  className="input text-sm py-1.5"
                  value={recapMonth}
                  onChange={e => setRecapMonth(e.target.value)}
                />
              </div>
              <button
                onClick={() => fetchRecap(recapMonth)}
                className="btn-primary text-sm py-1.5 px-4"
                disabled={recapLoading}
              >{recapLoading ? 'Memuat...' : 'Tampilkan'}</button>
              <button
                onClick={exportRecapExcel}
                disabled={!recap?.recap?.length}
                className="text-sm px-4 py-1.5 rounded-lg border border-green-500 text-green-700 hover:bg-green-50 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >⬇ Export Excel</button>
            </div>

            {recapLoading && <div className="text-center py-12 text-gray-400 text-sm">Memuat rekap...</div>}

            {!recapLoading && recap?.recap && (
              <div className="card overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Nama</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Jabatan</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Divisi</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Total Tugas</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-green-700 whitespace-nowrap">✓ Selesai</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-amber-700 whitespace-nowrap">⏳ Belum</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-red-600 whitespace-nowrap">⚠ Terlambat</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Completion %</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Hari Update</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Compliance %</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-blue-600 whitespace-nowrap">On Track</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-orange-600 whitespace-nowrap">Delayed</th>
                      <th className="text-center px-3 py-2.5 font-semibold text-red-600 whitespace-nowrap">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recap.recap.map(r => (
                      <tr key={r.userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{r.nama}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{r.jabatan}</td>
                        <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{r.divisi}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-gray-700">{r.totalTugas}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-green-700">{r.selesai}</td>
                        <td className="px-3 py-2.5 text-center text-amber-700">{r.belumSelesai}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={r.terlambat > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>
                            {r.terlambat}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={clsx(
                            'px-2 py-0.5 rounded-full font-semibold',
                            r.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                            r.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-600'
                          )}>{r.completionRate}%</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">
                          {r.hariUpdate}/{r.hariKerja}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={clsx(
                            'px-2 py-0.5 rounded-full font-semibold',
                            r.updateCompliance >= 80 ? 'bg-green-100 text-green-700' :
                            r.updateCompliance >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-600'
                          )}>{r.updateCompliance}%</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-blue-600">{r.onTrack}</td>
                        <td className="px-3 py-2.5 text-center text-orange-600">{r.delayed}</td>
                        <td className="px-3 py-2.5 text-center text-red-600">{r.problem}</td>
                      </tr>
                    ))}
                    {recap.recap.length === 0 && (
                      <tr>
                        <td colSpan={13} className="text-center py-10 text-gray-400">Tidak ada data untuk bulan ini</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
                  Hari kerja bulan ini: <strong>{recap.workdays} hari</strong> · Data per {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'workload' && loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat workload...</div>}

        {activeTab === 'workload' && !loading && isManager && (
          <>
            {/* Summary heatmap */}
            <div className="card p-5 border-t-4 border-blue-400">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2"><span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">📊</span>Distribusi Beban Kerja</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(w => (
                  <button
                    key={w.user.id}
                    onClick={() => setSelectedUser(selectedUser?.user.id === w.user.id ? null : w)}
                    className={clsx(
                      'rounded-xl p-3 text-left transition-all duration-200 border-2 hover:shadow-md hover:-translate-y-0.5',
                      selectedUser?.user.id === w.user.id ? 'border-brand-500 shadow-md' : 'border-transparent',
                      LOAD_COLOR(w.loadScore)
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
                        <span className="text-2xl font-bold">{formatScore(w.loadScore)}</span>
                        <span className="text-xs opacity-70 ml-1">skor</span>
                      </div>
                      <span className="text-xs font-medium opacity-80">{LOAD_LABEL(w.loadScore)}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs opacity-70">
                      <span>{w.activeCount} project aktif</span>
                      <span>·</span>
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
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Ringan (&le;2)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> Normal (&le;4)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Padat (&le;6)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> Overload (&gt;6)</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Skor dihitung dari bobot setiap fase project (lihat pengaturan skor di bawah).</p>
            </div>

            {(session.user.role === 'OWNER' || session.user.role === 'DIRECTOR') && (
              <WorkloadWeightsEditor />
            )}

            {/* Team comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamColumn title="Divisi Event" members={eventTeam} onSelect={setSelectedUser} selectedId={selectedUser?.user.id} accentClass="border-emerald-400" />
              <TeamColumn title="Divisi Creative" members={creativeTeam} onSelect={setSelectedUser} selectedId={selectedUser?.user.id} accentClass="border-purple-400" />
            </div>
          </>
        )}

        {/* Detail panel — selected user or self */}
        {activeTab === 'workload' && (selectedUser || (!isManager && workload.length > 0)) && (
          <UserDetail data={selectedUser || workload[0]} session={session} teamList={teamList} canReassign={isManager} />
        )}

      </main>
    </div>
  )
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function WorkloadWeightsEditor() {
  const [open, setOpen] = useState(false)
  const [weights, setWeights] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open && !weights) {
      fetch('/api/workload/weights').then(r => r.ok ? r.json() : null).then(setWeights)
    }
  }, [open])

  const setWeight = (status, key, value) => {
    setWeights(w => ({ ...w, [status]: { ...w[status], [key]: value } }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/workload/weights', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weights),
    })
    setSaving(false)
    if (res.ok) {
      setWeights(await res.json())
      setSaved(true)
    }
  }

  return (
    <div className="card p-5 border-t-4 border-brand-400">
      <button onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full text-left">
        <h3 className="text-sm font-semibold text-gray-700">Pengaturan Skor Beban Kerja</h3>
        <span className="text-xs text-gray-400">{open ? 'Tutup' : 'Atur'}</span>
      </button>
      {open && (
        <div className="mt-3">
          {!weights ? (
            <p className="text-sm text-gray-400">Memuat...</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Atur seberapa besar setiap fase project menambah skor beban kerja seseorang.
                Bobot PIC berlaku untuk PM/penanggung jawab project, bobot Anggota untuk member lain
                yang ikut terlibat di project tersebut.
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 px-1">
                  <span>Fase</span>
                  <span>Bobot PIC</span>
                  <span>Bobot Anggota</span>
                </div>
                {STATUS_PIPELINE.map(status => (
                  <div key={status} className="grid grid-cols-3 gap-2 items-center">
                    <span className="text-sm text-gray-700">{STATUS_LABEL[status]}</span>
                    <input
                      type="number" step="0.5" min="0" className="input text-sm py-1"
                      value={weights[status]?.picWeight ?? 0}
                      onChange={e => setWeight(status, 'picWeight', e.target.value)}
                    />
                    <input
                      type="number" step="0.5" min="0" className="input text-sm py-1"
                      value={weights[status]?.memberWeight ?? 0}
                      onChange={e => setWeight(status, 'memberWeight', e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={save} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                  {saving ? 'Menyimpan...' : 'Simpan Skor'}
                </button>
                {saved && <span className="text-xs text-green-600">Tersimpan ✓</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TeamColumn({ title, members, onSelect, selectedId, accentClass = 'border-emerald-400' }) {
  if (members.length === 0) return null
  return (
    <div className={`card p-4 border-t-4 ${accentClass}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {members.map(w => (
          <button
            key={w.user.id}
            onClick={() => onSelect(w)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
              selectedId === w.user.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-gray-50'
            )}
          >
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0', LOAD_COLOR(w.loadScore))}>
              {w.user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{w.user.name}</p>
              <p className="text-xs text-gray-400">{w.user.jobTitle}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-800">{formatScore(w.loadScore)}</p>
              <p className="text-xs text-gray-400">skor</p>
            </div>
            <div className="w-16 bg-gray-100 rounded-full h-1.5 shrink-0">
              <div
                className={clsx('h-1.5 rounded-full', w.loadScore <= 2 ? 'bg-green-400' : w.loadScore <= 4 ? 'bg-yellow-400' : w.loadScore <= 6 ? 'bg-orange-400' : 'bg-red-400')}
                style={{ width: `${Math.min(100, (w.loadScore / 8) * 100)}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function UserDetail({ data, session, teamList = [], canReassign = false }) {
  const [showAll, setShowAll] = useState(false)
  const [tasks, setTasks] = useState(data.tasks || [])
  const [reassigning, setReassigning] = useState(null)

  useEffect(() => { setTasks(data.tasks || []) }, [data])

  const handleReassign = async (taskId, assigneeId) => {
    setReassigning(taskId)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId }),
    })
    setTasks(t => t.filter(x => x.id !== taskId))
    setReassigning(null)
  }

  const activeProjects = (data.projects || []).filter(p => p.involved)
  const displayed = showAll ? (data.projects || []) : activeProjects

  return (
    <div className="card p-5 border-t-4 border-pink-400">
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
          {data.user.name[0]}
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">{data.user.name}</h2>
          <p className="text-xs text-gray-500">{data.user.jobTitle} · Divisi {data.user.divisi}</p>
        </div>
        <div className="ml-auto flex gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-brand-600">{data.activeCount}</p>
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

      {KPI_BY_ROLE[data.user.role] && (
        <KpiPanel user={data.user} session={session} />
      )}

      {/* Active task list — for delegation/reassignment */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tugas Berjalan ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">Tidak ada tugas berjalan.</p>
        ) : (
          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:shadow-sm hover:border-gray-200 transition-all duration-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {t.project && <span className="text-xs text-gray-400 font-mono">{t.project.code}</span>}
                    <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium',
                      t.priority === 'HIGH' ? 'bg-red-100 text-red-600' : t.priority === 'LOW' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700')}>
                      {t.priority}
                    </span>
                    <span className="text-xs text-gray-400">{t.status}</span>
                  </div>
                  <p className="text-sm text-gray-800 truncate">{t.title}</p>
                  {t.project && <p className="text-xs text-gray-400 truncate">{t.project.name}</p>}
                </div>
                {canReassign && (
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 shrink-0"
                    value=""
                    disabled={reassigning === t.id}
                    onChange={e => e.target.value && handleReassign(t.id, e.target.value)}
                  >
                    <option value="">Delegasikan ke...</option>
                    {teamList.filter(u => u.id !== data.user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {showAll ? 'Semua Project' : 'Project Aktif'}
        </h3>
        <button onClick={() => setShowAll(!showAll)} className="text-xs text-brand-500 hover:text-brand-600">
          {showAll ? 'Tampilkan aktif saja' : `Tampilkan semua (${data.totalProjects})`}
        </button>
      </div>

      <div className="space-y-2">
        {displayed.map(p => (
          <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                {p.isPic && <span className="text-xs bg-brand-100 text-brand-700 px-1.5 rounded font-medium">PIC</span>}
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
