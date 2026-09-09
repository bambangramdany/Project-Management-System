'use client'
import { useState } from 'react'

const URGENCY = {
  LOW:      { label: 'Rendah',  color: 'bg-green-100 text-green-700 border-green-200' },
  MEDIUM:   { label: 'Sedang',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  HIGH:     { label: 'Tinggi',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Kritis', color: 'bg-red-100 text-red-700 border-red-200' },
}

function NowIndicator({ rundown }) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return rundown.map((item, i) => {
    const [h, m] = item.time.split(':').map(Number)
    const itemMin = h * 60 + m
    const nextItem = rundown[i + 1]
    const nextMin = nextItem ? (() => { const [nh, nm] = nextItem.time.split(':').map(Number); return nh * 60 + nm })() : itemMin + 60
    const isCurrent = nowMin >= itemMin && nowMin < nextMin
    const isPast = nowMin >= nextMin
    return (
      <div key={item.id} className={`flex gap-3 items-start py-2.5 px-3 rounded-xl transition-colors ${
        isCurrent ? 'bg-white/20 ring-1 ring-white/40' : isPast ? 'opacity-50' : ''
      }`}>
        <div className="flex flex-col items-center gap-1 shrink-0 w-10">
          <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-amber-200'}`}>{item.time}</span>
          {isCurrent && <span className="text-[9px] bg-white text-amber-700 rounded-full px-1.5 font-bold">NOW</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${isCurrent ? 'text-white' : 'text-amber-50'}`}>{item.title}</p>
          {item.note && <p className="text-[11px] text-amber-200 mt-0.5">{item.note}</p>}
        </div>
      </div>
    )
  })
}

function ReportIssueModal({ project, onClose, onSubmit }) {
  const [title, setTitle] = useState('')
  const [urgency, setUrgency] = useState('MEDIUM')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onSubmit({ projectId: project.id, title, urgency, note })
    setDone(true); setLoading(false)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-t-2xl px-5 py-4">
          <p className="font-bold text-white">Laporan Masalah</p>
          <p className="text-xs text-red-100">{project.name}</p>
        </div>
        {done ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="font-bold text-green-700">Laporan terkirim ke PIC & Direktur</p>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <div>
              <label className="label">Deskripsi masalah</label>
              <input className="input w-full mt-1" placeholder="Contoh: Sound system tidak menyala di hall utama" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Tingkat urgensi</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {Object.entries(URGENCY).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setUrgency(k)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                      urgency === k ? v.color + ' border-2' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Catatan tambahan (opsional)</label>
              <textarea className="input w-full mt-1 resize-none" rows={2} placeholder="Detail lokasi, barang, atau orang yang terlibat..." value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">Batal</button>
              <button type="submit" disabled={loading || !title.trim()} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-colors">
                {loading ? 'Mengirim...' : 'Laporkan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function EventDayBanner({ events, onIssueSubmit, canManageRundown }) {
  const [expanded, setExpanded] = useState(true)
  const [showRundown, setShowRundown] = useState(true)
  const [showCrew, setShowCrew] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [reportModal, setReportModal] = useState(null) // project object
  const [addRundownFor, setAddRundownFor] = useState(null)
  const [newItem, setNewItem] = useState({ time: '', title: '', note: '' })
  const [rundownList, setRundownList] = useState(() =>
    Object.fromEntries(events.map(e => [e.id, e.rundown]))
  )
  const [issueList, setIssueList] = useState(() =>
    Object.fromEntries(events.map(e => [e.id, e.issues]))
  )

  async function submitIssue(payload) {
    const res = await fetch('/api/event-issues', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const issue = await res.json()
      setIssueList(prev => ({ ...prev, [payload.projectId]: [issue, ...(prev[payload.projectId] || [])] }))
      if (onIssueSubmit) onIssueSubmit(issue)
    }
  }

  async function addRundownItem(projectId) {
    if (!newItem.time || !newItem.title) return
    const res = await fetch(`/api/projects/${projectId}/rundown`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    })
    if (res.ok) {
      const item = await res.json()
      setRundownList(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), item].sort((a, b) => a.time.localeCompare(b.time)) }))
      setNewItem({ time: '', title: '', note: '' })
      setAddRundownFor(null)
    }
  }

  async function deleteRundownItem(projectId, rid) {
    await fetch(`/api/projects/${projectId}/rundown?rid=${rid}`, { method: 'DELETE' })
    setRundownList(prev => ({ ...prev, [projectId]: prev[projectId].filter(i => i.id !== rid) }))
  }

  async function resolveIssue(issue) {
    await fetch('/api/event-issues', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: issue.id, resolved: true }),
    })
    setIssueList(prev => ({
      ...prev, [issue.projectId]: prev[issue.projectId].filter(i => i.id !== issue.id)
    }))
  }

  if (!events || events.length === 0) return null

  return (
    <>
      {events.map(event => {
        const rundown = rundownList[event.id] || []
        const issues  = issueList[event.id]  || []
        const crew    = event.crew || []
        const checkedInCount = crew.filter(c => c.checkedIn).length

        return (
          <div key={event.id} className="rounded-2xl overflow-hidden shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white font-black text-lg">
                    E
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-white/20 text-white rounded-full px-2 py-0.5 uppercase tracking-wide">
                        Hari Event
                      </span>
                      <span className="text-[10px] text-amber-100">{event.code}</span>
                    </div>
                    <p className="font-bold text-white text-base leading-tight mt-0.5">{event.name}</p>
                  </div>
                </div>
                <button onClick={() => setExpanded(v => !v)}
                  className="text-white/70 hover:text-white text-lg transition-transform duration-200"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>⌄</button>
              </div>

              {/* Quick stats row */}
              <div className="flex gap-3 mt-3">
                <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-white">{checkedInCount}/{crew.length}</p>
                  <p className="text-[10px] text-amber-100">Crew hadir</p>
                </div>
                <div className="flex-1 bg-white/15 rounded-xl px-3 py-2 text-center">
                  <p className="text-lg font-black text-white">{rundown.length}</p>
                  <p className="text-[10px] text-amber-100">Sesi rundown</p>
                </div>
                <div className={`flex-1 rounded-xl px-3 py-2 text-center ${issues.length > 0 ? 'bg-red-600/60 ring-1 ring-red-300' : 'bg-white/15'}`}>
                  <p className="text-lg font-black text-white">{issues.length}</p>
                  <p className="text-[10px] text-amber-100">Masalah aktif</p>
                </div>
              </div>
            </div>

            {/* Body */}
            {expanded && (
              <div className="bg-amber-50/50 border-x-2 border-b-2 border-amber-200">
                {/* Tab buttons */}
                <div className="flex border-b border-amber-200">
                  {[
                    { key: 'rundown', label: '📋 Rundown', active: showRundown, toggle: () => { setShowRundown(true); setShowCrew(false); setShowIssues(false) } },
                    { key: 'crew',    label: `👥 Crew (${checkedInCount}/${crew.length})`, active: showCrew,    toggle: () => { setShowCrew(true); setShowRundown(false); setShowIssues(false) } },
                    { key: 'issues',  label: `⚠ Masalah${issues.length > 0 ? ` (${issues.length})` : ''}`, active: showIssues, toggle: () => { setShowIssues(true); setShowRundown(false); setShowCrew(false) } },
                  ].map(tab => (
                    <button key={tab.key} onClick={tab.toggle}
                      className={`flex-1 text-xs py-2.5 font-semibold transition-colors ${tab.active ? 'text-orange-700 border-b-2 border-orange-500 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Rundown tab */}
                {showRundown && (
                  <div className="p-3 space-y-1">
                    {rundown.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Belum ada rundown untuk event ini</p>
                    ) : (
                      rundown.map(item => {
                        const now = new Date()
                        const nowMin = now.getHours() * 60 + now.getMinutes()
                        const [h, m] = item.time.split(':').map(Number)
                        const itemMin = h * 60 + m
                        const idx = rundown.indexOf(item)
                        const nextItem = rundown[idx + 1]
                        const nextMin = nextItem ? (() => { const [nh, nm] = nextItem.time.split(':').map(Number); return nh * 60 + nm })() : itemMin + 90
                        const isCurrent = nowMin >= itemMin && nowMin < nextMin
                        const isPast = nowMin >= nextMin

                        return (
                          <div key={item.id} className={`flex gap-3 items-start px-3 py-2.5 rounded-xl ${isCurrent ? 'bg-orange-100 ring-1 ring-orange-300' : isPast ? 'opacity-50' : 'bg-white'}`}>
                            <div className="w-12 shrink-0 text-center">
                              <span className="text-xs font-bold text-orange-600">{item.time}</span>
                              {isCurrent && <div className="text-[9px] bg-orange-500 text-white rounded-full px-1.5 mt-0.5 font-bold">NOW</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{item.title}</p>
                              {item.note && <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>}
                            </div>
                            {canManageRundown && (
                              <button onClick={() => deleteRundownItem(event.id, item.id)} className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
                            )}
                          </div>
                        )
                      })
                    )}
                    {canManageRundown && (
                      addRundownFor === event.id ? (
                        <div className="bg-white rounded-xl p-3 space-y-2 border border-orange-200">
                          <div className="flex gap-2">
                            <input type="time" className="input w-24" value={newItem.time} onChange={e => setNewItem(p => ({ ...p, time: e.target.value }))} />
                            <input className="input flex-1" placeholder="Nama sesi..." value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} />
                          </div>
                          <input className="input w-full" placeholder="Catatan (opsional)" value={newItem.note} onChange={e => setNewItem(p => ({ ...p, note: e.target.value }))} />
                          <div className="flex gap-2">
                            <button onClick={() => setAddRundownFor(null)} className="btn-secondary flex-1 py-1.5 text-xs">Batal</button>
                            <button onClick={() => addRundownItem(event.id)} className="btn-primary flex-1 py-1.5 text-xs">Tambah</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddRundownFor(event.id)}
                          className="w-full text-xs text-orange-500 hover:text-orange-700 py-2 border border-dashed border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
                          + Tambah sesi
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Crew tab */}
                {showCrew && (
                  <div className="p-3 space-y-2">
                    {crew.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Tidak ada data crew</p>
                    ) : (
                      crew.map(c => (
                        <div key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${c.isMe ? 'bg-violet-50 ring-1 ring-violet-200' : 'bg-white'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${c.checkedIn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {c.checkedIn ? '✓' : c.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{c.name} {c.isMe && <span className="text-[10px] text-violet-500">(Kamu)</span>} {c.isPic && <span className="text-[10px] text-orange-500">PIC</span>}</p>
                            {c.checkedIn ? (
                              <p className="text-[11px] text-green-600">✓ Check-in {c.checkedInAt ? new Date(c.checkedInAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB' : ''}</p>
                            ) : (
                              <p className="text-[11px] text-red-400">Belum check-in</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Issues tab */}
                {showIssues && (
                  <div className="p-3 space-y-2">
                    {issues.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">Tidak ada masalah aktif 🎉</p>
                    ) : (
                      issues.map(issue => {
                        const urg = URGENCY[issue.urgency] || URGENCY.MEDIUM
                        return (
                          <div key={issue.id} className="bg-white rounded-xl p-3 flex items-start gap-3">
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold border shrink-0 ${urg.color}`}>{urg.label}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 leading-tight">{issue.title}</p>
                              {issue.note && <p className="text-xs text-gray-500 mt-0.5">{issue.note}</p>}
                              <p className="text-[10px] text-gray-400 mt-1">Dilaporkan oleh {issue.reportedBy?.name}</p>
                            </div>
                            <button onClick={() => resolveIssue({ ...issue, projectId: event.id })}
                              className="text-[11px] px-2.5 py-1 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 shrink-0">
                              Selesai
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {/* Report issue button */}
                <div className="px-3 pb-3">
                  <button onClick={() => setReportModal(event)}
                    className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                    Laporkan Masalah
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {reportModal && (
        <ReportIssueModal
          project={reportModal}
          onClose={() => setReportModal(null)}
          onSubmit={submitIssue}
        />
      )}
    </>
  )
}
