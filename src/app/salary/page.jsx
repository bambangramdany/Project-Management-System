'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const fmtK = (n) => {
  const v = Math.round(n || 0)
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace('.0', '')} jt`
  if (Math.abs(v) >= 1_000) return `Rp ${(v / 1_000).toFixed(0)} rb`
  return fmt(v)
}

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const DIV_COLOR = {
  EVENT: { bg: 'bg-blue-50', border: 'border-blue-400', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  CREATIVE: { bg: 'bg-violet-50', border: 'border-violet-400', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  PH: { bg: 'bg-amber-50', border: 'border-amber-400', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  FINANCE_HRGA: { bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
}

const SCORE_LABEL = (s) => {
  if (s === null) return { text: '—', color: 'text-gray-400' }
  if (s >= 4.5) return { text: `⭐ ${s}`, color: 'text-emerald-600 font-semibold' }
  if (s >= 3.5) return { text: `✓ ${s}`, color: 'text-green-600' }
  if (s >= 2.5) return { text: `~ ${s}`, color: 'text-yellow-600' }
  return { text: `▼ ${s}`, color: 'text-red-500 font-semibold' }
}

// Aset vs Beban: bandingkan THP dengan kontribusi (score-based)
const ASSET_LABEL = (row) => {
  if (row.avgScore === null || row.thp === null) return null
  if (row.avgScore >= 4.0) return { text: 'Aset', color: 'text-emerald-600 font-bold', bg: 'bg-emerald-50' }
  if (row.avgScore >= 3.0) return { text: 'Produktif', color: 'text-green-600', bg: 'bg-green-50' }
  if (row.avgScore >= 2.0) return { text: 'Perlu Review', color: 'text-yellow-700 font-semibold', bg: 'bg-yellow-50' }
  return { text: 'Evaluasi', color: 'text-red-600 font-bold', bg: 'bg-red-50' }
}

// Komponen numerik — input rupiah dengan titik ribuan
function RupiahInput({ value, onChange, disabled, className = '' }) {
  const [raw, setRaw] = useState(String(value || ''))
  useEffect(() => { setRaw(String(value || '')) }, [value])
  const display = raw === '' ? '' : Number(raw).toLocaleString('id-ID')
  return (
    <input
      type="text"
      inputMode="numeric"
      disabled={disabled}
      value={display}
      onChange={e => {
        const digits = e.target.value.replace(/\D/g, '')
        setRaw(digits)
        onChange(digits === '' ? 0 : Number(digits))
      }}
      className={`input text-right text-xs py-1 px-2 ${className}`}
    />
  )
}

// ── Row editor inline ─────────────────────────────────────────────────────────
function SalaryRow({ row, period, onSaved, divColor }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const openEdit = () => {
    setForm({ ...row })
    setEditing(true)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const calcTHP = (f) => {
    const inc = (f.gajiPokok||0)+(f.tunjanganJabatan||0)+(f.tunjanganKinerja||0)+(f.tunjanganTransport||0)+(f.tunjanganProject||0)+(f.bonusProject||0)+(f.thrBonus||0)
    const ded = (f.bpjsTk||0)+(f.bpjsKes||0)+(f.bpjsKesKeluarga||0)+(f.pph21||0)+(f.kasbon||0)+(f.absen||0)
    return inc - ded
  }

  const save = async () => {
    setSaving(true)
    const payload = { userId: row.userId, period, ...form }
    let res
    if (row.recordId) {
      res = await fetch(`/api/salary/${row.recordId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      res = await fetch('/api/salary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false)
    if (res.ok) { setEditing(false); onSaved() }
    else alert('Gagal menyimpan')
  }

  const thp = row.thp
  const assetInfo = ASSET_LABEL(row)
  const scoreInfo = SCORE_LABEL(row.avgScore)

  if (editing) {
    const previewTHP = calcTHP(form)
    return (
      <tr className="bg-brand-50 border-b border-brand-100">
        <td colSpan={20} className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">Edit Gaji — {row.name}</p>
              <p className="text-sm font-bold text-brand-700">THP Preview: {fmt(previewTHP)}</p>
            </div>

            {/* Info dasar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">ID Karyawan</label>
                <input className="input text-sm" value={form.employeeId || ''} onChange={e => set('employeeId', e.target.value)} placeholder="001" />
              </div>
              <div>
                <label className="label">Gaji Pokok</label>
                <RupiahInput value={form.gajiPokok} onChange={v => set('gajiPokok', v)} />
              </div>
              <div>
                <label className="label">Bank</label>
                <select className="select text-sm" value={form.bank || ''} onChange={e => set('bank', e.target.value)}>
                  <option value="">— Pilih —</option>
                  {['BCA','BRI','BNI','Mandiri','BSI','CIMB','Permata','Lainnya'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">No. Rekening</label>
                <input className="input text-sm" value={form.nomorRekening || ''} onChange={e => set('nomorRekening', e.target.value)} placeholder="0123456789" />
              </div>
            </div>

            {/* Tunjangan */}
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-2">+ Tunjangan & Bonus</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  ['tunjanganJabatan','Tj. Jabatan'],
                  ['tunjanganKinerja','Tj. Kinerja'],
                  ['tunjanganTransport','Tj. Transport'],
                  ['tunjanganProject','Tj. Project'],
                  ['bonusProject','Bonus Project'],
                  ['thrBonus','THR / Bonus'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="label">{label}</label>
                    <RupiahInput value={form[k]} onChange={v => set(k, v)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Potongan */}
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2">− Potongan</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  ['bpjsTk','BPJS TK'],
                  ['bpjsKes','BPJS Kes.'],
                  ['bpjsKesKeluarga','BPJS Kes. Kel.'],
                  ['pph21','PPh 21'],
                  ['kasbon','Kasbon'],
                  ['absen','Potongan Absen'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="label">{label}</label>
                    <RupiahInput value={form[k]} onChange={v => set(k, v)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Catatan</label>
              <input className="input text-sm" value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="opsional" />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:underline">Batal</button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 text-xs">
      <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
        <div>{row.name}</div>
        {row.jobTitle && <div className="text-[10px] text-gray-400">{row.jobTitle}</div>}
        {row.employeeId && <div className="text-[10px] text-gray-400">{row.employeeId}</div>}
      </td>
      <td className="px-2 py-2.5 text-gray-500 whitespace-nowrap">{fmt(row.gajiPokok) || '—'}</td>
      <td className="px-2 py-2.5 text-gray-500 text-right">{row.tunjanganJabatan ? fmt(row.tunjanganJabatan) : '—'}</td>
      <td className="px-2 py-2.5 text-gray-500 text-right">{row.tunjanganKinerja ? fmt(row.tunjanganKinerja) : '—'}</td>
      <td className="px-2 py-2.5 text-gray-500 text-right">{row.tunjanganTransport ? fmt(row.tunjanganTransport) : '—'}</td>
      <td className="px-2 py-2.5 text-gray-500 text-right">{row.tunjanganProject ? fmt(row.tunjanganProject) : '—'}</td>
      <td className="px-2 py-2.5 font-medium text-emerald-700 text-right">{row.bonusProject ? fmt(row.bonusProject) : '—'}</td>
      <td className="px-2 py-2.5 text-blue-600 text-right">{row.thrBonus ? fmt(row.thrBonus) : '—'}</td>
      <td className="px-2 py-2.5 text-red-500 text-right">{(row.bpjsTk + row.bpjsKes + row.bpjsKesKeluarga + row.pph21 + row.kasbon + row.absen) > 0 ? fmt(row.bpjsTk + row.bpjsKes + row.bpjsKesKeluarga + row.pph21 + row.kasbon + row.absen) : '—'}</td>
      <td className="px-2 py-2.5 font-bold text-gray-900 whitespace-nowrap text-right">
        {thp !== null ? fmt(thp) : <span className="text-gray-300 font-normal">Belum diisi</span>}
      </td>
      {/* Score */}
      <td className={`px-2 py-2.5 text-center ${scoreInfo.color}`}>{scoreInfo.text}</td>
      {/* Aset vs Beban */}
      <td className="px-2 py-2.5 text-center">
        {assetInfo ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${assetInfo.bg} ${assetInfo.color}`}>{assetInfo.text}</span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      {/* Rekening */}
      <td className="px-2 py-2.5 text-gray-400 whitespace-nowrap">
        {row.bank && row.nomorRekening ? `${row.bank} · ${row.nomorRekening}` : '—'}
      </td>
      <td className="px-3 py-2.5 text-right">
        <button onClick={openEdit} className="text-brand-600 hover:underline text-xs">Edit</button>
      </td>
    </tr>
  )
}

// ── Division Group ────────────────────────────────────────────────────────────
function DivisionGroup({ group, period, onSaved }) {
  const [open, setOpen] = useState(true)
  const color = DIV_COLOR[group.divisi] || DIV_COLOR.FINANCE_HRGA
  const totalTHP = group.rows.reduce((s, r) => s + (r.thp || 0), 0)
  const totalBonus = group.rows.reduce((s, r) => s + r.bonusProject, 0)
  const filled = group.rows.filter(r => r.thp !== null).length

  return (
    <div className={`card border-t-4 ${color.border} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 ${color.bg} hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${color.dot}`} />
          <span className="font-bold text-gray-800">{group.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${color.badge}`}>{group.rows.length} orang</span>
          {filled < group.rows.length && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">{filled}/{group.rows.length} diisi</span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-500">Total THP</div>
            <div className="font-bold text-gray-900">{fmtK(totalTHP)}</div>
          </div>
          {totalBonus > 0 && (
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500">Bonus Project</div>
              <div className="font-semibold text-emerald-600">{fmtK(totalBonus)}</div>
            </div>
          )}
          <span className="text-gray-400 text-lg">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-2">Nama</th>
                <th className="px-2 py-2">Gaji Pokok</th>
                <th className="px-2 py-2 text-right">Tj. Jabatan</th>
                <th className="px-2 py-2 text-right">Tj. Kinerja</th>
                <th className="px-2 py-2 text-right">Tj. Transport</th>
                <th className="px-2 py-2 text-right">Tj. Project</th>
                <th className="px-2 py-2 text-right text-emerald-700">Bonus Project</th>
                <th className="px-2 py-2 text-right text-blue-600">THR/Bonus</th>
                <th className="px-2 py-2 text-right text-red-500">Potongan</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">THP</th>
                <th className="px-2 py-2 text-center">Score (3bln)</th>
                <th className="px-2 py-2 text-center">Status</th>
                <th className="px-2 py-2">Rekening</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map(row => (
                <SalaryRow key={row.userId} row={row} period={period} onSaved={onSaved} divColor={color} />
              ))}
              {/* Subtotal row */}
              <tr className={`${color.bg} border-t-2 ${color.border} text-xs font-semibold`}>
                <td className="px-3 py-2 text-gray-600">SUBTOTAL {group.label.toUpperCase()}</td>
                <td className="px-2 py-2 text-right text-gray-600">{fmt(group.rows.reduce((s,r) => s+r.gajiPokok,0))}</td>
                <td className="px-2 py-2 text-right text-gray-500">{fmt(group.rows.reduce((s,r) => s+r.tunjanganJabatan,0))}</td>
                <td className="px-2 py-2 text-right text-gray-500">{fmt(group.rows.reduce((s,r) => s+r.tunjanganKinerja,0))}</td>
                <td className="px-2 py-2 text-right text-gray-500">{fmt(group.rows.reduce((s,r) => s+r.tunjanganTransport,0))}</td>
                <td className="px-2 py-2 text-right text-gray-500">{fmt(group.rows.reduce((s,r) => s+r.tunjanganProject,0))}</td>
                <td className="px-2 py-2 text-right text-emerald-700">{fmt(group.rows.reduce((s,r) => s+r.bonusProject,0))}</td>
                <td className="px-2 py-2 text-right text-blue-600">{fmt(group.rows.reduce((s,r) => s+r.thrBonus,0))}</td>
                <td className="px-2 py-2 text-right text-red-500">{fmt(group.rows.reduce((s,r) => s+(r.bpjsTk+r.bpjsKes+r.bpjsKesKeluarga+r.pph21+r.kasbon+r.absen),0))}</td>
                <td className="px-2 py-2 text-right text-gray-900">{fmt(totalTHP)}</td>
                <td colSpan={4} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Bonus Project Panel ───────────────────────────────────────────────────────
function BonusProjectPanel({ period, groups }) {
  const [projects, setProjects] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch(`/api/salary/invoiced-projects?period=${period}`)
      .then(r => r.ok ? r.json() : [])
      .then(setProjects)
  }, [open, period])

  // Flatten: siapa dapat bonus dari project mana
  const allPeople = groups.flatMap(g => g.rows).reduce((map, r) => {
    map[r.userId] = r.name; return map
  }, {})

  return (
    <div className="card border-t-4 border-emerald-400">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 bg-emerald-50 hover:bg-emerald-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div className="text-left">
            <div className="font-bold text-gray-800">Panduan Bonus Project</div>
            <div className="text-xs text-gray-500">Project yang sudah INVOICING bulan ini — dasar pemberian bonus</div>
          </div>
        </div>
        <span className="text-gray-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-5">
          {projects === null ? (
            <p className="text-sm text-gray-400">Memuat...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-400">Tidak ada project berstatus INVOICING bulan ini.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Project di bawah ini sudah mencapai tahap <strong>INVOICING</strong> pada {MONTHS[Number(period.split('-')[1]) - 1]} {period.split('-')[0]}.
                Invoice sudah dikirim ke klien → tim yang terlibat berhak mendapat bonus project.
                Masukkan nominal bonus di kolom <em>Bonus Project</em> pada tabel masing-masing orang di atas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map(p => (
                  <div key={p.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-500">{p.code}</span>
                      <span className="text-sm font-semibold text-gray-800 line-clamp-1">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-auto shrink-0">{p.clientName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.people.map(person => (
                        <span key={person.id} className="text-xs px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-gray-700">
                          {person.name}
                        </span>
                      ))}
                      {p.people.length === 0 && <span className="text-xs text-gray-400">Belum ada anggota tim</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SalaryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState(currentPeriod)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [py, pm] = period.split('-').map(Number)
  const nowY = new Date().getFullYear()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !['OWNER', 'DIRECTOR'].includes(session.user.role)) router.push('/dashboard')
  }, [status, session, router])

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/salary?period=${period}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
  }, [period])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  const changePeriod = (dir) => {
    let y = py, m = pm + dir
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setPeriod(`${y}-${String(m).padStart(2, '0')}`)
  }

  if (status === 'loading' || !session || !['OWNER', 'DIRECTOR'].includes(session?.user?.role)) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const summary = data?.summary
  const groups = data?.groups || []

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Penggajian & Bonus Tim</h1>
            <p className="text-sm text-gray-500 mt-0.5">Slip gaji bulanan, tunjangan, bonus project, dan analisis kontribusi tim</p>
          </div>
          {/* Period selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <button onClick={() => changePeriod(-1)} className="text-gray-400 hover:text-gray-700 px-1">◀</button>
            <div className="flex items-center gap-1">
              <select
                className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer"
                value={pm}
                onChange={e => setPeriod(`${py}-${String(Number(e.target.value)).padStart(2,'0')}`)}
              >
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select
                className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer"
                value={py}
                onChange={e => setPeriod(`${e.target.value}-${String(pm).padStart(2,'0')}`)}
              >
                {[nowY-2, nowY-1, nowY, nowY+1].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={() => changePeriod(1)} className="text-gray-400 hover:text-gray-700 px-1">▶</button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total THP', value: fmtK(summary.totalTHP), sub: `${summary.recordCount} karyawan diisi`, color: 'border-brand-400 text-brand-700' },
              { label: 'Gaji Pokok', value: fmtK(summary.totalGajiPokok), sub: 'sebelum tunjangan', color: 'border-gray-300 text-gray-700' },
              { label: 'Total Tunjangan', value: fmtK(summary.totalTunjangan), sub: 'jabatan + kinerja + dll', color: 'border-emerald-400 text-emerald-700' },
              { label: 'Total Potongan', value: fmtK(summary.totalPotongan), sub: 'BPJS + pajak + lainnya', color: 'border-red-300 text-red-600' },
              { label: 'Bonus Project', value: fmtK(summary.totalBonusProject), sub: 'invoice bulan ini', color: 'border-blue-400 text-blue-700' },
            ].map(c => (
              <div key={c.label} className={`card p-4 border-t-4 ${c.color.split(' ')[0]}`}>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.color.split(' ')[1]}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Bonus Project Panel */}
        {!loading && <BonusProjectPanel period={period} groups={groups} />}

        {/* Division Groups */}
        {!loading && groups.map(g => (
          <DivisionGroup key={g.divisi} group={g} period={period} onSaved={load} />
        ))}

        {!loading && groups.length === 0 && (
          <div className="text-center py-16 text-gray-400">Tidak ada data karyawan aktif.</div>
        )}

        {/* Legend */}
        {!loading && (
          <div className="card p-4 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Keterangan Status Kontribusi (berdasarkan rata-rata score 3 bulan terakhir)</p>
            <div className="flex flex-wrap gap-4">
              <span><span className="text-emerald-600 font-bold">⭐ Aset</span> — Score ≥ 4.0: kontributor utama, pertahankan</span>
              <span><span className="text-green-600">✓ Produktif</span> — Score 3.0–3.9: karyawan baik</span>
              <span><span className="text-yellow-700 font-semibold">~ Perlu Review</span> — Score 2.0–2.9: perlu pembinaan</span>
              <span><span className="text-red-600 font-bold">▼ Evaluasi</span> — Score &lt; 2.0: evaluasi menyeluruh</span>
              <span><span className="text-gray-400">—</span> Belum ada penilaian</span>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
