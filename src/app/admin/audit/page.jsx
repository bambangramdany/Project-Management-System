'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const fmt = (n) => n == null ? '—' : 'Rp ' + Math.round(n).toLocaleString('id-ID')
const fmtShort = (n) => {
  if (n == null) return '—'
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1) + 'M'
  if (n >= 1_000_000)     return 'Rp ' + (n / 1_000_000).toFixed(1) + ' jt'
  return 'Rp ' + Math.round(n).toLocaleString('id-ID')
}

const STATUS_COLOR = {
  ACTIVE:    'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ON_HOLD:   'bg-yellow-100 text-yellow-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
  PITCH:     'bg-purple-100 text-purple-700',
  WON:       'bg-green-100 text-green-700',
  APPROVED:  'bg-blue-100 text-blue-700',
  DRAFT:     'bg-gray-100 text-gray-500',
  LOST:      'bg-red-100 text-red-500',
}

function Badge({ status }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function DiffBadge({ a, b }) {
  if (a == null || b == null) return null
  const diff = Math.abs(a - b)
  if (diff < 1000) return <span className="text-[10px] text-green-600">✓ match</span>
  const pct = ((a - b) / b * 100).toFixed(0)
  return <span className="text-[10px] text-red-500">selisih {pct > 0 ? '+' : ''}{pct}%</span>
}

export default function AuditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('mismatch')
  const [fixing, setFixing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !['OWNER', 'DIRECTOR', 'PROJECT_MANAGER'].includes(session.user.role)) router.push('/dashboard')
  }, [status, session])

  const load = () => {
    setLoading(true)
    fetch('/api/admin/audit')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }

  useEffect(() => { if (status === 'authenticated') load() }, [status])

  async function fixValue(projectId, newValue, projectName) {
    if (!confirm(`Update nilai project "${projectName}" menjadi ${fmt(newValue)}?`)) return
    setFixing(projectId)
    await fetch('/api/admin/audit/fix-value', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, newValue }),
    })
    setFixing(null)
    load()
  }

  if (loading || status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Memuat data audit...</div>
      </div>
    )
  }

  const tabs = [
    { id: 'mismatch',  label: '⚠ Nilai Tidak Sesuai',  count: data?.summary.projectsWithMismatch, color: 'text-orange-600' },
    { id: 'noquot',    label: '📋 Tanpa Quotation',     count: data?.summary.projectsNoQuotation,  color: 'text-blue-600' },
    { id: 'orphan',    label: '🔗 Quotation Tak Tertaut', count: data?.summary.orphanQuotations,   color: 'text-purple-600' },
    { id: 'clean',     label: '✅ Data Bersih',          count: data?.summary.projectsClean,       color: 'text-green-600' },
  ]

  const rows = tab === 'mismatch' ? data?.projectsWithMismatch
             : tab === 'noquot'   ? data?.projectsNoQuotation
             : tab === 'orphan'   ? data?.orphanQuotations
             : data?.projectsClean

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 mt-1">←</Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit & Rekonsiliasi Data</h1>
            <p className="text-sm text-gray-500">Identifikasi potensi duplikasi dan ketidaksesuaian antara Project, Quotation, dan Invoice</p>
          </div>
        </div>

        {/* Explanation box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-1.5">
          <p className="font-semibold">📌 Cara membaca halaman ini:</p>
          <ul className="space-y-1 list-disc pl-4 text-amber-700">
            <li><strong>Dashboard Overview Keuangan</strong> menggunakan <code className="bg-amber-100 px-1 rounded text-xs">project.projectValue</code> — bukan dari invoice. Kalau dua project berbeda untuk event yang sama, angkanya dihitung dua kali.</li>
            <li><strong>Data paling valid</strong> = quotation yang disubmit Bima (sudah WON + ada invoice). Kolom "Total Quotation" adalah angka yang seharusnya.</li>
            <li><strong>Aksi yang direkomendasikan:</strong> Untuk "Nilai Tidak Sesuai" → klik "Sinkronkan" untuk update ke nilai quotation. Untuk project ganda → hapus project yang salah via halaman Project.</li>
          </ul>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`card p-4 text-left transition-all ${tab === t.id ? 'ring-2 ring-brand shadow-md' : 'hover:shadow-sm'}`}>
              <p className={`text-2xl font-bold ${t.color}`}>{t.count ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.label}</p>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="card divide-y divide-gray-100">
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">{tabs.find(t => t.id === tab)?.label}</p>
          </div>

          {/* ── MISMATCH tab ── */}
          {tab === 'mismatch' && (
            <>
              {(!rows || rows.length === 0) && (
                <div className="py-12 text-center text-sm text-gray-400">✅ Tidak ada ketidaksesuaian nilai — semua project match dengan quotation</div>
              )}
              {rows?.map(p => (
                <div key={p.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/projects/${p.id}`} className="font-semibold text-gray-800 hover:text-brand">
                          {p.name}
                        </Link>
                        <Badge status={p.status} />
                        <span className="text-xs text-gray-400">{p.clientName}</span>
                      </div>
                      <div className="flex gap-4 mt-1.5 text-sm flex-wrap">
                        <div>
                          <span className="text-gray-400 text-xs">Nilai di sistem</span>
                          <p className="font-medium text-gray-700">{fmtShort(p.projectValue)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Total Quotation WON</span>
                          <p className="font-semibold text-indigo-700">{fmtShort(p.quotGrandTotal)}</p>
                        </div>
                        <div className="flex items-end">
                          <DiffBadge a={p.projectValue} b={p.quotGrandTotal} />
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => fixValue(p.id, p.quotGrandTotal, p.name)}
                        disabled={fixing === p.id}
                        className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                        {fixing === p.id ? 'Menyimpan...' : '🔄 Sinkronkan ke Quotation'}
                      </button>
                    </div>
                  </div>
                  {/* Quotation list */}
                  {p.quotations?.map(q => (
                    <div key={q.id} className="ml-4 flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <Badge status={q.status} />
                      <span className="font-mono">{q.number}</span>
                      <span className="font-medium text-gray-700">{fmtShort(q.grandTotal)}</span>
                      {q.invoiceCount > 0 && <span className="text-green-600">📄 {q.invoiceCount} invoice</span>}
                      <Link href={`/quotation/${q.id}`} className="text-brand hover:underline ml-auto">Lihat →</Link>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* ── NO QUOTATION tab ── */}
          {tab === 'noquot' && (
            <>
              <div className="px-5 py-3 bg-blue-50 text-xs text-blue-700">
                Project berikut tidak memiliki quotation WON yang terhubung. Kemungkinan: (1) input manual lama sebelum sistem quotation dipakai, (2) project berbeda nama dengan quotation-nya, atau (3) quotation belum di-set ke WON.
              </div>
              {(!rows || rows.length === 0) && (
                <div className="py-12 text-center text-sm text-gray-400">Semua project memiliki quotation WON terhubung</div>
              )}
              {rows?.map(p => (
                <div key={p.id} className="px-5 py-3 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/projects/${p.id}`} className="font-semibold text-gray-800 hover:text-brand">{p.name}</Link>
                      <Badge status={p.status} />
                      <span className="text-xs text-gray-400">{p.clientName}</span>
                      {p.division && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{p.division}</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      Nilai di sistem: <span className="font-medium text-gray-700">{fmtShort(p.projectValue)}</span>
                      {p.quotCount > 0 && <span className="ml-3 text-amber-600">{p.quotCount} quotation terhubung (tapi belum WON)</span>}
                      {p.hasInvoices && <span className="ml-3 text-green-600">Ada invoice</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <Link href={`/projects/${p.id}`}
                      className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                      Lihat Project →
                    </Link>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── ORPHAN QUOTATIONS tab ── */}
          {tab === 'orphan' && (
            <>
              <div className="px-5 py-3 bg-purple-50 text-xs text-purple-700">
                Quotation WON/Approved berikut tidak tertaut ke project manapun. Kemungkinan merupakan project baru yang belum dibuat, atau perlu dihubungkan ke project yang sudah ada.
              </div>
              {(!rows || rows.length === 0) && (
                <div className="py-12 text-center text-sm text-gray-400">Semua quotation WON sudah terhubung ke project</div>
              )}
              {rows?.map(q => (
                <div key={q.id} className="px-5 py-3 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge status={q.status} />
                      <span className="font-mono text-xs text-gray-400">{q.number}</span>
                      {q.division && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{q.division}</span>}
                    </div>
                    <p className="font-semibold text-gray-800 mt-0.5">{q.eventName}</p>
                    <p className="text-sm text-gray-500">{q.clientName}</p>
                    <div className="text-sm mt-0.5">
                      <span className="font-medium text-indigo-700">{fmtShort(q.grandTotal)}</span>
                      {q.invoiceCount > 0 && <span className="ml-3 text-green-600 text-xs">📄 {q.invoiceCount} invoice · {fmtShort(q.invoiceTotal)}</span>}
                    </div>
                  </div>
                  <Link href={`/quotation/${q.id}`}
                    className="shrink-0 text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                    Lihat Quotation →
                  </Link>
                </div>
              ))}
            </>
          )}

          {/* ── CLEAN tab ── */}
          {tab === 'clean' && (
            <>
              {(!rows || rows.length === 0) && (
                <div className="py-12 text-center text-sm text-gray-400">—</div>
              )}
              {rows?.map(p => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                    <Link href={`/projects/${p.id}`} className="font-medium text-gray-800 hover:text-brand">{p.name}</Link>
                    <Badge status={p.status} />
                    <span className="text-xs text-gray-400">{p.clientName}</span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-3 shrink-0">
                    <span>{fmtShort(p.projectValue)}</span>
                    {p.wonQuotCount > 0 && <span className="text-green-600 text-xs">✓ {p.wonQuotCount} quotation WON</span>}
                    {p.hasInvoices && <span className="text-green-600 text-xs">📄 invoice</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Action guide */}
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">📋 Panduan Tindakan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-orange-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-orange-800">⚠ Nilai Tidak Sesuai</p>
              <p className="text-orange-700 text-xs">Klik "Sinkronkan ke Quotation" untuk update projectValue agar sesuai dengan total quotation WON. Ini akan memperbaiki angka di dashboard Overview Keuangan.</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-blue-800">📋 Project Tanpa Quotation</p>
              <p className="text-blue-700 text-xs">Cek apakah ada quotation Bima untuk project ini dengan nama berbeda. Jika ya: buka quotation → edit → hubungkan ke project ini. Jika tidak ada → data ini input manual, verifikasi nilai-nya.</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-purple-800">🔗 Quotation Tak Tertaut</p>
              <p className="text-purple-700 text-xs">Quotation WON yang belum punya project. Pertimbangkan untuk buat project baru dari quotation ini, atau hubungkan ke project yang sudah ada.</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-red-800">🗑 Jika Ada Project Ganda</p>
              <p className="text-red-700 text-xs">Buka halaman Project yang merupakan duplikat → ubah status ke "Cancelled" atau hapus (jika tidak ada transaksi). Jangan hapus yang ada invoice-nya.</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
