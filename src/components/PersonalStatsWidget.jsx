'use client'
import { useState, useEffect } from 'react'

function StatBar({ value, color = 'bg-violet-500' }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

export default function PersonalStatsWidget() {
  const [stats, setStats] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [open, setOpen] = useState(true)
  const [annOpen, setAnnOpen] = useState(true)

  useEffect(() => {
    fetch('/api/my-stats').then(r => r.ok ? r.json() : null).then(d => { if (d) setStats(d) })
    fetch('/api/announcements').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.announcements) setAnnouncements(d.announcements.slice(0, 3))
    })
  }, [])

  const ANN_STYLE = {
    INFO:     { dot: 'bg-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800' },
    BIRTHDAY: { dot: 'bg-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-800' },
    WARNING:  { dot: 'bg-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800' },
    EVENT:    { dot: 'bg-violet-500', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800' },
  }

  return (
    <div className="space-y-3">
      {/* Kinerja bulan ini */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors">
          <span className="text-sm font-semibold text-gray-800">Kinerja Bulan Ini</span>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3">
            {!stats ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Streak */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Streak check-in</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Hari berturut-turut</p>
                  </div>
                  <p className="text-2xl font-black text-gray-900">
                    {stats.streak} <span className="text-xs font-semibold text-gray-400">hari</span>
                  </p>
                </div>

                {/* Rate cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 font-medium">Check-in Pagi</p>
                    <p className="text-xl font-black text-gray-900">{stats.checkInRate}<span className="text-xs text-gray-400">%</span></p>
                    <StatBar value={stats.checkInRate}
                      color={stats.checkInRate >= 80 ? 'bg-green-500' : stats.checkInRate >= 50 ? 'bg-amber-500' : 'bg-red-400'} />
                    <p className="text-[10px] text-gray-400 mt-1">{stats.workDaysThisMonth} hari kerja</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 font-medium">Update Tugas</p>
                    <p className="text-xl font-black text-gray-900">{stats.updateRate}<span className="text-xs text-gray-400">%</span></p>
                    <StatBar value={stats.updateRate}
                      color={stats.updateRate >= 80 ? 'bg-violet-500' : stats.updateRate >= 50 ? 'bg-amber-500' : 'bg-red-400'} />
                    <p className="text-[10px] text-gray-400 mt-1">{stats.totalUpdatesThisMonth} hari aktif</p>
                  </div>
                </div>

                {/* On-time */}
                <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Update tepat waktu</p>
                    <p className="text-[10px] text-gray-400">Sebelum pukul 20:00 WIB</p>
                  </div>
                  <p className="text-lg font-black text-gray-900">{stats.onTimeCount} <span className="text-xs text-gray-400">kali</span></p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pengumuman */}
      {announcements.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
          <button onClick={() => setAnnOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Pengumuman</span>
              <span className="text-[11px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-bold">{announcements.length}</span>
            </div>
            <span className="text-gray-400 text-xs">{annOpen ? '▲' : '▼'}</span>
          </button>
          {annOpen && (
            <div className="px-4 pb-4 space-y-2">
              {announcements.map(ann => {
                const s = ANN_STYLE[ann.type] || ANN_STYLE.INFO
                return (
                  <div key={ann.id} className={`rounded-xl border px-3 py-2.5 ${s.bg} ${s.border}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${s.text}`}>{ann.title}</p>
                        {ann.content && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{ann.content}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(ann.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
