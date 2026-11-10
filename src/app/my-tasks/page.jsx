'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { MySharingSessionCard, AllSharingSessionsTable } from '@/components/SharingSessionCard'
import EventDayBanner from '@/components/EventDayBanner'
import PersonalStatsWidget from '@/components/PersonalStatsWidget'
import BackButton from '@/components/BackButton'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'ON_TRACK',  label: 'Berjalan',   color: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  { value: 'DELAYED',   label: 'Terlambat',  color: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  { value: 'HOLD',      label: 'Hold',       color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  { value: 'PROBLEM',   label: 'Bermasalah', color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
  { value: 'DONE',      label: 'Selesai',    color: 'bg-blue-500',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-300' },
]
const STATUS_MAP  = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]))
const NOTE_REQUIRED = ['DELAYED', 'HOLD', 'PROBLEM']

const DIV_STYLE = {
  EVENT:        { gradient: 'from-blue-500 to-blue-600',      abbr: 'EO' },
  CREATIVE:     { gradient: 'from-violet-500 to-violet-600',  abbr: 'CR' },
  PH:           { gradient: 'from-amber-500 to-amber-600',    abbr: 'PH' },
  FINANCE_HRGA: { gradient: 'from-emerald-500 to-emerald-600', abbr: 'FN' },
}

function fmtDate(d) {
  if (!d) return null
  const dt = new Date(d)
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.floor((dt - today) / 86400000)
  if (diff < 0) return { label: `Terlambat ${Math.abs(diff)} hari`, urgent: true }
  if (diff === 0) return { label: 'Deadline hari ini', urgent: true }
  if (diff === 1) return { label: 'Besok', urgent: false }
  return { label: dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), urgent: false }
}

// ── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ done, total }) {
  const pct = total > 0 ? done / total : 0
  const r = 28, circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct === 1 ? '#22c55e' : pct > 0.5 ? '#f59e0b' : '#6366f1'

  return (
    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-sm font-bold text-gray-800 leading-none">{done}</p>
        <p className="text-[10px] text-gray-400">/{total}</p>
      </div>
    </div>
  )
}

// ── ReadOnlyTaskCard (monitoring — dengan panel komentar) ─────────────────────

function ReadOnlyTaskCard({ item }) {
  const lastStatus = STATUS_MAP[item.latestUpdate?.status]
  const savedAtStr = item.latestUpdate?.savedAt
    ? new Date(item.latestUpdate.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
    : null

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState(null) // null = belum dimuat
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)

  async function loadComments() {
    if (comments !== null) return
    const res = await fetch(`/api/tasks/${item.id}/comments`)
    if (res.ok) setComments(await res.json())
    else setComments([])
  }

  function toggleComments() {
    const next = !showComments
    setShowComments(next)
    if (next) loadComments()
  }

  async function sendComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    const res = await fetch(`/api/tasks/${item.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.trim() }),
    })
    if (res.ok) {
      const c = await res.json()
      setComments(prev => [...(prev || []), c])
      setCommentText('')
    }
    setSending(false)
  }

  return (
    <div className={`rounded-xl border transition-colors ${item.hasTodayUpdate ? 'bg-white border-green-100' : 'bg-white border-gray-100'}`}>
      {/* Baris utama task */}
      <div className="flex items-start gap-3 px-3 py-3">
        <div className="flex-1 min-w-0">
          {item.assignee && <p className="text-[11px] font-semibold text-violet-600 mb-0.5">{item.assignee.name}</p>}
          <p className="text-sm font-medium text-gray-900 leading-tight">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {item.project && (
              <Link href={`/projects/${item.project.id}`} className="text-[11px] text-violet-500 hover:underline">
                {item.project.code} · {item.project.name}
              </Link>
            )}
            {item.timing && (() => {
              const t = { daily: '☀️ Harian', weekly: '📅 Mingguan', monthly: '🗓️ Bulanan', yearly: '📆 Tahunan', periodic: '🔁 Berkala' }[item.timing]
              return t ? <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-md">{t}</span> : null
            })()}
          </div>
          {savedAtStr && <p className="text-[10px] text-gray-400 mt-0.5">Update: {savedAtStr}</p>}
        </div>
        {lastStatus ? (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${lastStatus.bg} ${lastStatus.text} border ${lastStatus.border}`}>
              {lastStatus.label}
            </span>
            {item.latestUpdate?.note && (
              <p className="text-[10px] text-gray-400 max-w-[120px] text-right line-clamp-2">{item.latestUpdate.note}</p>
            )}
            {(() => {
              if (!item.dueDate) return null
              const overdueDays = Math.floor((Date.now() - new Date(item.dueDate)) / 86400000)
              return overdueDays > 0 ? (
                <span className="text-[10px] font-semibold text-red-500">⚠ Terlambat {overdueDays} hari</span>
              ) : null
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-[11px] px-2 py-1 rounded-lg font-semibold bg-gray-100 text-gray-400">Belum update</span>
            {(() => {
              if (item.dueDate) {
                const overdueDays = Math.floor((Date.now() - new Date(item.dueDate)) / 86400000)
                if (overdueDays > 0) return (
                  <span className="text-[10px] font-semibold text-red-500">⚠ Terlambat {overdueDays} hari</span>
                )
              }
              const ref = item.latestUpdate?.savedAt || item.createdAt
              if (!ref) return null
              const days = Math.floor((Date.now() - new Date(ref)) / 86400000)
              return days > 0 ? (
                <span className="text-[10px] text-red-400">{days === 1 ? '1 hari lalu' : `${days} hari lalu`}</span>
              ) : null
            })()}
          </div>
        )}
      </div>

      {/* Tombol komentar */}
      <button
        onClick={toggleComments}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 border-t border-gray-50 text-[11px] text-gray-400 hover:text-violet-500 hover:bg-gray-50 transition-colors rounded-b-xl"
      >
        <span>💬</span>
        <span>{showComments ? 'Tutup komentar' : `Komentar${comments?.length ? ` (${comments.length})` : ''}`}</span>
      </button>

      {/* Panel komentar */}
      {showComments && (
        <div className="border-t border-gray-100 px-3 pt-2 pb-3 space-y-2 bg-gray-50/50 rounded-b-xl">
          {comments === null ? (
            <p className="text-[11px] text-gray-400 py-1">Memuat...</p>
          ) : comments.length === 0 ? (
            <p className="text-[11px] text-gray-400 py-1 italic">Belum ada komentar</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-violet-600">{c.author.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700">{c.author.name}
                      <span className="font-normal text-gray-400 ml-1">
                        {new Date(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                      </span>
                    </p>
                    <p className="text-[12px] text-gray-700 leading-snug">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Form komentar baru */}
          <form onSubmit={sendComment} className="flex gap-2 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Tulis komentar..."
              className="flex-1 text-[12px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-violet-300"
            />
            <button
              type="submit"
              disabled={sending || !commentText.trim()}
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-semibold disabled:opacity-40 hover:bg-violet-700 transition-colors shrink-0"
            >
              {sending ? '...' : 'Kirim'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ item, onSave, readOnly = false, onDelete }) {
  const [statusVal, setStatusVal] = useState(item.latestUpdate?.status || '')
  const [note, setNote] = useState(item.hasTodayUpdate ? (item.latestUpdate?.note || '') : '')
  const [showNote, setShowNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  const currentStatus = STATUS_MAP[statusVal]
  const lastStatus    = STATUS_MAP[item.latestUpdate?.status]
  const dateInfo = fmtDate(item.dueDate)
  const needNote = NOTE_REQUIRED.includes(statusVal)

  useEffect(() => {
    if (NOTE_REQUIRED.includes(statusVal)) setShowNote(true)
  }, [statusVal])

  async function save() {
    if (!statusVal) { setError('Pilih status dulu'); return }
    if (needNote && !note.trim()) { setError('Isi catatan alasan'); return }
    setError(''); setSaving(true)
    await onSave(item, statusVal, note)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (readOnly) {
    return <ReadOnlyTaskCard item={item} />
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
      saved ? 'border-green-400 bg-green-50/30' :
      item.hasTodayUpdate ? 'border-green-200 bg-white' :
      dateInfo?.urgent ? 'border-red-200 bg-red-50/20' :
      'border-gray-100 bg-white'
    }`}>
      {/* Card header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 leading-tight">{item.title}</p>
            {item.project ? (
              <Link href={`/projects/${item.project.id}`} className="text-xs text-violet-500 hover:underline mt-0.5 block">
                {item.project.code} · {item.project.name}
                {item.clientName ? ` · ${item.clientName}` : ''}
              </Link>
            ) : (item.clientName || item.projectName) ? (
              <p className="text-xs text-gray-400 mt-0.5">{[item.clientName, item.projectName].filter(Boolean).join(' · ')}</p>
            ) : null}
            {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {item.hasTodayUpdate && !saved && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">✓ Updated</span>
            )}
            {saved && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white">Tersimpan</span>
            )}
            {dateInfo && (
              <span className={`text-[11px] font-semibold ${dateInfo.urgent ? 'text-red-500' : 'text-gray-400'}`}>
                {dateInfo.urgent ? '⚠ ' : ''}{dateInfo.label}
              </span>
            )}
            {onDelete && !confirmDel && (
              <button onClick={() => setConfirmDel(true)} className="text-[11px] text-gray-300 hover:text-red-400 mt-1">✕</button>
            )}
            {confirmDel && (
              <div className="flex gap-1 mt-1">
                <button onClick={() => onDelete(item.id)} className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded">Hapus</button>
                <button onClick={() => setConfirmDel(false)} className="text-[10px] text-gray-400">Batal</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status chips */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setStatusVal(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold border-2 transition-all duration-150 active:scale-95 ${
                statusVal === opt.value
                  ? `${opt.bg} ${opt.text} ${opt.border} shadow-sm scale-105`
                  : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note field — shown for NOTE_REQUIRED statuses or if manually toggled */}
      {(showNote || needNote) && (
        <div className="px-4 pb-2">
          <textarea
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none placeholder-gray-300"
            rows={2}
            placeholder={needNote ? '⚠ Wajib — jelaskan alasannya...' : 'Catatan tambahan (opsional)...'}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      )}

      {/* Footer: prev update + action */}
      <div className="px-4 pb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!showNote && !needNote && (
            <button onClick={() => setShowNote(v => !v)}
              className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
              ✏ Catatan
            </button>
          )}
          {item.latestUpdate?.savedAt && (
            <span className="text-[11px] text-gray-400">
              {new Date(item.latestUpdate.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
            </span>
          )}
          {lastStatus && (
            <span className="text-[11px] text-gray-400 hidden sm:block">
              · <span className={`font-semibold ${lastStatus.text}`}>{lastStatus.label}</span>
            </span>
          )}
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
        <button onClick={save} disabled={saving || !statusVal}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 ${
            !statusVal ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
            saving ? 'bg-violet-400 text-white' :
            'bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200'
          }`}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

// ── CheckInCard (Morning Briefing terintegrasi) ───────────────────────────────


function hourWIBNow() {
  const wib = new Date(Date.now() + 7 * 3600 * 1000)
  return wib.getUTCHours() + wib.getUTCMinutes() / 60
}

function CheckInCard({ checkIn, briefingLog, onMorningAck, onEveningSubmit, session, allTasksDone }) {
  const [eveningNote, setEveningNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!checkIn?.eveningAt)
  const [showAbsensiReminder, setShowAbsensiReminder] = useState(false)
  const [ackLoading, setAckLoading] = useState(false)
  const [ackSuccess, setAckSuccess] = useState(false)
  const [morningExcuse, setMorningExcuse] = useState('')
  const [eveningExcuse, setEveningExcuse] = useState('')
  const [showMorningExcuse, setShowMorningExcuse] = useState(false)
  const [showEveningExcuse, setShowEveningExcuse] = useState(false)
  const [excuseSubmitting, setExcuseSubmitting] = useState(false)
  const [excuseStatus, setExcuseStatus] = useState({ morning: checkIn?.morningReasonStatus, evening: checkIn?.eveningReasonStatus })
  const [excuseReason, setExcuseReason] = useState({ morning: checkIn?.morningReason, evening: checkIn?.eveningReason })

  const hasMorning = !!checkIn?.morningAckAt
  const hasEvening = !!checkIn?.eveningAt || submitted
  const showEvening = checkIn?.showEveningForm
  const isOverdue   = checkIn?.eveningOverdue
  const morningLate = checkIn?.morningLate

  const now = hourWIBNow()
  const isOnTime    = now >= 4 && now <= 8         // 04:00–08:00 WIB tepat waktu
  const isAfterCutoff = now > 8                    // lewat jam 08:00, dianggap terlambat
  const isWeekend   = [0, 6].includes(new Date().getDay())

  async function submitExcuse(type) {
    const reason = type === 'morning' ? morningExcuse : eveningExcuse
    if (!reason.trim()) return
    setExcuseSubmitting(true)
    try {
      const res = await fetch('/api/daily-checkin/excuse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, reason, date: checkIn?.date }),
      })
      if (res.ok) {
        setExcuseStatus(prev => ({ ...prev, [type]: 'PENDING' }))
        setExcuseReason(prev => ({ ...prev, [type]: reason }))
        if (type === 'morning') setShowMorningExcuse(false)
        else setShowEveningExcuse(false)
      }
    } finally {
      setExcuseSubmitting(false)
    }
  }

  // Briefing status label
  let briefingStatus = null
  if (briefingLog) {
    if (briefingLog.status === 'HADIR') {
      const ackTime = checkIn?.morningAckAt
        ? new Date(checkIn.morningAckAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
        : null
      const onTime = checkIn?.morningAckAt
        ? (new Date(checkIn.morningAckAt).getTime() + 7 * 3600 * 1000)
          && (() => { const w = new Date(new Date(checkIn.morningAckAt).getTime() + 7*3600000); return w.getUTCHours() + w.getUTCMinutes()/60 <= 8 + 5/60 })()
        : false
      briefingStatus = { ok: true, late: !onTime, time: ackTime }
    } else if (briefingLog.status === 'IZIN_PROJECT') {
      briefingStatus = { izin: true }
    }
  }

  async function submitEvening(e) {
    e?.preventDefault()
    setSubmitting(true)
    await onEveningSubmit('')
    setSubmitted(true); setSubmitting(false)
  }

  if (!checkIn) return null

  return (
    <div className="space-y-2">
      {/* Morning Briefing Check-in */}
      {!isWeekend && (
        !hasMorning ? (
          <div className={`rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg ${
            isOnTime ? 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-100'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-100'
          }`}>
            <div>
              <p className="font-bold text-white text-sm">
                {isOnTime ? '☀️ Morning Briefing 08:00 WIB' : '⚠️ Check-in pagi (terlambat)'}
              </p>
              <p className="text-xs text-white/75 mt-0.5">
                {isOnTime ? 'Klik untuk konfirmasi kehadiran briefing & cek tugas hari ini'
                : 'Catat jam hadir sekarang — sistem merekam waktu terlambat'}
              </p>
            </div>
            <button
              disabled={ackLoading || ackSuccess}
              onClick={async () => {
                // Open Zoom synchronously before await — mobile browsers block window.open after async
                window.open('https://us02web.zoom.us/j/83057800992', '_blank')
                setAckLoading(true)
                await onMorningAck()
                setAckLoading(false)
                setAckSuccess(true)
                setShowAbsensiReminder(true)
                if (isAfterCutoff) setShowMorningExcuse(true)
                setTimeout(() => setAckSuccess(false), 3000)
              }}
              className="shrink-0 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-colors active:scale-95 border border-white/30 disabled:opacity-60">
              {ackLoading ? '...' : ackSuccess ? '✓ Tercatat!' : isOnTime ? '✓ Hadir' : '✓ Hadir (Telat)'}
            </button>
          </div>
        ) : (
          <>
            {briefingStatus ? (
              <div className={`rounded-2xl px-4 py-2.5 flex items-center gap-2 ${
                briefingStatus.izin ? 'bg-blue-50 border border-blue-200'
                : briefingStatus.late ? 'bg-amber-50 border border-amber-200'
                : 'bg-green-50 border border-green-200'
              }`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${briefingStatus.izin ? 'bg-blue-500' : briefingStatus.late ? 'bg-amber-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${briefingStatus.izin ? 'text-blue-700' : briefingStatus.late ? 'text-amber-700' : 'text-green-700'}`}>
                    {briefingStatus.izin ? '🔄 Izin project — tercatat'
                    : briefingStatus.late ? `⚠️ Hadir briefing (telat)${briefingStatus.time ? ` — ${briefingStatus.time} WIB` : ''}`
                    : `☀️ Hadir briefing tepat waktu${briefingStatus.time ? ` — ${briefingStatus.time} WIB` : ''}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 ${morningLate ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${morningLate ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <p className={`text-sm font-semibold ${morningLate ? 'text-amber-700' : 'text-green-700'}`}>
                    {morningLate
                      ? `⚠️ Check-in pagi tercatat (terlambat) — ${new Date(checkIn.morningAckAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`
                      : `☀️ Check-in pagi tercatat — ${new Date(checkIn.morningAckAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`
                    }
                  </p>
                </div>
                {morningLate && !excuseStatus.morning && (
                  <button onClick={() => setShowMorningExcuse(v => !v)}
                    className="shrink-0 text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold">
                    + Alasan
                  </button>
                )}
                {excuseStatus.morning && (
                  <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                    excuseStatus.morning === 'APPROVED' ? 'bg-green-100 text-green-700'
                    : excuseStatus.morning === 'REJECTED' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {excuseStatus.morning === 'APPROVED' ? '✓ Alasan diterima' : excuseStatus.morning === 'REJECTED' ? '✗ Alasan ditolak' : '⏳ Alasan pending review'}
                  </span>
                )}
              </div>
            )}
            {/* Morning excuse form */}
            {showMorningExcuse && !excuseStatus.morning && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-amber-800">Alasan terlambat check-in pagi</p>
                <p className="text-xs text-amber-600">Alasan akan dikirim ke Director divisi dan Direktur HR untuk ditinjau.</p>
                <textarea value={morningExcuse} onChange={e => setMorningExcuse(e.target.value)} rows={3}
                  placeholder="Ceritakan alasan keterlambatan check-in pagi ini..."
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => submitExcuse('morning')} disabled={excuseSubmitting || !morningExcuse.trim()}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-50">
                    {excuseSubmitting ? 'Mengirim...' : 'Kirim Alasan'}
                  </button>
                  <button onClick={() => setShowMorningExcuse(false)}
                    className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200">
                    Batal
                  </button>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* Reminder absensi aplikasi setelah check-in pagi */}
      {showAbsensiReminder && hasMorning && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-3 flex items-start gap-3">
          <span className="text-lg shrink-0">⏰</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Jangan lupa melakukan absensi pada pukul 10.00 WIB di aplikasi Absensi Watermark Indonesia</p>
          </div>
          <button onClick={() => setShowAbsensiReminder(false)} className="text-amber-500 hover:text-amber-700 shrink-0 text-lg leading-none">✕</button>
        </div>
      )}

      {showEvening && (
        hasEvening ? (
          <div className="space-y-2">
            <div className={`rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 ${
              checkIn?.eveningReasonStatus === 'APPROVED' ? 'bg-green-50 border border-green-200'
              : checkIn?.eveningAt && new Date(checkIn.eveningAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }).split(':')[0] > 20 ? 'bg-amber-50 border border-amber-200'
              : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 font-semibold">Laporan sore sudah dikirim {checkIn.eveningAt ? `· ${new Date(checkIn.eveningAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB` : ''}</p>
              </div>
              {excuseStatus.evening && (
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${
                  excuseStatus.evening === 'APPROVED' ? 'bg-green-100 text-green-700'
                  : excuseStatus.evening === 'REJECTED' ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {excuseStatus.evening === 'APPROVED' ? '✓ Alasan diterima' : excuseStatus.evening === 'REJECTED' ? '✗ Alasan ditolak' : '⏳ Alasan pending review'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
          <div className={`rounded-2xl border-2 p-4 space-y-3 ${
            isOverdue ? 'border-orange-300 bg-orange-50'
            : allTasksDone ? 'border-green-300 bg-green-50/60'
            : 'border-blue-200 bg-blue-50/50'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-bold text-sm ${isOverdue ? 'text-orange-700' : allTasksDone ? 'text-green-700' : 'text-blue-700'}`}>
                  {isOverdue ? '⚠️ Terlambat — check-in harus dikirim sebelum 20:00'
                  : allTasksDone ? '✅ Semua task sudah diupdate — konfirmasi selesai kerja'
                  : 'Sudah selesai kerja hari ini?'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {allTasksDone
                    ? 'Kamu bisa konfirmasi sekarang tanpa perlu tunggu sore'
                    : 'Pastikan semua task & tugas project harian sudah diupdate statusnya (Berjalan / Selesai / dll) — tombol Konfirmasi Selesai Kerja akan aktif otomatis setelah semua terisi. Task mingguan dan bulanan tidak diwajibkan diupdate hari ini.'}
                </p>
              </div>
              {isOverdue && !excuseStatus.evening && (
                <button type="button" onClick={() => setShowEveningExcuse(v => !v)}
                  className="shrink-0 text-xs px-2 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 font-semibold">
                  + Alasan
                </button>
              )}
            </div>
            <button onClick={submitEvening} disabled={submitting || !allTasksDone}
              title={!allTasksDone ? 'Update semua to-do list harian dulu sebelum konfirmasi selesai kerja' : ''}
              className={`w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95 ${
                !allTasksDone ? 'bg-gray-400 cursor-not-allowed opacity-40 blur-[0.5px]'
                : isOverdue ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-green-600 hover:bg-green-700'
              }`}>
              {submitting ? 'Mengirim...' : !allTasksDone ? '⏳ Update semua task dulu...' : '✓ Konfirmasi Selesai Kerja'}
            </button>
          </div>
          {/* Evening excuse form */}
          {showEveningExcuse && !excuseStatus.evening && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-orange-800">Alasan terlambat laporan sore</p>
              <p className="text-xs text-orange-600">Alasan akan dikirim ke Director divisi dan Direktur HR untuk ditinjau.</p>
              <textarea value={eveningExcuse} onChange={e => setEveningExcuse(e.target.value)} rows={3}
                placeholder="Ceritakan alasan kenapa laporan sore terlambat atau belum terkirim..."
                className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => submitExcuse('evening')} disabled={excuseSubmitting || !eveningExcuse.trim()}
                  className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
                  {excuseSubmitting ? 'Mengirim...' : 'Kirim Alasan'}
                </button>
                <button onClick={() => setShowEveningExcuse(false)}
                  className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200">
                  Batal
                </button>
              </div>
            </div>
          )}
          {excuseStatus.evening && (
            <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              excuseStatus.evening === 'APPROVED' ? 'bg-green-50 border border-green-200 text-green-700'
              : excuseStatus.evening === 'REJECTED' ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            }`}>
              {excuseStatus.evening === 'APPROVED' ? '✓ Alasan laporan sore diterima Director'
              : excuseStatus.evening === 'REJECTED' ? '✗ Alasan laporan sore ditolak Director'
              : '⏳ Alasan laporan sore menunggu review Director'}
            </div>
          )}
          </div>
        )
      )}
    </div>
  )
}



// ── Discipline Leaderboard ───────────────────────────────────────────────────

const DIV_BADGE = {
  EVENT:        { label: 'EO',  color: 'bg-blue-100 text-blue-700' },
  CREATIVE:     { label: 'CR',  color: 'bg-violet-100 text-violet-700' },
  PH:           { label: 'PH',  color: 'bg-amber-100 text-amber-700' },
  FINANCE_HRGA: { label: 'FN',  color: 'bg-emerald-100 text-emerald-700' },
}

function DisciplineLeaderboard({ currentUserId }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const monthLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  function load() {
    if (data || loading) return
    setLoading(true)
    const period = new Date().toISOString().slice(0, 7)
    fetch(`/api/daily-checkin/leaderboard?period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  const myRank = data?.rows ? data.rows.findIndex(r => r.userId === currentUserId) : -1

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-800">Disiplin Tim — {monthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {myRank >= 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              #{myRank + 1}
            </span>
          )}
          {data && !loading && (
            <span className="text-xs text-gray-400">{data.rows.length} orang</span>
          )}
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {loading && <p className="text-xs text-gray-400 text-center py-3">Memuat...</p>}
          {data && (
            <>
              {/* Header tabel */}
              <div className="flex items-center px-4 py-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wide border-b border-gray-50">
                <span className="w-6 shrink-0">#</span>
                <span className="flex-1">Nama</span>
                <span className="w-8 text-center text-indigo-400">Pagi</span>
                <span className="w-8 text-center text-amber-400">Sore</span>
                <span className="w-8 text-right font-bold text-gray-500">Skor</span>
              </div>
              <div className="divide-y divide-gray-50">
                {data.rows.map((row, i) => {
                  const isMe = row.userId === currentUserId
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  const div = DIV_BADGE[row.divisi] || { label: '—', color: 'bg-gray-100 text-gray-500' }
                  const scoreColor = row.avgScore >= 75 ? 'text-green-600' : row.avgScore >= 50 ? 'text-amber-500' : 'text-red-400'
                  return (
                    <div key={row.userId}
                      className={`flex items-center px-4 py-2 ${isMe ? 'bg-violet-50' : ''}`}>
                      <span className="w-6 shrink-0 text-sm">
                        {medal || <span className="text-xs text-gray-400">{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className={`text-sm font-medium truncate ${isMe ? 'text-violet-700 font-semibold' : 'text-gray-800'}`}>
                          {row.name.split(' ')[0]}
                        </span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${div.color} shrink-0`}>{div.label}</span>
                        {isMe && <span className="text-[9px] text-violet-400 shrink-0">kamu</span>}
                      </div>
                      <span className="w-8 text-center text-xs tabular-nums text-indigo-500">{row.morningScore}</span>
                      <span className="w-8 text-center text-xs tabular-nums text-amber-500">{row.eveningScore}</span>
                      <span className={`w-8 text-right text-sm font-black tabular-nums ${scoreColor}`}>{row.avgScore}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 text-center py-2 border-t border-gray-50">
                {data.workDays} hari kerja · Pagi ≤09:30 = 100 · Sore 17–20 = 100 · Terlambat = 50
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Finance Meeting Card ──────────────────────────────────────────────────────

const MEETING_LABEL = {
  FINANCE_EVENT: { title: 'Finance × Event', color: 'border-emerald-200 bg-emerald-50', header: 'text-emerald-800', sub: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  FINANCE_PH:    { title: 'Finance × PH',    color: 'border-amber-200 bg-amber-50',     header: 'text-amber-800',   sub: 'text-amber-600',   btn: 'bg-amber-600 hover:bg-amber-700' },
}

const DIV_LABEL = { FINANCE_HRGA: 'Finance', EVENT: 'Event', PH: 'PH' }

function AttendeePicker({ potentialAttendees, selected, onChange }) {
  // Group by divisi
  const groups = {}
  potentialAttendees.forEach(u => {
    if (!groups[u.divisi]) groups[u.divisi] = []
    groups[u.divisi].push(u)
  })

  return (
    <div className="space-y-2">
      {Object.entries(groups).map(([divisi, users]) => (
        <div key={divisi}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{DIV_LABEL[divisi] || divisi}</p>
          <div className="flex flex-wrap gap-2">
            {users.map(u => {
              const checked = selected.includes(u.id)
              return (
                <button key={u.id} type="button"
                  onClick={() => onChange(checked ? selected.filter(id => id !== u.id) : [...selected, u.id])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    checked ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                  {checked ? '✓ ' : ''}{u.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function FinanceMeetingCard({ meetingType, weekDate, log: initialLog, potentialAttendees = [], canWrite, onSaved }) {
  const cfg = MEETING_LABEL[meetingType]
  const [log, setLog] = useState(initialLog || null)
  const [editing, setEditing] = useState(!initialLog && canWrite)
  const [form, setForm] = useState({
    arSummary:   initialLog?.arSummary || '',
    apPlan:      initialLog?.apPlan    || '',
    notes:       initialLog?.notes     || '',
    attendeeIds: initialLog?.attendeeRecords?.map(a => a.userId) || [],
  })
  const [saving, setSaving] = useState(false)

  const fridayStr = weekDate
    ? new Date(weekDate + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : (() => { const n = new Date(); const f = new Date(n); f.setDate(n.getDate() + (5 - n.getDay())); return f.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) })()

  async function save() {
    if (!form.arSummary.trim() && !form.notes.trim()) return
    setSaving(true)
    const fri = weekDate || (() => { const n = new Date(); const f = new Date(n); f.setDate(n.getDate() + (5 - n.getDay())); return f.toISOString().slice(0, 10) })()
    const res = await fetch('/api/programs/finance-meeting', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekDate: fri, meetingType, ...form }),
    })
    if (res.ok) {
      const saved = await res.json()
      setLog(saved); setEditing(false)
      onSaved?.()
    }
    setSaving(false)
  }

  const attendees = log?.attendeeRecords?.map(a => a.user) || []
  const attendeesByDiv = {}
  attendees.forEach(u => {
    if (!attendeesByDiv[u.divisi]) attendeesByDiv[u.divisi] = []
    attendeesByDiv[u.divisi].push(u.name)
  })

  return (
    <div className={`rounded-2xl border-2 p-4 space-y-3 ${cfg.color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-bold ${cfg.header}`}>💼 Meeting {cfg.title} — Jumat, {fridayStr}</p>
          <p className={`text-xs mt-0.5 ${cfg.sub}`}>Rekap mingguan A/R · A/P · Catatan</p>
        </div>
        {log && !editing && canWrite && (
          <button onClick={() => { setEditing(true); setForm({ arSummary: log.arSummary || '', apPlan: log.apPlan || '', notes: log.notes || '', attendeeIds: log.attendeeRecords?.map(a => a.userId) || [] }) }}
            className={`text-xs underline ${cfg.sub}`}>Edit</button>
        )}
      </div>

      {log && !editing ? (
        <div className="space-y-2">
          {/* Attendees chip list */}
          {attendees.length > 0 && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${cfg.sub}`}>Yang Hadir ({attendees.length})</p>
              <div className="space-y-1">
                {Object.entries(attendeesByDiv).map(([div, names]) => (
                  <p key={div} className="text-xs text-gray-700">
                    <span className="font-semibold text-gray-500">{DIV_LABEL[div] || div}:</span> {names.join(', ')}
                  </p>
                ))}
              </div>
            </div>
          )}
          {log.arSummary && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.sub}`}>A/R Minggu Ini</p>
              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{log.arSummary}</p>
            </div>
          )}
          {log.apPlan && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.sub}`}>A/P Minggu Depan</p>
              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{log.apPlan}</p>
            </div>
          )}
          {log.notes && (
            <div className="bg-white/70 rounded-xl px-3 py-2">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.sub}`}>Catatan & Tindak Lanjut</p>
              <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{log.notes}</p>
            </div>
          )}
          <p className={`text-[10px] ${cfg.sub}`}>
            Dicatat oleh {log.author?.name} · {new Date(log.submittedAt).toLocaleDateString('id-ID')}
          </p>
        </div>
      ) : canWrite ? (
        <div className="space-y-2.5">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${cfg.sub}`}>Yang Hadir</p>
            <AttendeePicker
              potentialAttendees={potentialAttendees}
              selected={form.attendeeIds}
              onChange={ids => setForm({...form, attendeeIds: ids})}
            />
          </div>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${cfg.sub}`}>A/R Minggu Ini</p>
            <textarea value={form.arSummary} onChange={e => setForm({...form, arSummary: e.target.value})}
              rows={2} placeholder="Ringkasan piutang yang dibahas, tagihan masuk, dll..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
          </div>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${cfg.sub}`}>A/P Minggu Depan</p>
            <textarea value={form.apPlan} onChange={e => setForm({...form, apPlan: e.target.value})}
              rows={2} placeholder="Rencana pembayaran minggu depan..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
          </div>
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${cfg.sub}`}>Catatan & Tindak Lanjut</p>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              rows={2} placeholder="Keputusan, tindak lanjut, hal yang perlu difollow-up..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving || (!form.arSummary.trim() && !form.notes.trim())}
              className={`px-4 py-2 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors active:scale-95 ${cfg.btn}`}>
              {saving ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
            {log && <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Batal</button>}
          </div>
        </div>
      ) : (
        <div className="py-3 text-center">
          <p className={`text-sm ${cfg.sub}`}>Catatan meeting belum diisi oleh tim Finance.</p>
        </div>
      )}
    </div>
  )
}

function getFriday(offset = 0) {
  const n = new Date()
  const fri = new Date(n)
  fri.setDate(n.getDate() + (5 - n.getDay()) + offset * 7)
  return fri.toISOString().slice(0, 10)
}

function FinanceMeetingSection({ show, onSaved }) {
  if (!show) return null

  const thisWeek = getFriday(0)
  const [open, setOpen] = useState(false)
  const [meetingData, setMeetingData] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(thisWeek)
  const [weekData, setWeekData] = useState(null)
  const [loadingWeek, setLoadingWeek] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function loadWeek(date) {
    setLoadingWeek(true)
    const res = await fetch(`/api/programs/finance-meeting?weekDate=${date}`)
    if (res.ok) {
      const d = await res.json()
      if (!meetingData) setMeetingData(d)
      setWeekData({ logs: d.logs, weekDate: d.weekDate })
    }
    setLoadingWeek(false)
  }

  function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && !meetingData) loadWeek(thisWeek)
  }

  function navigate(dir) {
    const cur = new Date(selectedWeek + 'T12:00:00')
    cur.setDate(cur.getDate() + dir * 7)
    const next = cur.toISOString().slice(0, 10)
    setSelectedWeek(next)
    loadWeek(next)
  }

  function goThisWeek() {
    setSelectedWeek(thisWeek)
    loadWeek(thisWeek)
  }

  async function exportExcel() {
    setExporting(true)
    const res = await fetch('/api/programs/finance-meeting/export')
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Finance_Meeting_${new Date().toISOString().slice(0,10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  const isThisWeek = selectedWeek === thisWeek
  const isFuture = selectedWeek > thisWeek
  const displayDate = new Date(selectedWeek + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header toggle */}
      <button onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-sm font-bold text-gray-800">Finance Meeting Mingguan</span>
          {meetingData && <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">{meetingData.types.length} meeting</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {(!meetingData || loadingWeek) ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center text-sm text-gray-400 animate-pulse">Memuat data...</div>
          ) : (
            <>
              {/* Export + Week navigator */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100 flex-1">
                  <button onClick={() => navigate(-1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold shrink-0">‹</button>
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold text-gray-700">Jumat, {displayDate}</p>
                    {isThisWeek && <p className="text-[10px] text-emerald-600 font-medium">Minggu ini</p>}
                    {!isThisWeek && <button onClick={goThisWeek} className="text-[10px] text-violet-500 hover:underline">↩ Kembali ke minggu ini</button>}
                  </div>
                  <button onClick={() => navigate(1)} disabled={isFuture}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-sm font-bold shrink-0 disabled:opacity-30">›</button>
                </div>
                <button onClick={exportExcel} disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-colors disabled:opacity-60">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  {exporting ? 'Mengunduh...' : 'Export Excel'}
                </button>
              </div>

              {meetingData.types.map(type => (
                <FinanceMeetingCard
                  key={type + selectedWeek}
                  meetingType={type}
                  weekDate={selectedWeek}
                  log={weekData?.logs?.[type] || null}
                  potentialAttendees={meetingData.potentialAttendees?.[type] || []}
                  canWrite={meetingData.canWrite && isThisWeek}
                  onSaved={() => { onSaved?.(); loadWeek(selectedWeek) }}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── AddTaskForm ───────────────────────────────────────────────────────────────

const TIMING_OPTIONS = [
  { value: 'daily',    label: '☀️ Harian',   color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'weekly',   label: '📅 Mingguan',  color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'monthly',  label: '🗓️ Bulanan',   color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { value: 'yearly',   label: '📆 Tahunan',   color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'periodic', label: '🔁 Berkala',   color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: '',         label: '📝 Lainnya',   color: 'bg-gray-100 text-gray-600 border-gray-300' },
]

function AddTaskForm({ projectOptions, onAdd, defaultTiming = '' }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [projectId, setProjectId] = useState('')
  const [timing, setTiming] = useState(defaultTiming)
  const [adding, setAdding] = useState(false)

  // Sync timing when user switches tab (only when form is closed)
  useEffect(() => {
    if (!open) setTiming(defaultTiming)
  }, [defaultTiming, open])

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    await onAdd({ title, dueDate: due || null, projectId: projectId || null, timing: timing || null })
    setTitle(''); setDue(''); setProjectId(''); setTiming(defaultTiming); setOpen(false)
    setAdding(false)
  }

  const activeTiming = TIMING_OPTIONS.find(o => o.value === timing) || TIMING_OPTIONS[TIMING_OPTIONS.length - 1]

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-violet-200 text-violet-500 hover:bg-violet-50 hover:border-violet-400 transition-all font-medium text-sm">
      <span className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg leading-none">+</span>
      Tambah tugas personal
    </button>
  )

  return (
    <div className="rounded-2xl border-2 border-violet-300 bg-violet-50/40 p-4 space-y-3">
      <p className="text-sm font-bold text-violet-700">Tugas Baru</p>

      {/* Timing selector — pill buttons */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5 font-medium">Kategori tugas</p>
        <div className="flex flex-wrap gap-1.5">
          {TIMING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTiming(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                timing === opt.value
                  ? opt.color + ' shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <input className="input w-full" placeholder="Nama tugas..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <input type="date" className="input flex-1" value={due} onChange={e => setDue(e.target.value)} />
        <select className="select flex-1" value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">Tanpa project</option>
          {(projectOptions || []).map(p => (
            <option key={p.id} value={p.id}>{p.code} · {p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1 py-2">Batal</button>
        <button onClick={submit} disabled={adding || !title.trim()} className="btn-primary flex-1 py-2">
          {adding ? 'Menyimpan...' : `Tambah ke ${activeTiming.label}`}
        </button>
      </div>
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count, accent = 'bg-gray-400', color = 'text-gray-700' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-1 h-4 rounded-full shrink-0 ${accent}`} />
      <span className={`text-sm font-bold ${color}`}>{label}</span>
      {count > 0 && (
        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-semibold">{count}</span>
      )}
    </div>
  )
}

// ── FilterSort ────────────────────────────────────────────────────────────────

function FilterSort({ items, children }) {
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [sort, setSort] = useState('default')

  // Kumpulkan daftar project unik dari items
  const projectOptions = [...new Map(
    items.flatMap(i => i.project ? [{ id: i.project.id, label: `${i.project.code} · ${i.project.name}` }] : [])
  .map(p => [p.id, p])).values()]

  const filtered = items
    .filter(i => {
      const q = search.toLowerCase()
      const matchName = !q || i.title.toLowerCase().includes(q)
      const matchProject = !projectFilter || i.project?.id === projectFilter
      return matchName && matchProject
    })
    .sort((a, b) => {
      if (sort === 'name_asc') return a.title.localeCompare(b.title, 'id')
      if (sort === 'name_desc') return b.title.localeCompare(a.title, 'id')
      if (sort === 'project') return (a.project?.name || '').localeCompare(b.project?.name || '', 'id')
      if (sort === 'deadline') return (a.dueDate || '9') < (b.dueDate || '9') ? -1 : 1
      return 0
    })

  const isFiltered = search || projectFilter || sort !== 'default'

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama tugas..."
          className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder-gray-300"
        />
        {projectOptions.length > 1 && (
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-300">
            <option value="">Semua project</option>
            {projectOptions.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        )}
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="default">Urutan default</option>
          <option value="name_asc">Nama A–Z</option>
          <option value="name_desc">Nama Z–A</option>
          <option value="project">Project</option>
          <option value="deadline">Deadline</option>
        </select>
        {isFiltered && (
          <button onClick={() => { setSearch(''); setProjectFilter(''); setSort('default') }}
            className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-semibold transition-colors">
            Reset
          </button>
        )}
      </div>
      {children(filtered)}
      {isFiltered && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Tidak ada tugas yang cocok.</p>
      )}
    </div>
  )
}

// ── DivisionGroup (director view) — grouped by project ───────────────────────

function ProjectSubGroup({ projectKey, items, onSave }) {
  const [open, setOpen] = useState(false)
  const doneCount = items.filter(i => i.hasTodayUpdate).length
  // projectKey: "P-038 · Subdealer Gathering" or "(Tanpa Project)"
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-xs font-bold text-gray-700 truncate">{projectKey}</span>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[11px] text-gray-400">{doneCount}/{items.length}</span>
          <span className={`text-gray-400 text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <TaskCard key={`${item.kind}-${item.id}`} item={item} onSave={onSave} readOnly={true} />
          ))}
        </div>
      )}
    </div>
  )
}

// Read-only tab view for one member's personal tasks (used in monitoring)
function MemberPersonalTaskTabs({ name, tasks }) {
  const groups = {
    daily:    tasks.filter(i => i.timing === 'daily'),
    weekly:   tasks.filter(i => i.timing === 'weekly'),
    monthly:  tasks.filter(i => i.timing === 'monthly'),
    yearly:   tasks.filter(i => i.timing === 'yearly'),
    periodic: tasks.filter(i => i.timing === 'periodic'),
    other:    tasks.filter(i => !i.timing),
  }
  const tabDefs = TIMING_TAB_DEFS.filter(t => groups[t.key].length > 0)
  const [activeTab, setActiveTab] = useState(tabDefs[0]?.key || 'other')
  const resolvedTab = tabDefs.find(t => t.key === activeTab) ? activeTab : tabDefs[0]?.key
  const items = groups[resolvedTab] || []
  const allDoneAll = tasks.length > 0 && tasks.every(i => i.hasTodayUpdate)

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-700">{name}</span>
        {allDoneAll && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Semua selesai</span>}
      </div>
      {tabDefs.length > 0 && (
        <div className="flex overflow-x-auto border-b border-gray-100 bg-white">
          {tabDefs.map(tab => {
            const isActive = tab.key === resolvedTab
            const count = groups[tab.key].length
            const allDone = count > 0 && groups[tab.key].every(i => i.hasTodayUpdate)
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
                  isActive ? tab.active : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-[10px] rounded-full px-1 py-0.5 font-semibold ${
                  allDone ? 'bg-green-100 text-green-700' : isActive ? tab.badge : 'bg-gray-100 text-gray-400'
                }`}>{allDone ? '✓' : count}</span>
              </button>
            )
          })}
        </div>
      )}
      <div className="divide-y divide-gray-50">
        {items.length > 0
          ? items.map(item => <ReadOnlyTaskCard key={item.id} item={item} />)
          : <p className="text-xs text-gray-400 text-center py-4">Belum ada tugas di kategori ini</p>
        }
      </div>
    </div>
  )
}

function DivisionGroup({ group, onSave }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | updated | pending
  const style = DIV_STYLE[group.divisi] || DIV_STYLE.EVENT
  const doneCount  = group.items.filter(i => i.hasTodayUpdate).length
  const totalCount = group.items.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  // Pisahkan: personal tasks (tanpa project) → tampil per orang dengan timing tabs
  // Project tasks (task biasa + personal task dengan project) → tampil per project
  const personalOnlyItems = group.items.filter(i => i.kind === 'personal' && !i.project)
  const projectItems      = group.items.filter(i => i.kind === 'task' || (i.kind === 'personal' && i.project))

  const filtered = projectItems.filter(i => {
    const q = search.toLowerCase()
    const matchName = !q || i.title.toLowerCase().includes(q) || (i.assignee?.name || '').toLowerCase().includes(q)
      || (i.project?.name || '').toLowerCase().includes(q) || (i.project?.code || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || (statusFilter === 'updated' ? i.hasTodayUpdate : !i.hasTodayUpdate)
    return matchName && matchStatus
  })

  // Kelompokkan per project
  const projectGroups = []
  const seen = {}
  for (const item of filtered) {
    const key = item.project ? `${item.project.code} · ${item.project.name}` : '(Tanpa Project)'
    if (!seen[key]) { seen[key] = []; projectGroups.push(key) }
    seen[key].push(item)
  }

  // Kelompokkan personal tasks per anggota
  const memberMap = {}
  for (const item of personalOnlyItems) {
    const name = item.assignee?.name || 'Anggota'
    if (!memberMap[name]) memberMap[name] = []
    memberMap[name].push(item)
  }
  const memberNames = Object.keys(memberMap).sort()

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left bg-gradient-to-r ${style.gradient} hover:opacity-95 transition-opacity`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white font-black text-xs shrink-0">{style.abbr}</div>
          <div>
            <p className="font-bold text-white text-sm">{group.label}</p>
            <p className="text-xs text-white/70">{totalCount} tugas aktif</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/80">{doneCount}/{totalCount} update hari ini</p>
            <div className="w-28 h-1.5 rounded-full bg-white/30 overflow-hidden mt-1">
              <div className={`h-full rounded-full bg-white transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-sm font-black text-white bg-white/20 px-2.5 py-1 rounded-full">{pct}%</span>
          <span className={`text-white text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>⌄</span>
        </div>
      </button>
      {open && (
        <div className="bg-white px-4 pb-4 space-y-3 pt-3">

          {/* Search bar — selalu tampil di atas */}
          <div className="flex gap-2 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama anggota / tugas / project..."
              className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-violet-200 placeholder-gray-300" />
            <div className="flex gap-1">
              {[['all','Semua'],['updated','Sudah update'],['pending','Belum update']].map(([val, label]) => (
                <button key={val} onClick={() => setStatusFilter(val)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-xl font-semibold border transition-colors ${
                    statusFilter === val ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Tugas rutin per anggota (personal tasks dengan timing) */}
          {memberNames.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Tugas Rutin Anggota</p>
              <div className="space-y-2">
                {memberNames
                  .filter(name => !search || name.toLowerCase().includes(search.toLowerCase()))
                  .map(name => (
                    <MemberPersonalTaskTabs key={name} name={name} tasks={memberMap[name]} />
                  ))}
              </div>
            </div>
          )}

          {/* Task project */}
          {projectItems.length > 0 && (
            <div>
              {memberNames.length > 0 && <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 mt-1">Task Project</p>}
              <div className="space-y-2">
                {projectGroups.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-4">{search || statusFilter !== 'all' ? 'Tidak ada yang cocok.' : ''}</p>
                  : projectGroups.map(key => (
                      <ProjectSubGroup key={key} projectKey={key} items={seen[key]} onSave={onSave} />
                    ))
                }
              </div>
            </div>
          )}

          {memberNames.length === 0 && projectGroups.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Tidak ada tugas aktif.</p>
          )}
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ title, count, defaultOpen = false, icon, accent, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const headerCls = accent
    ? `w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${accent}`
    : 'w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50/60 transition-colors'
  const titleCls = accent ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-gray-800'
  const countCls = accent ? 'text-xs bg-white/20 text-white rounded-full px-2 py-0.5 font-semibold' : 'text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5'
  const chevronCls = accent ? 'text-white/70 text-xs' : 'text-gray-400 text-xs'
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
      <button onClick={() => setOpen(o => !o)} className={headerCls}>
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className={titleCls}>{title}</span>
          {count != null && <span className={countCls}>{count}</span>}
        </div>
        <span className={chevronCls}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  )
}

// ── Personal task tab panel (shared across all render modes) ──────────────────
const TIMING_TAB_DEFS = [
  { key: 'daily',    label: 'Harian',   icon: '☀️',
    active: 'border-orange-400 text-orange-700 bg-orange-50',
    badge:  'bg-orange-100 text-orange-700' },
  { key: 'weekly',   label: 'Mingguan', icon: '📅',
    active: 'border-blue-500 text-blue-700 bg-blue-50',
    badge:  'bg-blue-100 text-blue-700' },
  { key: 'monthly',  label: 'Bulanan',  icon: '🗓️',
    active: 'border-violet-500 text-violet-700 bg-violet-50',
    badge:  'bg-violet-100 text-violet-700' },
  { key: 'yearly',   label: 'Tahunan',  icon: '📆',
    active: 'border-emerald-500 text-emerald-700 bg-emerald-50',
    badge:  'bg-emerald-100 text-emerald-700' },
  { key: 'periodic', label: 'Berkala',  icon: '🔁',
    active: 'border-teal-500 text-teal-700 bg-teal-50',
    badge:  'bg-teal-100 text-teal-700' },
  { key: 'other',    label: 'Lainnya',  icon: '📝',
    active: 'border-gray-500 text-gray-700 bg-gray-50',
    badge:  'bg-gray-200 text-gray-600' },
]

function PersonalTaskTabs({ tasks, projectOptions, onSave, onDelete, onAdd }) {
  const groups = {
    daily:    tasks.filter(i => i.timing === 'daily'),
    weekly:   tasks.filter(i => i.timing === 'weekly'),
    monthly:  tasks.filter(i => i.timing === 'monthly'),
    yearly:   tasks.filter(i => i.timing === 'yearly'),
    periodic: tasks.filter(i => i.timing === 'periodic'),
    other:    tasks.filter(i => !i.timing),
  }
  const tabDefs = TIMING_TAB_DEFS.filter(t => groups[t.key].length > 0)
  const [activeTab, setActiveTab] = useState(tabDefs[0]?.key || 'other')

  // If the active tab becomes empty (e.g. task deleted), fall back
  const resolvedTab = tabDefs.find(t => t.key === activeTab) ? activeTab : tabDefs[0]?.key
  const activeDef = TIMING_TAB_DEFS.find(t => t.key === resolvedTab)
  const items = groups[resolvedTab] || []

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
        {tabDefs.map(tab => {
          const isActive = tab.key === resolvedTab
          const count = groups[tab.key].length
          const allDone = count > 0 && groups[tab.key].every(i => i.hasTodayUpdate)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                isActive ? tab.active : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                allDone ? 'bg-green-100 text-green-700' : isActive ? tab.badge : 'bg-gray-200 text-gray-500'
              }`}>
                {allDone ? '✓' : count}
              </span>
            </button>
          )
        })}
      </div>

      {/* AddTaskForm — always visible at top, above task list */}
      <div className="px-4 pt-4">
        <AddTaskForm
          projectOptions={projectOptions}
          defaultTiming={resolvedTab && resolvedTab !== 'other' ? resolvedTab : ''}
          onAdd={(item) => { onAdd(item); setActiveTab(item.timing || 'other') }}
        />
      </div>

      {/* Task list */}
      <div className="px-4 pb-4 pt-3">
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map(item => (
              <TaskCard key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <p className="text-center py-6 text-gray-400 text-sm">Belum ada tugas di kategori ini</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState(null)
  const [briefingLog, setBriefingLog] = useState(null)
  const [hasFinanceMeeting, setHasFinanceMeeting] = useState(false)
  const [sharingSessions, setSharingSessions] = useState([])
  const [todayEvents, setTodayEvents] = useState([])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/my-tasks').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setData(d)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/my-tasks/init', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return
      setCheckIn(d.checkIn)
      if (d.briefingLog !== undefined) setBriefingLog(d.briefingLog)
      if (d.hasFinanceMeeting) setHasFinanceMeeting(true)
      if (Array.isArray(d.sharingSessions)) setSharingSessions(d.sharingSessions)
      if (Array.isArray(d.todayEvents)) setTodayEvents(d.todayEvents)
    })
    load()
  }, [status, load])

  async function handleMorningAck() {
    const now = hourWIBNow()
    const isLate = now > 8 + 5/60
    const todayStr = new Date(Date.now() + 7*3600000).toISOString().slice(0,10)
    // Check-in pagi (existing)
    await fetch('/api/daily-checkin', { method: 'POST' })
    // Sekaligus catat kehadiran briefing
    await fetch('/api/programs/briefing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayStr, status: 'HADIR', note: isLate ? 'Telat' : null }),
    })
    const [ci, br] = await Promise.all([
      fetch('/api/daily-checkin').then(r => r.ok ? r.json() : null),
      fetch(`/api/programs/briefing?date=${todayStr}`).then(r => r.ok ? r.json() : null),
    ])
    if (ci) setCheckIn(ci)
    if (br) setBriefingLog(br.log || null)
  }

  async function handleEveningSubmit() {
    const res = await fetch('/api/daily-checkin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) { const d = await res.json(); setCheckIn(prev => ({ ...prev, eveningAt: d.eveningAt })) }
  }

  async function saveProgress(item, statusVal, note) {
    const payload = { status: statusVal, note }
    if (item.kind === 'task') payload.taskId = item.id
    else payload.personalTaskId = item.id
    const res = await fetch('/api/my-tasks/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) load()
    else { const err = await res.json().catch(() => ({})); alert(err.error || 'Gagal menyimpan') }
  }

  async function addPersonalTask({ title, dueDate, projectId, timing }) {
    const res = await fetch('/api/my-tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueDate, projectId, timing: timing || null }),
    })
    if (res.ok) load()
  }

  async function removePersonalTask(id) {
    await fetch(`/api/my-tasks/personal/${id}`, { method: 'DELETE' })
    load()
  }

  if (status !== 'authenticated' || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl bg-white border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </main>
      </div>
    )
  }

  // ── OWNER VIEW: task sendiri (editable) + monitoring tim (read-only) ────────
  if (data.mode === 'owner') {
    const myItems        = data.myItems || []
    const myProjectTasks = myItems.filter(i => i.kind === 'task' || (i.kind === 'personal' && i.project))
    const myPersonalTasks = myItems.filter(i => i.kind === 'personal' && !i.project)
    const myDone         = myItems.filter(i => i.hasTodayUpdate).length
    const myPending      = myItems.filter(i => !i.hasTodayUpdate)
    const teamItems      = data.groups.flatMap(g => g.items)
    const teamDone       = teamItems.filter(i => i.hasTodayUpdate).length
    const mySharing      = sharingSessions.filter(s => s.userId === session?.user?.id)
    const dailyItems = myItems.filter(i => i.kind === 'task' || !i.timing || i.timing === 'daily')
    const ownerAllTasksDone = dailyItems.length === 0 || dailyItems.every(i => i.hasTodayUpdate)

    function handleExport() {
      window.open('/api/my-tasks/export', '_blank')
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-5 text-white shadow-lg shadow-violet-200">
            <p className="text-sm text-violet-200 font-medium">Halo, {session?.user?.name?.split(' ')[0]}</p>
            <p className="text-xs text-violet-300 mt-0.5">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-2xl font-black">{myDone}<span className="text-lg text-violet-300">/{myItems.length}</span></p>
                <p className="text-xs text-violet-200 mt-0.5">tugasmu sudah diupdate</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{teamDone}/{teamItems.length}</p>
                <p className="text-xs text-violet-200">tim sudah update</p>
              </div>
            </div>
            {myItems.length > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${myItems.length > 0 ? (myDone / myItems.length) * 100 : 0}%` }} />
              </div>
            )}
          </div>

          <CheckInCard checkIn={checkIn} briefingLog={briefingLog} onMorningAck={handleMorningAck} onEveningSubmit={handleEveningSubmit} session={session} allTasksDone={ownerAllTasksDone} />

          <FinanceMeetingSection show={hasFinanceMeeting} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            <PersonalStatsWidget />
            <DisciplineLeaderboard currentUserId={session?.user?.id} />
          </div>

{mySharing.length > 0 && (
            <MySharingSessionCard sessions={mySharing}
              onUpdate={() => fetch('/api/sharing-sessions').then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && setSharingSessions(d))} />
          )}

          {data.deadlinePassed && myPending.length > 0 && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
              <p className="text-sm font-bold text-red-700">⏰ Sudah lewat 20:00 — {myPending.length} tugasmu belum di-update</p>
            </div>
          )}

          {/* Personal task OWNER */}
          <PersonalTaskTabs tasks={myPersonalTasks} projectOptions={data.projectOptions} onSave={saveProgress} onDelete={removePersonalTask} onAdd={addPersonalTask} />

          {/* Task project yang di-assign ke OWNER */}
          {myProjectTasks.length > 0 && (
            <CollapsibleSection title="Task Project Saya" count={myProjectTasks.length} defaultOpen={false} accent="bg-violet-500 hover:bg-violet-600">
              <div className="space-y-3 mt-2">
                {myProjectTasks.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
              </div>
            </CollapsibleSection>
          )}

          {/* Monitoring tim — read-only, selalu tampil */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionHeader label="Monitoring Tim" count={teamItems.length} accent="bg-blue-400" />
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-colors shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Export
              </button>
            </div>
            {data.deadlinePassed && (teamItems.length - teamDone) > 0 && (
              <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3 mb-3">
                <p className="text-sm font-bold text-red-700">⏰ Sudah lewat jam 20:00 — {teamItems.length - teamDone} anggota belum update</p>
              </div>
            )}
            <div className="space-y-3">
              {data.groups.map(group => (
                <DivisionGroup key={group.divisi} group={group} onSave={saveProgress} />
              ))}
            </div>
          </div>

          {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
            <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
              <AllSharingSessionsTable sessions={sharingSessions} />
            </CollapsibleSection>
          )}
        </main>
      </div>
    )
  }

  // ── DIRECTOR VIEW ───────────────────────────────────────────────────────────
  if (data.mode === 'director') {
    const allItems   = data.groups.flatMap(g => g.items)
    const totalDone  = allItems.filter(i => i.hasTodayUpdate).length
    const totalItems = allItems.length

    function handleExport() {
      window.open('/api/my-tasks/export', '_blank')
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
          <BackButton />
              <h1 className="text-xl font-bold text-gray-900">Monitoring Tim</h1>
              <p className="text-sm text-gray-500 mt-0.5">Progress update seluruh tim hari ini</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition-colors shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Export Excel
              </button>
              <ProgressRing done={totalDone} total={totalItems} />
              <div>
                <p className="text-sm font-bold text-gray-800">{totalDone} selesai</p>
                <p className="text-xs text-gray-400">{totalItems - totalDone} belum update</p>
              </div>
            </div>
          </div>
          {data.deadlinePassed && (totalItems - totalDone) > 0 && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
              <p className="text-sm font-bold text-red-700">⏰ Sudah lewat jam 20:00 — {totalItems - totalDone} anggota belum update</p>
            </div>
          )}
          {data.groups.map(group => (
            <DivisionGroup key={group.divisi} group={group} onSave={saveProgress} />
          ))}
          {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
            <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
              <AllSharingSessionsTable sessions={sharingSessions} />
            </CollapsibleSection>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            <PersonalStatsWidget />
            <DisciplineLeaderboard currentUserId={session?.user?.id} />
          </div>
        </main>
      </div>
    )
  }

  // ── TEAM LEAD VIEW ──────────────────────────────────────────────────────────
  if (data.mode === 'team_lead') {
    const myItems      = data.myItems || []
    const teamItems    = data.groups.flatMap(g => g.items)
    const myDone       = myItems.filter(i => i.hasTodayUpdate).length
    const teamDone     = teamItems.filter(i => i.hasTodayUpdate).length
    const myPending    = myItems.filter(i => !i.hasTodayUpdate)
    const myProjectTasks  = myItems.filter(i => i.kind === 'task' || (i.kind === 'personal' && i.project))
    const myPersonalTasks = myItems.filter(i => i.kind === 'personal' && !i.project)
    const mySharing = sharingSessions.filter(s => s.userId === session?.user?.id)
    const dailyItems = myItems.filter(i => i.kind === 'task' || !i.timing || i.timing === 'daily')
    const teamLeadAllTasksDone = dailyItems.length === 0 || dailyItems.every(i => i.hasTodayUpdate)

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 p-5 text-white shadow-lg shadow-violet-200">
            <p className="text-sm text-violet-200 font-medium">Halo, {session?.user?.name?.split(' ')[0]}</p>
            <p className="text-xs text-violet-300 mt-0.5">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-2xl font-black">{myDone}<span className="text-lg text-violet-300">/{myItems.length}</span></p>
                <p className="text-xs text-violet-200 mt-0.5">tugasmu sudah diupdate</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{teamDone}/{teamItems.length}</p>
                <p className="text-xs text-violet-200">tim sudah update</p>
              </div>
            </div>
            {myItems.length > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${myItems.length > 0 ? (myDone / myItems.length) * 100 : 0}%` }} />
              </div>
            )}
          </div>

          <CheckInCard checkIn={checkIn} briefingLog={briefingLog} onMorningAck={handleMorningAck} onEveningSubmit={handleEveningSubmit} session={session} allTasksDone={teamLeadAllTasksDone} />

          <FinanceMeetingSection show={hasFinanceMeeting} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
            <PersonalStatsWidget />
            <DisciplineLeaderboard currentUserId={session?.user?.id} />
          </div>

          {mySharing.length > 0 && <MySharingSessionCard sessions={mySharing} onUpdate={() => fetch('/api/sharing-sessions').then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && setSharingSessions(d))} />}

          {todayEvents.length > 0 && (
            <EventDayBanner events={todayEvents} canManageRundown={true} />
          )}

          {/* Overdue alert */}
          {data.deadlinePassed && myPending.length > 0 && (
            <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
              <p className="text-sm font-bold text-red-700">⏰ Sudah lewat 20:00 — {myPending.length} tugasmu belum di-update</p>
            </div>
          )}

          {/* Personal tasks — team_lead */}
          <PersonalTaskTabs tasks={myPersonalTasks} projectOptions={data.projectOptions} onSave={saveProgress} onDelete={removePersonalTask} onAdd={addPersonalTask} />

          {/* My tasks */}
          {myProjectTasks.length > 0 && (
            <CollapsibleSection title="Task Project Saya" count={myProjectTasks.length} defaultOpen={false} accent="bg-violet-500 hover:bg-violet-600">
              <FilterSort items={myProjectTasks}>
                {(filtered) => (
                  <div className="space-y-3 mt-2">
                    {filtered.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}
                  </div>
                )}
              </FilterSort>
            </CollapsibleSection>
          )}

          {/* Team sections */}
          {data.groups.length > 0 && (
            <div>
              <SectionHeader label="Update Tim" accent="bg-blue-400" />
              <div className="space-y-3">
                {data.groups.map(group => <DivisionGroup key={group.divisi} group={group} onSave={saveProgress} />)}
              </div>
            </div>
          )}

          {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
            <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
              <AllSharingSessionsTable sessions={sharingSessions} />
            </CollapsibleSection>
          )}
        </main>
      </div>
    )
  }

  // ── PERSONAL VIEW (operational staff) ──────────────────────────────────────
  const allItems    = data.items || []
  // Personal task yg ada project-nya → ikut grup project tasks
  // Personal task tanpa project → tetap di "Catatan & To-Do"
  const projectTasks  = allItems.filter(i => i.kind === 'task' || (i.kind === 'personal' && i.project))
  const personalTasks = allItems.filter(i => i.kind === 'personal' && !i.project)

  const doneToday   = allItems.filter(i => i.hasTodayUpdate).length
  const pendingCount = allItems.filter(i => !i.hasTodayUpdate).length
  const dailyItems = allItems.filter(i => i.kind === 'task' || !i.timing || i.timing === 'daily')
  const personalAllTasksDone = dailyItems.length === 0 || dailyItems.every(i => i.hasTodayUpdate)
  const mySharing = sharingSessions.filter(s => s.userId === session?.user?.id)

  // Group project tasks by urgency
  const today = new Date(); today.setHours(0,0,0,0)
  const overdueTasks  = projectTasks.filter(t => !t.hasTodayUpdate && t.dueDate && new Date(t.dueDate) < today)
  const dueTodayTasks = projectTasks.filter(t => !t.hasTodayUpdate && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) === today.getTime())
  const ongoingTasks  = projectTasks.filter(t => !t.hasTodayUpdate && (!t.dueDate || new Date(t.dueDate) >= today) && !dueTodayTasks.includes(t))
  const updatedTasks  = projectTasks.filter(t => t.hasTodayUpdate)

  const pct = allItems.length > 0 ? Math.round((doneToday / allItems.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Hero header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-200/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-violet-200 font-medium">
                Halo, {session?.user?.name?.split(' ')[0]}
              </p>
              <p className="text-xs text-violet-300 mt-0.5">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-4">
                {pct === 100 ? (
                  <p className="text-lg font-black">Semua tugas sudah diupdate.</p>
                ) : pendingCount === 0 && allItems.length === 0 ? (
                  <p className="text-lg font-bold">Tidak ada tugas hari ini.</p>
                ) : (
                  <>
                    <p className="text-2xl font-black">{pendingCount} <span className="text-lg font-bold text-violet-200">tugas perlu update</span></p>
                    <p className="text-xs text-violet-300 mt-0.5">Update sebelum pukul 20:00 WIB</p>
                  </>
                )}
              </div>
            </div>
            <ProgressRing done={doneToday} total={allItems.length} />
          </div>
          {allItems.length > 0 && (
            <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* ── Check-in + Briefing ── */}
        <CheckInCard checkIn={checkIn} briefingLog={briefingLog} onMorningAck={handleMorningAck} onEveningSubmit={handleEveningSubmit} session={session} allTasksDone={personalAllTasksDone} />

        {/* ── Finance Meeting Mingguan ── */}
        <FinanceMeetingSection show={hasFinanceMeeting} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
          <PersonalStatsWidget />
          <DisciplineLeaderboard currentUserId={session?.user?.id} />
        </div>

        {/* ── Event Day Mode ── */}
        {todayEvents.length > 0 && (
          <EventDayBanner
            events={todayEvents}
            canManageRundown={false}
          />
        )}

        {/* ── Deadline alert ── */}
        {data.deadlinePassed && pendingCount > 0 && (
          <div className="rounded-2xl bg-red-50 border-2 border-red-200 px-4 py-3">
            <p className="text-sm font-bold text-red-700">Sudah lewat jam 20:00</p>
            <p className="text-xs text-red-500 mt-0.5">{pendingCount} tugas belum di-update — segera isi sebelum dicatat sebagai tidak hadir</p>
          </div>
        )}

        {/* ── Sharing session ── */}
        {mySharing.length > 0 && (
          <MySharingSessionCard sessions={mySharing}
            onUpdate={() => fetch('/api/sharing-sessions').then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) && setSharingSessions(d))} />
        )}

        {/* ── Personal tasks — personal mode ── */}
        <PersonalTaskTabs tasks={personalTasks} projectOptions={data.projectOptions} onSave={saveProgress} onDelete={removePersonalTask} onAdd={addPersonalTask} />

        {/* ── Task Project dengan Filter/Sort ── */}
        {projectTasks.length > 0 && (
          <FilterSort items={projectTasks}>
            {(filtered) => {
              const todayFs = new Date(); todayFs.setHours(0,0,0,0)
              const fOverdue  = filtered.filter(t => !t.hasTodayUpdate && t.dueDate && new Date(t.dueDate) < todayFs)
              const fDueToday = filtered.filter(t => !t.hasTodayUpdate && t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) === todayFs.getTime())
              const fOngoing  = filtered.filter(t => !t.hasTodayUpdate && (!t.dueDate || new Date(t.dueDate) >= todayFs) && !fDueToday.includes(t))
              const fUpdated  = filtered.filter(t => t.hasTodayUpdate)
              return (
                <div className="space-y-4 mt-2">
                  {fOverdue.length > 0 && (
                    <div>
                      <SectionHeader label="Terlambat" count={fOverdue.length} accent="bg-red-500" color="text-red-600" />
                      <div className="space-y-3">{fOverdue.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}</div>
                    </div>
                  )}
                  {fDueToday.length > 0 && (
                    <div>
                      <SectionHeader label="Deadline Hari Ini" count={fDueToday.length} accent="bg-amber-500" color="text-amber-700" />
                      <div className="space-y-3">{fDueToday.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}</div>
                    </div>
                  )}
                  {fOngoing.length > 0 && (
                    <div>
                      <SectionHeader label="Task Berjalan" count={fOngoing.length} accent="bg-violet-400" />
                      <div className="space-y-3">{fOngoing.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}</div>
                    </div>
                  )}
                  {fUpdated.length > 0 && (
                    <CollapsibleSection title="Sudah Di-update Hari Ini" count={fUpdated.length} defaultOpen={false}>
                      <div className="space-y-2">{fUpdated.map(item => <TaskCard key={item.id} item={item} onSave={saveProgress} />)}</div>
                    </CollapsibleSection>
                  )}
                </div>
              )
            }}
          </FilterSort>
        )}

        {/* ── Sharing sessions ── */}
        {sharingSessions.filter(s => s.status === 'UPCOMING').length > 0 && (
          <CollapsibleSection title="Jadwal Sharing Session" count={sharingSessions.filter(s => s.status === 'UPCOMING').length}>
            <AllSharingSessionsTable sessions={sharingSessions} />
          </CollapsibleSection>
        )}

        {/* Empty state */}
        {allItems.length === 0 && personalTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🎯</p>
            <p className="font-semibold text-gray-500">Tidak ada tugas aktif</p>
            <p className="text-sm mt-1">Tambahkan to-do atau tunggu PM assign task baru</p>
          </div>
        )}

      </main>
    </div>
  )
}
