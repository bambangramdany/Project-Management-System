'use client'
import { useState, useEffect, useMemo } from 'react'

const fmtRp = n => n == null || n === 0 ? '–' : `Rp ${(n / 1_000_000).toFixed(1)} jt`
const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '–'
const cls = v => v >= 0 ? 'text-green-600' : 'text-red-500'

function Bar({ value, max, color = 'bg-violet-500' }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${w}%` }} />
    </div>
  )
}

export default function ProjectProfitabilityTab({ project }) {
  const [budget, setBudget] = useState([])
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [b, e, p] = await Promise.all([
        fetch(`/api/projects/${project.id}/budget`).then(r => r.ok ? r.json() : []),
        fetch(`/api/projects/${project.id}/expenses`).then(r => r.ok ? r.json() : []),
        fetch(`/api/payments?projectId=${project.id}`).then(r => r.ok ? r.json() : []).catch(() => []),
      ])
      setBudget(Array.isArray(b) ? b : b.items ?? [])
      setExpenses(Array.isArray(e) ? e : e.expenses ?? [])
      setPayments(Array.isArray(p) ? p : p.items ?? [])
      setLoading(false)
    }
    load()
  }, [project.id])

  const calc = useMemo(() => {
    const revenue = project.projectValue ?? 0
    const rab = budget.filter(i => !i.isTitipan).reduce((s, i) => s + (i.quotedAmount || 0), 0)
    const titipan = budget.filter(i => i.isTitipan).reduce((s, i) => s + (i.quotedAmount || 0), 0)

    // Actual costs: paid payments + direct expenses
    const paidPayments = payments
      .filter(p => p.paidAt)
      .reduce((s, p) => s + (p.amount || 0), 0)
    const directExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const actualCost = paidPayments + directExpenses

    // Budget item realisasi (from actualAmount field)
    const actualBudget = budget.filter(i => !i.isTitipan).reduce((s, i) => s + (i.actualAmount || 0), 0)

    const forecastMargin = revenue - rab - titipan
    const actualMargin = actualCost > 0 ? revenue - actualCost - titipan : null

    return { revenue, rab, titipan, paidPayments, directExpenses, actualCost, actualBudget, forecastMargin, actualMargin }
  }, [budget, expenses, payments, project.projectValue])

  if (loading) return <div className="p-6 text-center text-gray-400 text-sm">Memuat data profitabilitas…</div>

  const { revenue, rab, titipan, paidPayments, directExpenses, actualCost, actualBudget, forecastMargin, actualMargin } = calc

  return (
    <div className="p-4 space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nilai Project', value: fmtRp(revenue), sub: 'Project value', color: 'text-gray-900' },
          { label: 'RAB (Forecast Cost)', value: fmtRp(rab), sub: `${pct(rab, revenue)} dari nilai`, color: 'text-blue-700' },
          { label: 'Margin Forecast', value: fmtRp(forecastMargin), sub: pct(forecastMargin, revenue), color: cls(forecastMargin) },
          { label: 'Realisasi Pengeluaran', value: actualCost > 0 ? fmtRp(actualCost) : '–', sub: actualCost > 0 ? pct(actualCost, revenue) + ' dari nilai' : 'Belum ada realisasi', color: actualCost > 0 ? 'text-orange-600' : 'text-gray-400' },
        ].map(c => (
          <div key={c.label} className="card p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Margin actual */}
      {actualMargin !== null && (
        <div className={`rounded-xl border-2 px-4 py-3 flex items-center justify-between ${actualMargin >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div>
            <p className="text-xs font-semibold text-gray-600">Margin Aktual (setelah realisasi)</p>
            <p className={`text-xl font-bold mt-0.5 ${cls(actualMargin)}`}>{fmtRp(actualMargin)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500">vs Forecast</p>
            <p className={`font-bold text-sm ${cls(actualMargin - forecastMargin)}`}>
              {actualMargin - forecastMargin > 0 ? '+' : ''}{fmtRp(actualMargin - forecastMargin)}
            </p>
          </div>
        </div>
      )}

      {/* Cost breakdown */}
      <div className="card p-4">
        <p className="text-sm font-bold text-gray-800 mb-3">Rincian Biaya</p>
        <div className="space-y-3">
          <CostRow label="RAB / Budget (non-titipan)" forecast={rab} actual={actualBudget} max={revenue} />
          {titipan > 0 && <CostRow label="Titipan Klien" forecast={titipan} actual={null} max={revenue} note="Pass-through, tidak dihitung margin" />}
          {paidPayments > 0 && (
            <div className="pl-2 border-l-2 border-orange-200">
              <p className="text-xs text-gray-500 mb-1">Pembayaran Terealisasi</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Payment Requests (paid)</span>
                <span className="font-semibold text-orange-600">{fmtRp(paidPayments)}</span>
              </div>
              {directExpenses > 0 && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-700">Direct Expenses</span>
                  <span className="font-semibold text-orange-600">{fmtRp(directExpenses)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Budget items detail */}
      {budget.filter(i => !i.isTitipan).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-800">Detail Budget Item</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-400">
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Item</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide">RAB</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide">Realisasi</th>
                  <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {budget.filter(i => !i.isTitipan).map(item => {
                  const diff = (item.actualAmount || 0) - (item.quotedAmount || 0)
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <p className="font-medium text-gray-900">{item.label}</p>
                        {item.vendorName && <p className="text-gray-400">{item.vendorName}</p>}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtRp(item.quotedAmount)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {item.actualAmount ? <span className="text-orange-600 font-semibold">{fmtRp(item.actualAmount)}</span> : <span className="text-gray-300">–</span>}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${item.actualAmount ? cls(-diff) : 'text-gray-300'}`}>
                        {item.actualAmount ? (diff > 0 ? '+' : '') + fmtRp(diff) : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="py-2 px-3 text-gray-700">Total</td>
                  <td className="py-2 px-3 text-right tabular-nums text-blue-700">{fmtRp(rab)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-orange-600">{actualBudget > 0 ? fmtRp(actualBudget) : '–'}</td>
                  <td className={`py-2 px-3 text-right tabular-nums ${actualBudget > 0 ? cls(-(actualBudget - rab)) : 'text-gray-300'}`}>
                    {actualBudget > 0 ? ((actualBudget - rab) > 0 ? '+' : '') + fmtRp(actualBudget - rab) : '–'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {budget.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          Belum ada budget item. Tambahkan dari tab Quotation/Budget.
        </div>
      )}
    </div>
  )
}

function CostRow({ label, forecast, actual, max, note }) {
  const diff = actual != null ? actual - forecast : null
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700 font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-blue-600 tabular-nums">{fmtRp(forecast)}</span>
          {actual != null && actual > 0 && <span className="text-orange-500 tabular-nums">→ {fmtRp(actual)}</span>}
          {diff != null && diff !== 0 && <span className={`text-xs font-semibold ${cls(-diff)}`}>{diff > 0 ? '+' : ''}{fmtRp(diff)}</span>}
        </div>
      </div>
      <Bar value={forecast} max={max} color="bg-blue-400" />
      {actual != null && actual > 0 && <Bar value={actual} max={max} color="bg-orange-400" />}
      {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  )
}
