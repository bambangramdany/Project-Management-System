'use client'
import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { StatusBadge, CategoryBadge, PitchResultBadge } from '@/components/StatusBadge'
import { STATUS_PIPELINE, STATUS_LABEL, CATEGORY_LABEL } from '@/lib/constants'
import { canViewAllProjects } from '@/lib/rbac'
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
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchProjects = useCallback(() => {
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (search) params.set('search', search)
    setLoading(true)
    fetch(`/api/projects?${params}`).then(r => r.json()).then(data => {
      setProjects(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [filterStatus, filterCategory, search])

  useEffect(() => { if (status === 'authenticated') fetchProjects() }, [status, fetchProjects])

  const isManager = canViewAllProjects(session?.user.role)

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          {isManager && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
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
        <div className="card p-4">
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
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project count */}
        <p className="text-xs text-gray-500">{projects.length} project ditemukan</p>

        {/* Project list */}
        <div className="space-y-2">
          {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}
          {!loading && projects.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Tidak ada project</div>
          )}
          {projects.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-200 block">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                  <CategoryBadge category={p.category} />
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
                  {p.startDate && <span>· {new Date(p.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  {p.members?.length > 0 && <span>· {p.members.length} anggota</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PitchResultBadge result={p.pitchResult} />
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  )
}
