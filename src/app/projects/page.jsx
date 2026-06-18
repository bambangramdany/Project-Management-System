'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import clsx from 'clsx'
import { PitchResultBadge } from '@/components/StatusBadge'
import { STATUS_PIPELINE, STATUS_LABEL, STATUS_GROUP_COLOR, CATEGORY_LABEL, DIVISION_LABEL, EO_CATEGORIES, PH_CATEGORIES } from '@/lib/constants'
import { canViewAllProjects, canQuickEditProjects, canDeleteProject } from '@/lib/rbac'
import { HEALTH_LABEL, HEALTH_DOT } from '@/lib/health'
import Link from 'next/link'

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsContent />
    </Suspense>
  )
}

function ProjectsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)
  const [showEO, setShowEO] = useState(true)
  const [showPH, setShowPH] = useState(true)
  const [divisionInitialized, setDivisionInitialized] = useState(false)
  const [involvedOnly, setInvolvedOnly] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Default the division toggle to the logged-in user's own division
  useEffect(() => {
    if (status === 'authenticated' && !divisionInitialized) {
      if (session.user.divisi === 'PH') {
        setShowEO(false)
        setShowPH(true)
      } else {
        setShowEO(true)
        setShowPH(false)
      }
      setDivisionInitialized(true)
    }
  }, [status, session, divisionInitialized])

  const fetchProjects = useCallback(() => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (search) params.set('search', search)
    setLoading(true)
    fetch(`/api/projects?${params}&list=1`).then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [filterStatus, filterCategory, search])

  useEffect(() => { if (status === 'authenticated') fetchProjects() }, [status, fetchProjects])

  // Clear category filter if it no longer belongs to the visible division(s)
  useEffect(() => {
    if (!filterCategory) return
    if (showEO && !showPH && !EO_CATEGORIES.includes(filterCategory)) setFilterCategory('')
    if (showPH && !showEO && !PH_CATEGORIES.includes(filterCategory)) setFilterCategory('')
  }, [showEO, showPH, filterCategory])

  useEffect(() => {
    if (status === 'authenticated' && canQuickEditProjects(session?.user)) {
      fetch('/api/team').then(r => r.ok ? r.json() : []).then(data => setAllUsers(Array.isArray(data) ? data : []))
    }
  }, [status, session])

  const isManager = canViewAllProjects(session?.user.role)
  const canQuickEdit = canQuickEditProjects(session?.user)
  const canDelete = canDeleteProject(session?.user?.role)

  async function deleteProject(id) {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConfirmDeleteId(null)
      setProjects(prev => prev.filter(x => x.id !== id))
    } else {
      const err = await res.json().catch(() => ({}))
      setConfirmDeleteId(null)
      alert(err.error || 'Gagal menghapus project')
    }
  }

  const FINISHED_STATUSES = ['DONE', 'FAILED', 'CANCELED']
  const BRIEFING_ORDER = ['PITCHING', 'WAITING_PITCH_RESULT', 'PREPARATION', 'EVENT_DAY', 'REPORTING', 'INVOICING']
  function relevantDate(p) {
    switch (p.status) {
      case 'PITCHING':
      case 'WAITING_PITCH_RESULT':
        return p.submitDate || p.briefDate
      case 'PREPARATION':
      case 'EVENT_DAY':
        return p.startDate
      case 'REPORTING':
      case 'INVOICING':
        return p.endDate || p.startDate
      case 'HOLD':
        return p.briefDate || p.startDate
      default:
        return p.startDate || p.endDate || p.submitDate || p.briefDate
    }
  }

  const visibleProjects = projects.filter(p => {
    const isPh = p.division === 'PH'
    if (isPh && !showPH) return false
    if (!isPh && !showEO) return false
    if (involvedOnly) {
      const isInvolved = p.picId === session?.user.id || p.members?.some(m => m.user?.id === session?.user.id)
      if (!isInvolved) return false
    }
    if (filterMonth) {
      const d = relevantDate(p)
      if (!d) return false
      const ym = new Date(d).toISOString().slice(0, 7) // YYYY-MM
      if (ym !== filterMonth) return false
    }
    return true
  })

  visibleProjects.sort((a, b) => {
    const aFinished = FINISHED_STATUSES.includes(a.status)
    const bFinished = FINISHED_STATUSES.includes(b.status)
    if (aFinished !== bFinished) return aFinished ? 1 : -1
    if (aFinished && bFinished) return new Date(b.updatedAt) - new Date(a.updatedAt)
    const aStage = BRIEFING_ORDER.indexOf(a.status)
    const bStage = BRIEFING_ORDER.indexOf(b.status)
    const aStageIdx = aStage === -1 ? BRIEFING_ORDER.length : aStage
    const bStageIdx = bStage === -1 ? BRIEFING_ORDER.length : bStage
    if (aStageIdx !== bStageIdx) return aStageIdx - bStageIdx
    const aDate = relevantDate(a)
    const bDate = relevantDate(b)
    if (!aDate && !bDate) return 0
    if (!aDate) return 1
    if (!bDate) return -1
    return new Date(aDate) - new Date(bDate)
  })

  const downloadProjectTemplate = async () => {
    const XLSX = await import('xlsx')

    const headers = [
      'Kode', 'Nama Project', 'Client', 'Divisi', 'Kategori', 'PIC (email)',
      'Status', 'Hasil Pitch', 'Nilai Project', 'No. Quotation', 'No. Invoice',
      'Tanggal Brief', 'Tanggal Submit', 'Tanggal Mulai', 'Tanggal Selesai',
      'Alasan Menang/Kalah', 'Vendor Pemenang', 'Catatan',
    ]

    const exampleEvent = [
      'EVT-021', 'Annual Gathering PT Maju Jaya', 'PT Maju Jaya', 'EVENT', 'INCENTIVE_GATHERING',
      'wulan@watermark.co.id', 'DONE', 'WIN', 250000000, 'WTM/EVENT/QUOT/2026/021', 'WTM/EVENT/INV/2026/021/25',
      '2026-01-05', '2026-01-10', '2026-02-14', '2026-02-14', '', '', 'Contoh data project Event',
    ]
    const examplePh = [
      'PH-011', 'Company Profile Video PT Sejahtera', 'PT Sejahtera', 'PH', 'ACTIVATION',
      'bastya@watermark.co.id', 'DONE', 'WIN', 75000000, 'WTM/PH/QUOT/2026/011', 'WTM/PH/INV/2026/011/26',
      '2026-01-08', '2026-01-12', '2026-02-20', '2026-02-22', '', '', 'Contoh data project Production House',
    ]

    const sheetData = [headers, exampleEvent, examplePh]
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    ws['!cols'] = headers.map(() => ({ wch: 22 }))

    const guideRows = [
      ['Petunjuk Pengisian Template Project'],
      [''],
      ['Kolom', 'Keterangan'],
      ['Kode', 'Kode internal project (boleh dikosongkan, sistem akan membuat otomatis)'],
      ['Nama Project', 'Wajib diisi'],
      ['Client', 'Nama client/perusahaan'],
      ['Divisi', 'EVENT (untuk tim EO) atau PH (untuk Production House)'],
      ['Kategori', 'Pilih sesuai Divisi — lihat daftar lengkap & valid di sheet "Pilihan"'],
      ['PIC (email)', 'Email akun PIC/Project Manager yang sudah terdaftar di sistem'],
      ['Status', STATUS_PIPELINE.map(s => s).join(', ')],
      ['Hasil Pitch', 'WIN, LOSE, atau NOT_FINAL (kosongkan jika belum ada hasil)'],
      ['Nilai Project', 'Nilai kontrak dalam Rupiah, angka saja tanpa titik/koma (contoh: 250000000)'],
      ['No. Quotation', 'Format: WTM/[DIVISI]/QUOT/[TAHUN]/[NO. URUT] — contoh: WTM/EVENT/QUOT/2026/021 atau WTM/PH/QUOT/2026/011'],
      ['No. Invoice', 'Format: WTM/[DIVISI]/INV/[TAHUN]/[NO. URUT QUOTATION]/[NO. URUT INVOICE] — contoh: WTM/EVENT/INV/2026/021/25 atau WTM/PH/INV/2026/011/26'],
      ['Tanggal Brief / Submit / Mulai / Selesai', 'Format tanggal: YYYY-MM-DD (contoh: 2026-02-14)'],
      ['Alasan Menang/Kalah', 'Diisi jika project sudah WIN atau LOSE (opsional)'],
      ['Vendor Pemenang', 'Diisi jika project LOSE dan ada vendor/kompetitor yang menang (opsional)'],
      ['Catatan', 'Catatan tambahan (opsional)'],
      [''],
      ['Catatan penting:'],
      ['- Jangan ubah nama header pada baris pertama sheet "Projects".'],
      ['- Hapus 2 baris contoh sebelum mengisi data project asli, atau timpa langsung dengan data asli.'],
      ['- Satu baris = satu project.'],
    ]
    const wsGuide = XLSX.utils.aoa_to_sheet(guideRows)
    wsGuide['!cols'] = [{ wch: 38 }, { wch: 90 }]

    // Reference sheet listing every valid value for the dropdown-style columns,
    // grouped by division so EO and PH teams pick from the right list.
    const eoCategories = EO_CATEGORIES.map(k => CATEGORY_LABEL[k] + ' = ' + k)
    const phCategories = PH_CATEGORIES.map(k => CATEGORY_LABEL[k] + ' = ' + k)
    const statusList = STATUS_PIPELINE.map(s => `${s} (${STATUS_LABEL[s]})`)
    const maxRows = Math.max(eoCategories.length, phCategories.length, statusList.length, 4)
    const choiceRows = [['Divisi', 'Kategori - EVENT (EO)', 'Kategori - PH', 'Status', 'Hasil Pitch']]
    for (let i = 0; i < maxRows; i++) {
      choiceRows.push([
        i === 0 ? 'EVENT' : i === 1 ? 'PH' : '',
        eoCategories[i] || '',
        phCategories[i] || '',
        statusList[i] || '',
        i === 0 ? 'WIN' : i === 1 ? 'LOSE' : i === 2 ? 'NOT_FINAL' : '',
      ])
    }
    const wsChoices = XLSX.utils.aoa_to_sheet(choiceRows)
    wsChoices['!cols'] = [{ wch: 14 }, { wch: 38 }, { wch: 40 }, { wch: 28 }, { wch: 14 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Projects')
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk')
    XLSX.utils.book_append_sheet(wb, wsChoices, 'Pilihan')
    XLSX.writeFile(wb, 'template-import-project.xlsx')
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/projects/import', { method: 'POST', body: fd })
    setImporting(false)
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      setImportResult(d)
      fetchProjects()
    } else {
      setImportResult({ error: d.error || 'Gagal mengimpor file' })
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openQuickEdit = (e, p) => {
    e.preventDefault()
    e.stopPropagation()
    setEditId(p.id)
    setEditForm({
      division: p.division || 'EVENT',
      status: p.status,
      briefDate: p.briefDate ? p.briefDate.slice(0, 10) : '',
      startDate: p.startDate ? p.startDate.slice(0, 10) : '',
      endDate: p.endDate ? p.endDate.slice(0, 10) : '',
      picId: p.picId || '',
      memberIds: (p.members?.map(m => m.user?.id).filter(Boolean)) || [],
    })
  }

  const toggleEditMember = (userId) => {
    setEditForm(f => {
      const has = f.memberIds.includes(userId)
      return { ...f, memberIds: has ? f.memberIds.filter(id => id !== userId) : [...f.memberIds, userId] }
    })
  }

  const saveQuickEdit = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    setSavingEdit(true)
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        division: editForm.division,
        status: editForm.status,
        briefDate: editForm.briefDate || null,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
        picId: editForm.picId || null,
        memberIds: editForm.memberIds,
      }),
    })
    setSavingEdit(false)
    if (res.ok) {
      setEditId(null)
      fetchProjects()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menyimpan perubahan')
    }
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          {isManager && (
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
              <button onClick={downloadProjectTemplate} className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                ⬇ Unduh Template
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                {importing ? 'Mengunggah...' : '⬆ Import Project'}
              </button>
              <Link href="/projects/new" className="btn-primary">+ Project Baru</Link>
            </div>
          )}
        </div>

        {importResult && (
          <div className={`card p-3 text-sm ${importResult.error ? 'border-l-4 border-red-400 text-red-600' : 'border-l-4 border-green-400 text-green-700'}`}>
            {importResult.error ? importResult.error : (
              <>
                Berhasil mengimpor {importResult.imported} project{importResult.skipped > 0 && `, ${importResult.skipped} dilewati`}.
                {importResult.errors?.length > 0 && (
                  <ul className="mt-1 text-xs text-gray-500 list-disc list-inside">
                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 border-t-4 border-blue-400">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input flex-1"
              placeholder="Cari nama project..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="select sm:w-44 transition-shadow focus:shadow-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              {STATUS_PIPELINE.map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <select className="select sm:w-44 transition-shadow focus:shadow-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Semua Kategori</option>
              {Object.entries(CATEGORY_LABEL)
                .filter(([k]) => {
                  if (showEO && !showPH) return EO_CATEGORIES.includes(k)
                  if (showPH && !showEO) return PH_CATEGORIES.includes(k)
                  return true
                })
                .map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="month"
                className="input w-full sm:w-40 transition-shadow focus:shadow-sm"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                title="Filter berdasarkan bulan pelaksanaan project"
              />
              {filterMonth && (
                <button type="button" onClick={() => setFilterMonth('')} className="text-xs text-gray-400 hover:text-red-500 px-1 shrink-0">
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 mr-1">Divisi:</span>
            <button
              type="button"
              onClick={() => setShowEO(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${showEO ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
              {showEO && '✓'} EO
            </button>
            <button
              type="button"
              onClick={() => setShowPH(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${showPH ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
              {showPH && '✓'} PH
            </button>
            <span className="text-xs text-gray-500 ml-3 mr-1">|</span>
            <button
              type="button"
              onClick={() => setInvolvedOnly(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${involvedOnly ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
              {involvedOnly && '✓'} Project Saya
            </button>
          </div>
        </div>

        {/* Project count */}
        <p className="text-xs text-gray-500">{visibleProjects.length} project ditemukan</p>

        {/* Project list */}
        <div className="space-y-2">
          {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
          {!loading && visibleProjects.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Tidak ada project</div>
          )}
          {!loading && visibleProjects.length > 0 && STATUS_PIPELINE.filter(s => visibleProjects.some(p => p.status === s)).map(s => {
            const group = visibleProjects.filter(p => p.status === s)
            return (
            <details key={s} open className="group rounded-xl overflow-hidden border border-gray-100">
              <summary className={clsx('px-4 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none list-none', STATUS_GROUP_COLOR[s] || 'bg-gray-500 text-white')}>
                <span className="flex items-center gap-2 text-sm font-bold">
                  {STATUS_LABEL[s] || s}
                  <span className="text-xs font-normal opacity-80">({group.length})</span>
                </span>
                <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="space-y-2 p-2 bg-gray-50">
          {group.map(p => (
            <div key={p.id} className="card flex flex-col gap-3 p-4 hover:shadow-md hover:border-brand-200 transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Link href={`/projects/${p.id}`} className="flex-1 min-w-0 block hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs text-gray-400 font-mono">{p.code} · {CATEGORY_LABEL[p.category] || p.category?.replace(/_/g, ' ')}</span>
                    {p.recommendation === 'PRIORITIZE' && <span className="text-xs">🔥</span>}
                    {p.recommendation === 'EVALUATE' && <span className="text-xs">⚠️</span>}
                    {p.health && p.health.level !== 'gray' && p.health.level !== 'green' && (
                      <span
                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.health.level === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                        title={p.health.reasons.join(' · ')}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${HEALTH_DOT[p.health.level]}`} />
                        {HEALTH_LABEL[p.health.level]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{p.client?.name || 'No client'}</span>
                    <span>·</span>
                    <span>PIC: {p.pic?.name || '—'}</span>
                    <span>· {p.division === 'PH' ? 'PH' : 'EO'}</span>
                    {p.startDate && <span>· {new Date(p.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    {p.members?.length > 0 && <span>· {p.members.length} anggota</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {p.pitchResult && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      Pitch: <PitchResultBadge result={p.pitchResult} />
                    </span>
                  )}
                  {canQuickEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (editId === p.id) { setEditId(null) } else { openQuickEdit(e, p) }
                      }}
                      title="Edit cepat"
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand-600"
                    >
                      ✏️
                    </button>
                  )}
                  {canDelete && (
                    confirmDeleteId === p.id ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProject(p.id) }}
                          className="text-xs px-2 py-1 rounded-md bg-red-500 text-white"
                        >Hapus</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }}
                          className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-500"
                        >Batal</button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id) }}
                        title="Hapus project"
                        className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        🗑️
                      </button>
                    )
                  )}
                </div>
              </div>

              {editId === p.id && (
                <div
                  className="border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end"
                >
                  <div>
                    <label className="label">Divisi</label>
                    <select className="select text-sm" value={editForm.division} onChange={e => setEditForm(f => ({ ...f, division: e.target.value }))}>
                      <option value="EVENT">EO (Event)</option>
                      <option value="PH">PH (Production House)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="select text-sm" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUS_PIPELINE.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tgl Brief</label>
                    <input type="date" className="input text-sm" value={editForm.briefDate} onChange={e => setEditForm(f => ({ ...f, briefDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Tgl Event / Mulai</label>
                    <input type="date" className="input text-sm" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Tgl Selesai</label>
                    <input type="date" className="input text-sm" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">PIC / Project Manager</label>
                    <select className="select text-sm" value={editForm.picId} onChange={e => setEditForm(f => ({ ...f, picId: e.target.value }))}>
                      <option value="">— Belum ada PIC —</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}{u.jobTitle ? ` (${u.jobTitle})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-3 lg:col-span-6">
                    <label className="label">Anggota Tim</label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                      {allUsers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleEditMember(u.id)}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${editForm.memberIds?.includes(u.id) ? 'bg-brand text-white border-brand' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                        >
                          {editForm.memberIds?.includes(u.id) && '✓ '}{u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => saveQuickEdit(e, p.id)} disabled={savingEdit} className="btn-primary text-sm">
                      {savingEdit ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditId(null) }} className="text-sm text-gray-400 hover:underline">Batal</button>
                  </div>
                </div>
              )}
            </div>
          ))}
              </div>
            </details>
          )})}
        </div>

      </main>
    </div>
  )
}
