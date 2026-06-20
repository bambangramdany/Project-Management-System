'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const ALLOWED = ['OWNER', 'FINANCE', 'DIRECTOR']
const MONTH_LABEL = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

function fmtRp(n) {
  const v = Math.round(n || 0)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (abs >= 1_000_000)     return `${sign}Rp ${Math.round(abs / 1_000_000)} jt`
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`
}

function pctStr(n) {
  return `${(n || 0).toFixed(1)}%`
}

function MonthYearSelect({ value, onChange }) {
  const parts = value.split('-').map(Number)
  const y = parts[0], m = parts[1]
  const nowY = new Date().getFullYear()
  const years = []
  for (let yr = nowY - 3; yr <= nowY + 1; yr++) years.push(yr)
  return (
    <div className="flex items-center gap-1">
      <select className="border rounded px-2 py-1 text-xs" value={m}
        onChange={e => onChange(`${y}-${String(Number(e.target.value)).padStart(2, '0')}`)}>
        {MONTH_LABEL.map((l, i) => <option key={i} value={i + 1}>{l}</option>)}
      </select>
      <select className="border rounded px-2 py-1 text-xs" value={y}
        onChange={e => onChange(`${e.target.value}-${String(m).padStart(2, '0')}`)}>
        {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  )
}

function MarginBadge({ value }) {
  const cls = value >= 20 ? 'bg-green-100 text-green-700'
    : value >= 10 ? 'bg-yellow-100 text-yellow-700'
    : value >= 0  ? 'bg-orange-100 text-orange-700'
    : 'bg-red-100 text-red-700'
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{pctStr(value)}</span>
}

function SummaryCard({ label, value, sub, icon, colorKey }) {
  const colors = {
    blue:    { border: 'border-blue-400',    icon: 'bg-blue-100 text-blue-600',    val: 'text-blue-700' },
    orange:  { border: 'border-orange-400',  icon: 'bg-orange-100 text-orange-600',  val: 'text-orange-700' },
    emerald: { border: 'border-emerald-400', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
    rose:    { border: 'border-rose-400',    icon: 'bg-rose-100 text-rose-600',    val: 'text-rose-700' },
    red:     { border: 'border-red-400',     icon: 'bg-red-100 text-red-600',      val: 'text-red-700' },
  }
  const cl = colors[colorKey] || colors.blue
  return (
    <div className={`card border-t-4 ${cl.border} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-lg ${cl.icon} flex items-center justify-center text-sm`}>{icon}</span>
        <span className="text-xs text-gray-500 leading-tight">{label}</span>
      </div>
      <div className={`text-base sm:text-lg font-bold ${cl.val}`}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</div>
    </div>
  )
}

export default function PnLPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const nowDate = new Date()
  const curYear  = nowDate.getFullYear()
  const curMonth = String(nowDate.getMonth() + 1).padStart(2, '0')

  const [from, setFrom] = useState(`${curYear}-01`)
  const [to,   setTo]   = useState(`${curYear}-${curMonth}`)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!ALLOWED.includes(session?.user?.role)) { router.push('/dashboard'); return }
    setLoading(true)
    fetch(`/api/finance/pnl?from=${from}&to=${to}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
  }, [status, session, from, to, router])

  const { rows = [], totals = {}, opexByCategory = {} } = data || {}

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/finance" className="text-xs text-gray-400 hover:text-gray-600">← Kembali ke Keuangan</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-1">Laporan P&L</h1>
            <p className="text-xs text-gray-500">Revenue − HPP = Gross Profit − Opex = Net Profit</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>Dari</span>
            <MonthYearSelect value={from} onChange={setFrom} />
            <span>sampai</span>
            <MonthYearSelect value={to} onChange={setTo} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Menghitung laporan P&L...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard label="Total Revenue" value={fmtRp(totals.revenue)}
                sub={`Terkumpul: ${fmtRp(totals.revenueCollected)}`} icon="📈" colorKey="blue" />
              <SummaryCard label="HPP (Biaya Project)" value={fmtRp(totals.hpp)}
                sub={`PR: ${fmtRp(totals.hppPR)} · Langsung: ${fmtRp(totals.hppDirect)}`} icon="📤" colorKey="orange" />
              <SummaryCard label="Gross Profit" value={fmtRp(totals.grossProfit)}
                sub={`Margin: ${pctStr(totals.grossMarginPct)}`} icon="💰"
                colorKey={totals.grossProfit >= 0 ? 'emerald' : 'red'} />
              <SummaryCard label="Total Opex" value={fmtRp(totals.opex)}
                sub="Biaya operasional" icon="🏢" colorKey="rose" />
              <SummaryCard label="Net Profit" value={fmtRp(totals.netProfit)}
                sub={`Margin nett: ${pctStr(totals.netMarginPct)}`}
                icon={totals.netProfit >= 0 ? '✅' : '⚠️'}
                colorKey={totals.netProfit >= 0 ? 'emerald' : 'red'} />
            </div>

            {/* Monthly Breakdown Table */}
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Rincian Per Bulan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                      <th className="px-4 py-2.5">Bulan</th>
                      <th className="px-4 py-2.5 text-right">Revenue</th>
                      <th className="px-4 py-2.5 text-right text-gray-400">Terkumpul</th>
                      <th className="px-4 py-2.5 text-right">HPP</th>
                      <th className="px-4 py-2.5 text-right">Gross Profit</th>
                      <th className="px-4 py-2.5 text-right">Gross%</th>
                      <th className="px-4 py-2.5 text-right">Opex</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Net Profit</th>
                      <th className="px-4 py-2.5 text-right">Net%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                          Tidak ada data untuk periode ini
                        </td>
                      </tr>
                    )}
                    {rows.map(r => {
                      const [yr, mo] = r.period.split('-').map(Number)
                      return (
                        <tr key={r.period} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-700">{MONTH_LABEL[mo - 1]} {yr}</td>
                          <td className="px-4 py-2.5 text-right text-gray-800">{fmtRp(r.revenue)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{fmtRp(r.revenueCollected)}</td>
                          <td className="px-4 py-2.5 text-right text-orange-600">{fmtRp(r.hpp)}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${r.grossProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {fmtRp(r.grossProfit)}
                          </td>
                          <td className="px-4 py-2.5 text-right"><MarginBadge value={r.grossMarginPct} /></td>
                          <td className="px-4 py-2.5 text-right text-rose-600">{fmtRp(r.opex)}</td>
                          <td className={`px-4 py-2.5 text-right font-bold ${r.netProfit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            {fmtRp(r.netProfit)}
                          </td>
                          <td className="px-4 py-2.5 text-right"><MarginBadge value={r.netMarginPct} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 text-sm border-t-2 border-gray-200 font-semibold">
                        <td className="px-4 py-2.5 text-gray-700">TOTAL</td>
                        <td className="px-4 py-2.5 text-right text-gray-800">{fmtRp(totals.revenue)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{fmtRp(totals.revenueCollected)}</td>
                        <td className="px-4 py-2.5 text-right text-orange-600">{fmtRp(totals.hpp)}</td>
                        <td className={`px-4 py-2.5 text-right ${totals.grossProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {fmtRp(totals.grossProfit)}
                        </td>
                        <td className="px-4 py-2.5 text-right"><MarginBadge value={totals.grossMarginPct} /></td>
                        <td className="px-4 py-2.5 text-right text-rose-600">{fmtRp(totals.opex)}</td>
                        <td className={`px-4 py-2.5 text-right ${totals.netProfit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                          {fmtRp(totals.netProfit)}
                        </td>
                        <td className="px-4 py-2.5 text-right"><MarginBadge value={totals.netMarginPct} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Opex Breakdown */}
            {Object.keys(opexByCategory).length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Rincian Opex per Kategori</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(opexByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border">
                        <span className="text-gray-600 text-xs truncate">{cat}</span>
                        <span className="font-medium text-gray-800 shrink-0 ml-2 text-xs">{fmtRp(amt)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Methodology note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Catatan Metodologi</p>
              <p>• <strong>Revenue</strong>: Nilai Receivable (invoice/piutang) yang dibuat dalam periode ini, terlepas dari status pembayaran.</p>
              <p>• <strong>Terkumpul</strong>: Bagian revenue yang sudah berstatus PAID (cash basis).</p>
              <p>• <strong>HPP</strong>: Payment Request yang sudah dibayarkan (PAID, berdasarkan tanggal bayar) + Direct Expense project dalam periode.</p>
              <p>• <strong>Opex</strong>: Entri biaya operasional (sewa, gaji overhead, utilitas, dll) dari halaman Opex.</p>
              <p>• <strong>Gross Profit</strong> = Revenue − HPP &nbsp;|&nbsp; <strong>Net Profit</strong> = Gross Profit − Opex</p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
