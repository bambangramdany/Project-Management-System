'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { STATUS_COLOR, STATUS_LABEL, DIVISION_LABEL } from '@/lib/constants'

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const DAY_NAMES = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

const DIVISION_DOT = {
  EVENT: 'bg-brand-500',
  CREATIVE: 'bg-purple-500',
  PH: 'bg-blue-500',
  FINANCE_HRGA: 'bg-emerald-500',
}

function pad(n) { return String(n).padStart(2, '0') }
function ymd(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() } // month 0-indexed
  })
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/projects?light=1').then(r => r.json()).then(data => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
    }
  }, [status])

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Compute occupied date span for each project
  const projectsWithSpan = projects.filter(p => p.startDate).map(p => {
    const start = new Date(p.startDate)
    const loadIn = p.loadInDays || 0
    const spanStart = new Date(start)
    spanStart.setDate(spanStart.getDate() - loadIn)
    const end = p.endDate ? new Date(p.endDate) : start
    return { ...p, spanStart, spanEnd: end }
  })

  // Build month grid
  const { year, month } = cursor
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const projectsOnDay = (date) => {
    if (!date) return []
    return projectsWithSpan.filter(p => date >= stripTime(p.spanStart) && date <= stripTime(p.spanEnd))
  }
  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const goPrev = () => setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 })
  const goNext = () => setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 })
  const goToday = () => { const now = new Date(); setCursor({ year: now.getFullYear(), month: now.getMonth() }); setSelectedDay(null) }

  // Trend: count projects whose event falls in each of last 6 months (incl current) by status / division
  const trendMonths = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      let m = month - i, y = year
      while (m < 0) { m += 12; y -= 1 }
      months.push({ year: y, month: m })
    }
    return months.map(({ year: y, month: m }) => {
      const count = projectsWithSpan.filter(p => {
        const s = p.startDate ? new Date(p.startDate) : null
        return s && s.getFullYear() === y && s.getMonth() === m
      }).length
      return { year: y, month: m, count }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, year, month])

  const maxTrend = Math.max(1, ...trendMonths.map(t => t.count))

  const selectedProjects = selectedDay ? projectsOnDay(selectedDay) : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kalender Project</h1>
            <p className="text-sm text-gray-500">Visualisasi jadwal & tren project per bulan</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-all active:scale-95">‹</button>
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-all active:scale-95">Hari ini</button>
            <button onClick={goNext} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-all active:scale-95">›</button>
            <span className="text-sm font-semibold text-ink-800 ml-2">{MONTH_NAMES[month]} {year}</span>
          </div>
        </div>

        {/* Trend chart */}
        <div className="card p-4 border-t-4 border-blue-400">
          <p className="text-sm font-semibold text-ink-800 mb-3">Tren Jumlah Project per Bulan (mulai project)</p>
          <div className="flex items-end gap-3 h-32">
            {trendMonths.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-brand-700">{t.count}</span>
                <div className="w-full bg-brand-100 rounded-t-md flex items-end" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-brand-500 rounded-t-md transition-all"
                    style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count > 0 ? '6px' : '0' }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{MONTH_NAMES[t.month].slice(0, 3)} {String(t.year).slice(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Calendar grid */}
            <div className="lg:col-span-2 card p-4 border-t-4 border-orange-400">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  const dayProjects = projectsOnDay(date)
                  const isToday = date && ymd(date) === ymd(new Date())
                  const isSelected = date && selectedDay && ymd(date) === ymd(selectedDay)
                  return (
                    <button
                      key={i}
                      disabled={!date}
                      onClick={() => setSelectedDay(date)}
                      className={`min-h-[72px] rounded-lg border p-1 text-left align-top flex flex-col gap-0.5 transition-all duration-200 ${
                        !date ? 'border-transparent' :
                        isSelected ? 'border-brand-500 bg-brand-50 shadow-sm' :
                        isToday ? 'border-brand-300 bg-white' : 'border-gray-100 bg-white hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      {date && (
                        <>
                          <span className={`text-xs font-medium ${isToday ? 'text-brand-600' : 'text-gray-500'}`}>{date.getDate()}</span>
                          <div className="flex flex-wrap gap-0.5">
                            {dayProjects.slice(0, 4).map(p => (
                              <span key={p.id} className={`w-1.5 h-1.5 rounded-full ${DIVISION_DOT[p.division] || 'bg-gray-400'}`} title={p.name} />
                            ))}
                            {dayProjects.length > 4 && <span className="text-[9px] text-gray-400">+{dayProjects.length - 4}</span>}
                          </div>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
                {Object.entries(DIVISION_LABEL).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${DIVISION_DOT[key] || 'bg-gray-400'}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="card p-4 border-t-4 border-emerald-400">
              <p className="text-sm font-semibold text-ink-800 mb-3">
                {selectedDay ? selectedDay.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Pilih tanggal'}
              </p>
              {!selectedDay && <p className="text-sm text-gray-400">Klik tanggal pada kalender untuk melihat project yang berjalan.</p>}
              {selectedDay && selectedProjects.length === 0 && (
                <p className="text-sm text-gray-400">Tidak ada project pada tanggal ini.</p>
              )}
              <div className="space-y-2">
                {selectedProjects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-800">{p.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[p.status] || p.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{p.client?.name} · {DIVISION_LABEL[p.division] || p.division}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
