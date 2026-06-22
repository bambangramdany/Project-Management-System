'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

const STATUS_META = {
  DRAFT:     { label: 'Draft',      color: 'bg-gray-100 text-gray-600' },
  ISSUED:    { label: 'Issued',     color: 'bg-blue-100 text-blue-700' },
  PAID:      { label: 'Lunas ✓',   color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled',  color: 'bg-red-100 text-red-400' },
}

export default function InvoiceListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const load = () => {
    setLoading(true)
    const q = filter !== 'all' ? `?status=${filter}` : ''
    fetch(`/api/invoices${q}`).then(r => r.json()).then(d => {
      setInvoices(d.invoices || [])
      setLoading(false)
    })
  }

  useEffect(() => { if (status === 'authenticated') load() }, [status, filter])

  const totalIssued = invoices.filter(i => ['ISSUED','PAID'].includes(i.status)).reduce((s,i) => s + i.totalAmount, 0)
  const totalPaid   = invoices.filter(i => i.status === 'PAID').reduce((s,i) => s + i.totalAmount, 0)

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Invoice</h1>
              <p className="text-sm text-gray-500">Invoice yang diterbitkan ke klien</p>
            </div>
          </div>
          {session?.user && ['OWNER','FINANCE','FINANCE_STAFF','DIRECTOR'].includes(session.user.role) && (
            <Link href="/invoice/bulk-create"
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
              ⚡ Generate Invoice Massal
            </Link>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card p-4 border-t-4 border-brand">
            <p className="text-xs text-gray-500">Total Ditagihkan</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(totalIssued)}</p>
          </div>
          <div className="card p-4 border-t-4 border-green-400">
            <p className="text-xs text-gray-500">Total Lunas</p>
            <p className="text-xl font-bold text-green-700 mt-0.5">{fmt(totalPaid)}</p>
          </div>
          <div className="card p-4 border-t-4 border-amber-400">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{fmt(totalIssued - totalPaid)}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all','DRAFT','ISSUED','PAID','CANCELLED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                filter === s ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {s === 'all' ? 'Semua' : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="card divide-y divide-gray-100">
          {loading && <div className="py-10 text-center text-sm text-gray-400">Memuat...</div>}
          {!loading && invoices.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400">Belum ada invoice</div>
          )}
          {!loading && invoices.map(inv => {
            const st = STATUS_META[inv.status] || STATUS_META.DRAFT
            const rec = inv.receivables?.[0]
            return (
              <Link key={inv.id} href={`/invoice/${inv.id}`}
                className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">{inv.invoiceNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    {inv.isDP && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">DP</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{inv.mode}</span>
                  </div>
                  <p className="font-medium text-gray-800 mt-0.5">{inv.financeEventName || inv.quotation?.eventName}</p>
                  <p className="text-sm text-gray-500">{inv.financeClientName || inv.quotation?.clientName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('id-ID',{dateStyle:'medium'}) : 'Belum diterbitkan'}
                    {inv.dueDate && ` · Due: ${new Date(inv.dueDate).toLocaleDateString('id-ID',{dateStyle:'medium'})}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">{fmt(inv.totalAmount)}</p>
                  {rec?.status === 'PAID'
                    ? <p className="text-xs text-green-600 mt-0.5">✓ Lunas {fmt(rec.paidAmount)}</p>
                    : rec && <p className="text-xs text-amber-600 mt-0.5">Belum bayar</p>
                  }
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
