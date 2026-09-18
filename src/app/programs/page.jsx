'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import BackButton from '@/components/BackButton'

const WFO_DIVISI = ['EVENT', 'PH', 'CREATIVE']
const DIVISI_LABEL = { EVENT:'Event', PH:'Production House', CREATIVE:'Creative', FINANCE_HRGA:'Finance & HRGA' }

function getTuesdayOfWeek(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = 2 - day + offset * 7
  const tue = new Date(now)
  tue.setDate(now.getDate() + diff)
  return tue.toISOString().slice(0, 10)
}

function getFridayOfWeek(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = 5 - day + offset * 7
  const fri = new Date(now)
  fri.setDate(now.getDate() + diff)
  return fri.toISOString().slice(0, 10)
}

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
}

function fmtDateTime(d) {
  return new Date(d).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
}

export default function ProgramsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [wfoOffset, setWfoOffset] = useState(0)
  const [finOffset, setFinOffset] = useState(0)
  const [wfoDate, setWfoDate] = useState(() => getTuesdayOfWeek(0))
  const [finDate, setFinDate] = useState(() => getFridayOfWeek(0))

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const loadSummary = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/programs/summary?wfoDate=${wfoDate}&finDate=${finDate}`)
    const data = await res.json()
    setSummary(data)
    setLoading(false)
  }, [wfoDate, finDate])

  useEffect(() => {
    if (status === 'authenticated') loadSummary()
  }, [status, loadSummary])

  if (status !== 'authenticated') return null

  const isAdmin = session.user.role === 'OWNER' ||
    (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')
  const isDirector = session.user.role === 'DIRECTOR' || session.user.role === 'OWNER'
  const needsWfo = WFO_DIVISI.includes(session.user.divisi)
  const needsFinMeeting = summary?.finMeeting?.isRequired || isAdmin

  const changeWfoWeek = (dir) => {
    const next = wfoOffset + dir
    setWfoOffset(next)
    setWfoDate(getTuesdayOfWeek(next))
  }

  const changeFinWeek = (dir) => {
    const next = finOffset + dir
    setFinOffset(next)
    setFinDate(getFridayOfWeek(next))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Program Kerja Mingguan</h1>
          <p className="text-sm text-gray-500 mt-1">Dokumentasi dan kehadiran program rutin Watermark Indonesia</p>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <Spinner />
          </div>
        ) : (
          <>
            <BriefingSection
              session={session}
              isAdmin={isAdmin}
              initialLog={summary?.briefing?.log}
              initialAllLogs={summary?.briefing?.allLogs}
              totalUsers={summary?.briefing?.totalUsers}
              today={summary?.today}
            />

            {(needsWfo || isDirector) && (
              <WfoSection
                session={session}
                isDirector={isDirector}
                wfoOffset={wfoOffset}
                wfoDate={wfoDate}
                onChangeWeek={changeWfoWeek}
                initialLog={summary?.wfo?.log}
                initialTeam={summary?.wfo?.team}
                needsWfo={needsWfo}
              />
            )}

            {(needsFinMeeting || isAdmin) && (
              <FinanceMeetingSection
                session={session}
                finOffset={finOffset}
                finDate={finDate}
                onChangeWeek={changeFinWeek}
                initialLog={summary?.finMeeting?.log}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

// ── BRIEFING SECTION ─────────────────────────────────────────────────────────
function BriefingSection({ session, isAdmin, initialLog, initialAllLogs, totalUsers, today }) {
  const [log, setLog] = useState(initialLog ?? null)
  const [allLogs, setAllLogs] = useState(initialAllLogs ?? null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [showAll, setShowAll] = useState(false)

  const reload = useCallback(async () => {
    const [personal, all] = await Promise.all([
      fetch(`/api/programs/briefing?date=${today}`).then(r => r.json()),
      isAdmin ? fetch(`/api/programs/briefing?date=${today}&all=1`).then(r => r.json()) : Promise.resolve(null),
    ])
    setLog(personal.log || null)
    setAllLogs(all)
  }, [today, isAdmin])

  const submit = async (status) => {
    setSaving(true)
    const res = await fetch('/api/programs/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, status, note: note.trim() || null }),
    })
    const data = await res.json()
    setLog(data)
    setSaving(false)
    if (isAdmin) reload()
  }

  const hadir = log?.status === 'HADIR'
  const izin = log?.status === 'IZIN_PROJECT'
  const todayDayId = new Date().getDay()
  const isWeekend = todayDayId === 0 || todayDayId === 6

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">☀️ Morning Briefing Harian</h2>
          <p className="text-xs text-gray-500">Zoom online · Setiap hari kerja pukul <strong>08:00 WIB</strong> · Wajib semua tim</p>
        </div>
        {isAdmin && allLogs && (
          <button onClick={() => setShowAll(!showAll)} className="text-xs text-brand-600 font-medium hover:underline">
            {showAll ? 'Sembunyikan' : `Lihat rekap (${allLogs.logs?.length || 0}/${totalUsers})`}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        {isWeekend ? (
          <p className="text-sm text-gray-400 text-center py-2">Tidak ada briefing di hari ini (akhir pekan)</p>
        ) : log ? (
          <div className="flex items-center justify-between">
            <div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                hadir ? 'bg-green-100 text-green-700' : izin ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {hadir ? '✅ Hadir' : izin ? '🔄 Izin Project' : '❌ Tidak Hadir'}
              </div>
              {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
              <p className="text-xs text-gray-400 mt-1">Dicatat {fmtDateTime(log.loggedAt)}</p>
            </div>
            <button onClick={() => setLog(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Ubah</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Kehadiran Morning Briefing hari ini:</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => submit('HADIR')} disabled={saving}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                ✅ Hadir
              </button>
              <button onClick={() => submit('IZIN_PROJECT')} disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                🔄 Izin — Ada Project Bersamaan
              </button>
              <button onClick={() => submit('TIDAK_HADIR')} disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">
                ❌ Tidak Hadir
              </button>
            </div>
            <input value={note} onChange={e => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="Catatan (opsional)" />
          </div>
        )}
      </div>

      {isAdmin && showAll && allLogs && (
        <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Rekap Kehadiran Briefing — {fmtDate(today)}
          </div>
          {allLogs.logs?.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Belum ada yang mengisi</p>
            : allLogs.logs.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  l.status === 'HADIR' ? 'bg-green-100 text-green-700' :
                  l.status === 'IZIN_PROJECT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>{l.status === 'HADIR' ? 'Hadir' : l.status === 'IZIN_PROJECT' ? 'Izin Project' : 'Tidak Hadir'}</span>
                <span className="text-sm font-medium text-gray-800">{l.user.name}</span>
                <span className="text-xs text-gray-400">{DIVISI_LABEL[l.user.divisi] || l.user.divisi}</span>
                {l.note && <span className="text-xs text-gray-500 italic">— {l.note}</span>}
                <span className="ml-auto text-xs text-gray-400">{fmtDateTime(l.loggedAt)}</span>
              </div>
            ))
          }
        </div>
      )}
    </section>
  )
}

// ── WFO SELASA SECTION ────────────────────────────────────────────────────────
function WfoSection({ session, isDirector, wfoOffset, wfoDate, onChangeWeek, initialLog, initialTeam, needsWfo }) {
  const [log, setLog] = useState(initialLog ?? null)
  const [teamData, setTeamData] = useState(initialTeam ?? null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ status: '', reason: '', altTime: '' })
  const [showTeam, setShowTeam] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Reload when week changes
  useEffect(() => {
    setFetching(true)
    Promise.all([
      needsWfo ? fetch(`/api/programs/wfo?weekDate=${wfoDate}`).then(r => r.json()) : Promise.resolve({}),
      isDirector ? fetch(`/api/programs/wfo?weekDate=${wfoDate}&all=1`).then(r => r.json()) : Promise.resolve(null),
    ]).then(([personal, team]) => {
      setLog(personal.log || null)
      setTeamData(team)
      setForm({ status: '', reason: '', altTime: '' })
      setFetching(false)
    })
  }, [wfoDate, needsWfo, isDirector])

  const submit = async () => {
    if (!form.status) return
    if (form.status === 'TIDAK_HADIR' && !form.reason.trim()) {
      alert('Alasan wajib diisi jika tidak hadir WFO')
      return
    }
    setSaving(true)
    const res = await fetch('/api/programs/wfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekDate: wfoDate, ...form }),
    })
    const data = await res.json()
    setLog(data)
    setSaving(false)
  }

  const isTuesdayThisWeek = wfoOffset === 0
  const today = new Date().getDay()
  const isPastOrToday = today >= 2 || wfoOffset < 0

  const byDivisi = {}
  if (teamData?.users) {
    teamData.users.forEach(u => {
      if (!byDivisi[u.divisi]) byDivisi[u.divisi] = []
      byDivisi[u.divisi].push(u)
    })
  }

  const totalTeam = teamData?.users?.length || 0
  const totalHadir = teamData?.users?.filter(u => u.wfoLogs?.[0]?.status === 'HADIR').length || 0
  const totalIzin = teamData?.users?.filter(u => u.wfoLogs?.[0]?.status === 'TIDAK_HADIR').length || 0
  const totalBelum = totalTeam - totalHadir - totalIzin

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">🏢 WFO Konsolidasi Selasa</h2>
          <p className="text-xs text-gray-500">Wajib hadir kantor setiap Selasa · Divisi EVENT, PH, CREATIVE · Penanggung jawab: Director masing-masing divisi</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onChangeWeek(-1)} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-sm">‹</button>
          <span className="text-xs font-medium text-gray-600 w-24 text-center">
            {isTuesdayThisWeek ? 'Minggu ini' : wfoOffset < 0 ? `${Math.abs(wfoOffset)} minggu lalu` : `${wfoOffset} minggu depan`}
          </span>
          <button onClick={() => onChangeWeek(1)} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-sm">›</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
        <p className="text-xs text-gray-400">Selasa, {fmtDate(wfoDate)}</p>

        {fetching ? <Spinner /> : needsWfo && (
          log ? (
            <div className="flex items-center justify-between">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                  log.status === 'HADIR' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {log.status === 'HADIR' ? '🏢 Hadir WFO' : '🏠 Tidak Hadir'}
                </div>
                {log.reason && <p className="text-xs text-gray-500 mt-1">Alasan: {log.reason}</p>}
                {log.altTime && <p className="text-xs text-gray-500">Waktu alternatif: {log.altTime}</p>}
                <p className="text-xs text-gray-400 mt-1">Dicatat {fmtDateTime(log.submittedAt)}</p>
              </div>
              {isTuesdayThisWeek && (
                <button onClick={() => setLog(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Ubah</button>
              )}
            </div>
          ) : isPastOrToday ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Kehadiran WFO Selasa ini:</p>
              <div className="flex gap-2">
                <button onClick={() => setForm({...form, status:'HADIR'})}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.status === 'HADIR' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  🏢 Hadir WFO
                </button>
                <button onClick={() => setForm({...form, status:'TIDAK_HADIR'})}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.status === 'TIDAK_HADIR' ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  🏠 Tidak Bisa Hadir
                </button>
              </div>
              {form.status === 'TIDAK_HADIR' && (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Alasan <span className="text-red-500">*</span></label>
                    <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
                      rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                      placeholder="Jelaskan alasan tidak bisa hadir WFO..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Waktu konsolidasi pengganti (opsional)</label>
                    <input value={form.altTime} onChange={e => setForm({...form, altTime: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                      placeholder="Mis: Rabu pagi 09:00, atau Kamis setelah meeting klien..." />
                  </div>
                </div>
              )}
              {form.status && (
                <button onClick={submit} disabled={saving}
                  className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Pengisian dibuka pada hari Selasa</p>
          )
        )}
      </div>

      {isDirector && teamData && (
        <div className="mt-3">
          <button onClick={() => setShowTeam(!showTeam)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <span>Rekap Tim — {fmtDate(wfoDate)}</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-600 font-semibold">✅ {totalHadir} Hadir</span>
              <span className="text-red-500 font-semibold">❌ {totalIzin} Tidak Hadir</span>
              <span className="text-gray-400">⏳ {totalBelum} Belum Isi</span>
              <span className="text-gray-400">{showTeam ? '▲' : '▼'}</span>
            </div>
          </button>

          {showTeam && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {Object.entries(byDivisi).map(([div, users]) => (
                <div key={div}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {DIVISI_LABEL[div] || div}
                  </div>
                  {users.map(u => {
                    const wlog = u.wfoLogs?.[0]
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold min-w-[72px] text-center ${
                          !wlog ? 'bg-gray-100 text-gray-400' :
                          wlog.status === 'HADIR' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {!wlog ? 'Belum Isi' : wlog.status === 'HADIR' ? '🏢 Hadir' : '🏠 Tdk Hadir'}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{u.name}</span>
                        <span className="text-xs text-gray-400">{u.role}</span>
                        {wlog?.reason && <span className="text-xs text-gray-500 italic ml-1">— {wlog.reason}</span>}
                        {wlog?.altTime && <span className="text-xs text-blue-500 ml-1">Alt: {wlog.altTime}</span>}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── JUMAT FINANCE MEETING ─────────────────────────────────────────────────────
function FinanceMeetingSection({ session, finOffset, finDate, onChangeWeek, initialLog }) {
  const [log, setLog] = useState(initialLog ?? null)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({
    arSummary: initialLog?.arSummary || '',
    apPlan: initialLog?.apPlan || '',
    notes: initialLog?.notes || '',
    attendees: initialLog?.attendees || '',
  }))
  const [showHistory, setShowHistory] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Reload when week changes
  useEffect(() => {
    setFetching(true)
    fetch(`/api/programs/finance-meeting?weekDate=${finDate}`)
      .then(r => r.json())
      .then(data => {
        setLog(data.log || null)
        setForm({
          arSummary: data.log?.arSummary || '',
          apPlan: data.log?.apPlan || '',
          notes: data.log?.notes || '',
          attendees: data.log?.attendees || '',
        })
        setEditing(false)
        setFetching(false)
      })
  }, [finDate])

  const loadHistory = useCallback(async () => {
    const hist = await fetch('/api/programs/finance-meeting?history=1').then(r => r.json())
    setHistory(Array.isArray(hist) ? hist : [])
  }, [])

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory, loadHistory])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/programs/finance-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekDate: finDate, ...form }),
    })
    const data = await res.json()
    setLog(data)
    setSaving(false)
    setEditing(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">💼 Meeting Keuangan Mingguan (Jumat)</h2>
          <p className="text-xs text-gray-500">Finance · PM Event · PM/Produser PH · Membahas AR minggu lalu & AP minggu depan</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onChangeWeek(-1)} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-sm">‹</button>
          <span className="text-xs font-medium text-gray-600 w-24 text-center">
            {finOffset === 0 ? 'Minggu ini' : finOffset < 0 ? `${Math.abs(finOffset)} minggu lalu` : `${finOffset} minggu depan`}
          </span>
          <button onClick={() => onChangeWeek(1)} className="p-1 rounded hover:bg-gray-100 text-gray-500 text-sm">›</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 mb-3">Jumat, {fmtDate(finDate)}</p>

        {fetching ? <Spinner /> : editing || !log ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">{log ? 'Edit Catatan Meeting' : 'Isi Catatan Meeting Jumat'}</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Yang Hadir</label>
              <input value={form.attendees} onChange={e => setForm({...form, attendees: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Mis: Anung, Wulan, Bagastya, Jamaluddin..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📥 Account Receivable — Minggu Lalu</label>
              <textarea value={form.arSummary} onChange={e => setForm({...form, arSummary: e.target.value})}
                rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                placeholder="Ringkasan piutang yang dibahas: project mana, nominal, status pembayaran klien..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">📤 Account Payable — Rencana Minggu Depan</label>
              <textarea value={form.apPlan} onChange={e => setForm({...form, apPlan: e.target.value})}
                rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                placeholder="Pembayaran apa yang akan diproses minggu depan: vendor, nominal, project..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan Lain</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                placeholder="Isu atau keputusan penting lain yang dibahas..." />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
              {log && <button onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Batal
              </button>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">✅ Tercatat</span>
              <button onClick={() => setEditing(true)} className="text-xs text-brand-600 hover:underline">Edit</button>
            </div>
            {log.attendees && (
              <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Yang Hadir</p>
              <p className="text-sm text-gray-700">{log.attendees}</p></div>
            )}
            {log.arSummary && (
              <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">📥 Account Receivable</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{log.arSummary}</p></div>
            )}
            {log.apPlan && (
              <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">📤 Account Payable — Rencana</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{log.apPlan}</p></div>
            )}
            {log.notes && (
              <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Catatan Lain</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{log.notes}</p></div>
            )}
            <p className="text-xs text-gray-400">Diisi oleh {log.author?.name} · {fmtDateTime(log.submittedAt)}</p>
          </div>
        )}
      </div>

      <button onClick={() => setShowHistory(!showHistory)}
        className="mt-3 w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
        <span>Riwayat Meeting Sebelumnya</span>
        <span className="text-gray-400">{showHistory ? '▲' : '▼'}</span>
      </button>

      {showHistory && (
        <div className="mt-2 space-y-3">
          {history.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat</p>
            : history.filter(h => h.weekDate !== finDate).map(h => (
              <div key={h.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-600">{fmtDate(h.weekDate)}</p>
                  <span className="text-xs text-gray-400">oleh {h.author?.name}</span>
                </div>
                {h.arSummary && <div className="mb-2"><p className="text-xs text-gray-400 mb-0.5">AR:</p><p className="text-xs text-gray-700">{h.arSummary}</p></div>}
                {h.apPlan && <div><p className="text-xs text-gray-400 mb-0.5">AP:</p><p className="text-xs text-gray-700">{h.apPlan}</p></div>}
              </div>
            ))
          }
        </div>
      )}
    </section>
  )
}
