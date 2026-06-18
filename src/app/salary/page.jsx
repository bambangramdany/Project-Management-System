'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const fmtK = (n) => {
  const v = Math.round(n || 0)
  if (Math.abs(v) >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (Math.abs(v) >= 1_000) return `Rp ${(v / 1_000).toFixed(0)} rb`
  return fmt(v)
}

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const DIV_COLOR = {
  EVENT:        { badge: 'bg-blue-100 text-blue-700',    row: 'bg-blue-50/60',    header: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500' },
  CREATIVE:     { badge: 'bg-violet-100 text-violet-700',row: 'bg-violet-50/60',  header: 'bg-violet-100 text-violet-800',dot: 'bg-violet-500' },
  PH:           { badge: 'bg-amber-100 text-amber-700',  row: 'bg-amber-50/60',   header: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  FINANCE_HRGA: { badge: 'bg-emerald-100 text-emerald-700',row: 'bg-emerald-50/60',header: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-500' },
}
const DIV_LABEL = {
  EVENT: 'Event Organizer (EO)', CREATIVE: 'Creative',
  PH: 'Production House (PH)', FINANCE_HRGA: 'Finance / HR & GA',
}

const SCORE_LABEL = (s) => {
  if (s === null) return { text: '—', cls: 'text-gray-300' }
  if (s >= 4.5) return { text: `⭐ ${s}`, cls: 'text-emerald-600 font-bold' }
  if (s >= 3.5) return { text: `✓ ${s}`, cls: 'text-green-600 font-medium' }
  if (s >= 2.5) return { text: `~ ${s}`, cls: 'text-yellow-600' }
  return { text: `▼ ${s}`, cls: 'text-red-500 font-bold' }
}

const ASSET_INFO = (row) => {
  if (row.avgScore === null || row.thp === null) return null
  if (row.avgScore >= 4.0) return { text: 'Aset', cls: 'bg-emerald-100 text-emerald-700 font-bold' }
  if (row.avgScore >= 3.0) return { text: 'Produktif', cls: 'bg-green-100 text-green-700' }
  if (row.avgScore >= 2.0) return { text: 'Perlu Review', cls: 'bg-yellow-100 text-yellow-700 font-semibold' }
  return { text: 'Evaluasi', cls: 'bg-red-100 text-red-700 font-bold' }
}

// Input rupiah dengan format titik ribuan
function RupiahInput({ value, onChange, disabled }) {
  const [raw, setRaw] = useState(String(value || ''))
  useEffect(() => { setRaw(String(value || '')) }, [value])
  const display = raw === '' ? '' : Number(raw).toLocaleString('id-ID')
  return (
    <input type="text" inputMode="numeric" disabled={disabled}
      value={display}
      onChange={e => { const d = e.target.value.replace(/\D/g,''); setRaw(d); onChange(d === '' ? 0 : Number(d)) }}
      className="input text-right text-xs py-1 px-2 w-full"
    />
  )
}

// ── Inline editor (expand di dalam tabel) ───────────────────────────────────
function EditPanel({ row, period, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...row })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const calcTHP = (f) => {
    const inc = (f.gajiPokok||0)+(f.tunjanganJabatan||0)+(f.tunjanganKinerja||0)+(f.tunjanganTransport||0)+(f.tunjanganProject||0)+(f.bonusProject||0)+(f.thrBonus||0)
    const ded = (f.bpjsTk||0)+(f.bpjsKes||0)+(f.bpjsKesKeluarga||0)+(f.pph21||0)+(f.kasbon||0)+(f.absen||0)
    return inc - ded
  }

  const save = async () => {
    setSaving(true)
    const payload = { userId: row.userId, period, ...form }
    const res = row.recordId
      ? await fetch(`/api/salary/${row.recordId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) })
      : await fetch('/api/salary', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { onSaved() } else alert('Gagal menyimpan')
  }

  const previewTHP = calcTHP(form)

  return (
    <tr className="bg-brand-50 border-y-2 border-brand-200">
      <td colSpan={15} className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-bold text-gray-800">✏️ Edit Gaji — {row.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">THP Preview:</span>
              <span className={`text-base font-bold ${previewTHP >= 0 ? 'text-brand-700' : 'text-red-600'}`}>{fmt(previewTHP)}</span>
            </div>
          </div>

          {/* Baris 1: info dasar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="label">ID Karyawan</label>
              <input className="input text-sm" value={form.employeeId||''} onChange={e=>set('employeeId',e.target.value)} placeholder="001" /></div>
            <div><label className="label">Gaji Pokok</label><RupiahInput value={form.gajiPokok} onChange={v=>set('gajiPokok',v)} /></div>
            <div><label className="label">Bank</label>
              <select className="select text-sm" value={form.bank||''} onChange={e=>set('bank',e.target.value)}>
                <option value="">— Pilih —</option>
                {['BCA','BRI','BNI','Mandiri','BSI','CIMB','Permata','Lainnya'].map(b=><option key={b}>{b}</option>)}
              </select></div>
            <div><label className="label">No. Rekening</label>
              <input className="input text-sm" value={form.nomorRekening||''} onChange={e=>set('nomorRekening',e.target.value)} placeholder="0123456789" /></div>
          </div>

          {/* Tunjangan */}
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">＋ Tunjangan &amp; Bonus</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[['tunjanganJabatan','Tj. Jabatan'],['tunjanganKinerja','Tj. Kinerja'],['tunjanganTransport','Tj. Transport'],
                ['tunjanganProject','Tj. Project'],['bonusProject','Bonus Project'],['thrBonus','THR / Bonus']].map(([k,lbl])=>(
                <div key={k}><label className="label">{lbl}</label><RupiahInput value={form[k]} onChange={v=>set(k,v)} /></div>
              ))}
            </div>
          </div>

          {/* Potongan */}
          <div>
            <p className="text-xs font-semibold text-red-600 mb-2">－ Potongan</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[['bpjsTk','BPJS TK'],['bpjsKes','BPJS Kes.'],['bpjsKesKeluarga','BPJS Kes. Kel.'],
                ['pph21','PPh 21'],['kasbon','Kasbon'],['absen','Potongan Absen']].map(([k,lbl])=>(
                <div key={k}><label className="label">{lbl}</label><RupiahInput value={form[k]} onChange={v=>set(k,v)} /></div>
              ))}
            </div>
          </div>

          <div><label className="label">Catatan</label>
            <input className="input text-sm" value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="opsional" /></div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving?'Menyimpan...':'Simpan'}</button>
            <button onClick={onCancel} className="text-sm text-gray-400 hover:underline">Batal</button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Bonus Project Panel ──────────────────────────────────────────────────────
function BonusProjectPanel({ period }) {
  const [projects, setProjects] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch(`/api/salary/invoiced-projects?period=${period}`)
      .then(r=>r.ok?r.json():[]).then(setProjects)
  }, [open, period])

  return (
    <div className="card border-t-4 border-emerald-400">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-5 py-4 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-t-xl">
        <div className="flex items-center gap-3">
          <span className="text-xl">💰</span>
          <div className="text-left">
            <div className="font-bold text-gray-800">Panduan Bonus Project</div>
            <div className="text-xs text-gray-500">Project INVOICING bulan ini — dasar pemberian bonus project ke tim</div>
          </div>
        </div>
        <span className="text-gray-400 text-lg">{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div className="p-5">
          {projects===null ? <p className="text-sm text-gray-400">Memuat...</p>
          : projects.length===0 ? <p className="text-sm text-gray-400">Tidak ada project berstatus INVOICING bulan ini.</p>
          : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Project di bawah sudah masuk tahap <strong>INVOICING</strong> — invoice sudah dikirim ke klien.
                Tim yang terlibat berhak mendapat bonus project. Masukkan nominal di kolom <em>Bonus Project</em> pada tabel di atas.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map(p=>(
                  <div key={p.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-gray-500">{p.code}</span>
                      <span className="text-sm font-semibold text-gray-800 line-clamp-1 flex-1">{p.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{p.clientName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.people.map(person=>(
                        <span key={person.id} className="text-xs px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-gray-700">{person.name}</span>
                      ))}
                      {p.people.length===0 && <span className="text-xs text-gray-400">Belum ada anggota tim</span>}
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SalaryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState(currentPeriod)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingUserId, setEditingUserId] = useState(null)

  const [py, pm] = period.split('-').map(Number)
  const nowY = new Date().getFullYear()

  useEffect(() => {
    if (status==='unauthenticated') router.push('/login')
    if (status==='authenticated' && !['OWNER','DIRECTOR','FINANCE'].includes(session.user.role)) router.push('/dashboard')
  }, [status, session, router])

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/salary?period=${period}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setData(d); setLoading(false) })
  }, [period])

  useEffect(()=>{ if(status==='authenticated') load() }, [status, load])

  const changePeriod = (dir) => {
    let y=py, m=pm+dir
    if(m>12){m=1;y++} if(m<1){m=12;y--}
    setPeriod(`${y}-${String(m).padStart(2,'0')}`)
  }


  const summary = data?.summary
  const groups = data?.groups || []
  // Flatten semua baris dari semua divisi, dengan info divisi
  const allRows = groups.flatMap(g => g.rows.map(r => ({ ...r, divisiLabel: g.label })))

  // Hitung subtotal per divisi untuk tampilan
  const divSubtotals = Object.fromEntries(groups.map(g => [g.divisi, {
    thp: g.rows.reduce((s,r)=>s+(r.thp||0),0),
    gajiPokok: g.rows.reduce((s,r)=>s+r.gajiPokok,0),
    tunjanganJabatan: g.rows.reduce((s,r)=>s+r.tunjanganJabatan,0),
    tunjanganKinerja: g.rows.reduce((s,r)=>s+r.tunjanganKinerja,0),
    tunjanganTransport: g.rows.reduce((s,r)=>s+r.tunjanganTransport,0),
    tunjanganProject: g.rows.reduce((s,r)=>s+r.tunjanganProject,0),
    bonusProject: g.rows.reduce((s,r)=>s+r.bonusProject,0),
    thrBonus: g.rows.reduce((s,r)=>s+r.thrBonus,0),
    potongan: g.rows.reduce((s,r)=>s+(r.bpjsTk+r.bpjsKes+r.bpjsKesKeluarga+r.pph21+r.kasbon+r.absen),0),
    count: g.rows.length,
    filled: g.rows.filter(r=>r.thp!==null).length,
  }]))

  if (status==='loading' || !session || !['OWNER','DIRECTOR','FINANCE'].includes(session?.user?.role)) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canEditSalary = ['OWNER', 'DIRECTOR'].includes(session?.user?.role)

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Penggajian &amp; Bonus Tim</h1>
            <p className="text-sm text-gray-500 mt-0.5">Slip gaji bulanan · tunjangan · bonus project · analisis kontribusi tim</p>
          </div>
          {/* Period selector */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <button onClick={()=>changePeriod(-1)} className="text-gray-400 hover:text-gray-700 w-6 text-center">◀</button>
            <select className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer"
              value={pm} onChange={e=>setPeriod(`${py}-${String(Number(e.target.value)).padStart(2,'0')}`)}>
              {MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
            </select>
            <select className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none cursor-pointer"
              value={py} onChange={e=>setPeriod(`${e.target.value}-${String(pm).padStart(2,'0')}`)}>
              {[nowY-2,nowY-1,nowY,nowY+1].map(y=><option key={y}>{y}</option>)}
            </select>
            <button onClick={()=>changePeriod(1)} className="text-gray-400 hover:text-gray-700 w-6 text-center">▶</button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total THP', value: fmtK(summary.totalTHP), sub: `${summary.recordCount} karyawan`, border: 'border-brand-400', color: 'text-brand-700', span: 'col-span-2 sm:col-span-1' },
              { label: 'Gaji Pokok', value: fmtK(summary.totalGajiPokok), sub: 'sebelum tunjangan', border: 'border-gray-300', color: 'text-gray-700' },
              { label: 'Total Tunjangan', value: fmtK(summary.totalTunjangan), sub: 'jabatan + kinerja', border: 'border-emerald-400', color: 'text-emerald-700' },
              { label: 'Bonus Project', value: fmtK(summary.totalBonusProject), sub: 'invoice bulan ini', border: 'border-blue-400', color: 'text-blue-700' },
              { label: 'Total Potongan', value: fmtK(summary.totalPotongan), sub: 'BPJS + pajak', border: 'border-red-300', color: 'text-red-600' },
              { label: 'Diisi', value: `${summary.recordCount}/${allRows.length}`, sub: 'karyawan diinput', border: 'border-gray-200', color: 'text-gray-600' },
            ].map(c=>(
              <div key={c.label} className={`card p-3 sm:p-4 border-t-4 ${c.border} ${c.span || ''}`}>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{c.label}</p>
                <p className={`text-base sm:text-lg font-bold mt-0.5 ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{c.sub}</p>
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
        {!loading && <BonusProjectPanel period={period} />}

        {/* ── TABEL KONSOLIDASI BESAR ── */}
        {!loading && allRows.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Rekapitulasi Gaji — {MONTHS[pm-1]} {py}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Seluruh karyawan aktif · klik Edit untuk mengisi atau mengubah komponen gaji</p>
              </div>
              <span className="text-xs text-gray-400">{allRows.length} karyawan</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1200px]">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2.5 w-6">#</th>
                    <th className="px-3 py-2.5">Nama</th>
                    <th className="px-2 py-2.5">Divisi</th>
                    <th className="px-2 py-2.5 text-right">Gaji Pokok</th>
                    <th className="px-2 py-2.5 text-right">Tj. Jabatan</th>
                    <th className="px-2 py-2.5 text-right">Tj. Kinerja</th>
                    <th className="px-2 py-2.5 text-right">Tj. Transport</th>
                    <th className="px-2 py-2.5 text-right">Tj. Project</th>
                    <th className="px-2 py-2.5 text-right text-emerald-700 font-semibold">Bonus Project</th>
                    <th className="px-2 py-2.5 text-right text-blue-600">THR/Bonus</th>
                    <th className="px-2 py-2.5 text-right text-red-500">Potongan</th>
                    <th className="px-2 py-2.5 text-right font-bold text-gray-700 bg-gray-100">THP</th>
                    <th className="px-2 py-2.5 text-center">Score</th>
                    <th className="px-2 py-2.5 text-center">Kontribusi</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rows = []
                    let no = 1
                    let prevDiv = null

                    allRows.forEach((row, idx) => {
                      const color = DIV_COLOR[row.divisi] || DIV_COLOR.FINANCE_HRGA
                      const sub = divSubtotals[row.divisi]
                      const totalPotongan = row.bpjsTk+row.bpjsKes+row.bpjsKesKeluarga+row.pph21+row.kasbon+row.absen
                      const scoreInfo = SCORE_LABEL(row.avgScore)
                      const assetInfo = ASSET_INFO(row)
                      const isEditing = editingUserId === row.userId

                      // Header divisi
                      if (row.divisi !== prevDiv) {
                        prevDiv = row.divisi
                        rows.push(
                          <tr key={`div-${row.divisi}`} className={color.header}>
                            <td colSpan={15} className="px-3 py-2 font-bold text-xs tracking-wide">
                              <span className={`inline-flex items-center gap-2`}>
                                <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                                {DIV_LABEL[row.divisi]}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${color.badge}`}>{sub.count} orang · {sub.filled}/{sub.count} diisi</span>
                              </span>
                            </td>
                          </tr>
                        )
                      }

                      // Data row
                      rows.push(
                        <tr key={row.userId} className={`border-b border-gray-100 hover:bg-gray-50 ${isEditing ? 'bg-brand-50/30' : ''}`}>
                          <td className="px-3 py-2.5 text-gray-400">{no++}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                            {row.name}
                            {row.jobTitle && <span className="ml-1 text-[10px] text-gray-400">({row.jobTitle})</span>}
                            {row.employeeId && <span className="ml-1 text-[10px] text-gray-300">#{row.employeeId}</span>}
                          </td>
                          <td className="px-2 py-2.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${color.badge}`}>{row.divisi==='FINANCE_HRGA'?'Finance+GA':row.divisi}</span>
                          </td>
                          <td className="px-2 py-2.5 text-right text-gray-600">{row.gajiPokok ? fmt(row.gajiPokok) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right text-gray-500">{row.tunjanganJabatan ? fmt(row.tunjanganJabatan) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right text-gray-500">{row.tunjanganKinerja ? fmt(row.tunjanganKinerja) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right text-gray-500">{row.tunjanganTransport ? fmt(row.tunjanganTransport) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right text-gray-500">{row.tunjanganProject ? fmt(row.tunjanganProject) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right font-semibold text-emerald-700">{row.bonusProject ? fmt(row.bonusProject) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right text-blue-600">{row.thrBonus ? fmt(row.thrBonus) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right text-red-500">{totalPotongan ? fmt(totalPotongan) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-2.5 text-right font-bold bg-gray-50 text-gray-900 whitespace-nowrap">
                            {row.thp !== null ? fmt(row.thp) : <span className="text-gray-300 font-normal text-[10px]">Belum diisi</span>}
                          </td>
                          <td className={`px-2 py-2.5 text-center ${scoreInfo.cls}`}>{scoreInfo.text}</td>
                          <td className="px-2 py-2.5 text-center">
                            {assetInfo
                              ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${assetInfo.cls}`}>{assetInfo.text}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            {canEditSalary && (
                              <button
                                onClick={() => setEditingUserId(isEditing ? null : row.userId)}
                                className={`text-xs hover:underline ${isEditing ? 'text-gray-400' : 'text-brand-600'}`}
                              >{isEditing ? 'Tutup' : 'Edit'}</button>
                            )}
                          </td>
                        </tr>
                      )

                      // Edit panel (hanya OWNER/DIRECTOR)
                      if (isEditing && canEditSalary) {
                        rows.push(
                          <EditPanel key={`edit-${row.userId}`} row={row} period={period}
                            onSaved={() => { setEditingUserId(null); load() }}
                            onCancel={() => setEditingUserId(null)} />
                        )
                      }

                      // Subtotal divisi — setelah baris terakhir divisi ini
                      const nextRow = allRows[idx + 1]
                      if (!nextRow || nextRow.divisi !== row.divisi) {
                        rows.push(
                          <tr key={`sub-${row.divisi}`} className={`${color.header} border-b-2 text-xs font-bold`}>
                            <td colSpan={3} className="px-3 py-2 text-gray-600">Subtotal {DIV_LABEL[row.divisi]}</td>
                            <td className="px-2 py-2 text-right">{fmt(sub.gajiPokok)}</td>
                            <td className="px-2 py-2 text-right">{fmt(sub.tunjanganJabatan)}</td>
                            <td className="px-2 py-2 text-right">{fmt(sub.tunjanganKinerja)}</td>
                            <td className="px-2 py-2 text-right">{fmt(sub.tunjanganTransport)}</td>
                            <td className="px-2 py-2 text-right">{fmt(sub.tunjanganProject)}</td>
                            <td className="px-2 py-2 text-right text-emerald-700">{fmt(sub.bonusProject)}</td>
                            <td className="px-2 py-2 text-right text-blue-700">{fmt(sub.thrBonus)}</td>
                            <td className="px-2 py-2 text-right text-red-600">{fmt(sub.potongan)}</td>
                            <td className="px-2 py-2 text-right bg-gray-200 text-gray-900">{fmt(sub.thp)}</td>
                            <td colSpan={3} />
                          </tr>
                        )
                      }
                    })

                    return rows
                  })()}

                  {/* GRAND TOTAL */}
                  {summary && (
                    <tr className="bg-brand-900 text-white text-xs font-bold border-t-4 border-brand-600">
                      <td colSpan={3} className="px-4 py-3 text-brand-200 uppercase tracking-wider">
                        TOTAL BEBAN PERUSAHAAN — {MONTHS[pm-1].toUpperCase()} {py}
                      </td>
                      <td className="px-2 py-3 text-right">{fmt(summary.totalGajiPokok)}</td>
                      <td className="px-2 py-3 text-right opacity-75">
                        {fmt(groups.flatMap(g=>g.rows).reduce((s,r)=>s+r.tunjanganJabatan,0))}
                      </td>
                      <td className="px-2 py-3 text-right opacity-75">
                        {fmt(groups.flatMap(g=>g.rows).reduce((s,r)=>s+r.tunjanganKinerja,0))}
                      </td>
                      <td className="px-2 py-3 text-right opacity-75">
                        {fmt(groups.flatMap(g=>g.rows).reduce((s,r)=>s+r.tunjanganTransport,0))}
                      </td>
                      <td className="px-2 py-3 text-right opacity-75">
                        {fmt(groups.flatMap(g=>g.rows).reduce((s,r)=>s+r.tunjanganProject,0))}
                      </td>
                      <td className="px-2 py-3 text-right text-emerald-300">{fmt(summary.totalBonusProject)}</td>
                      <td className="px-2 py-3 text-right text-blue-200">
                        {fmt(groups.flatMap(g=>g.rows).reduce((s,r)=>s+r.thrBonus,0))}
                      </td>
                      <td className="px-2 py-3 text-right text-red-300">{fmt(summary.totalPotongan)}</td>
                      <td className="px-2 py-3 text-right text-xl text-white bg-brand-700 whitespace-nowrap">
                        {fmtK(summary.totalTHP)}
                      </td>
                      <td colSpan={3} className="px-2 py-3 text-center text-brand-300 text-[10px]">
                        → dicatat sebagai<br />"Beban Project Reguler"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        {!loading && (
          <div className="card p-4 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Keterangan Kolom Kontribusi (rata-rata score 3 bulan terakhir)</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span><span className="font-bold text-emerald-700">Aset</span> ≥ 4.0 — kontributor utama, pertahankan</span>
              <span><span className="font-medium text-green-700">Produktif</span> 3.0–3.9 — karyawan baik</span>
              <span><span className="font-semibold text-yellow-700">Perlu Review</span> 2.0–2.9 — butuh pembinaan</span>
              <span><span className="font-bold text-red-700">Evaluasi</span> &lt; 2.0 — pertimbangkan keputusan</span>
              <span className="text-gray-400">— = belum ada penilaian</span>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
