'use client'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Line, ComposedChart,
} from 'recharts'
import { useState } from 'react'

function fmtRp(val) {
  if (!val) return 'Rp 0'
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(0)}jt`
  return `Rp ${val.toLocaleString('id-ID')}`
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e1b4b',
  border: '1px solid rgba(167,139,250,0.3)',
  borderRadius: 10,
  color: '#e9d5ff',
  fontSize: 12,
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE} className="p-3 shadow-xl">
      <p className="font-bold text-violet-200 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name === 'target' ? '— Target Revenue' : p.name} : {fmtRp(p.value)}
        </p>
      ))}
    </div>
  )
}

function ProfitTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE} className="p-3 shadow-xl">
      <p className="font-bold text-violet-200 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name === 'target' ? '— Target Gross Profit'
            : p.name === 'aktual' ? 'Aktual'
            : 'Ekspektasi'} : {fmtRp(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function RevenueTrendCharts({ data, year, onYearChange }) {
  const [profitView, setProfitView] = useState('total') // 'total' | 'split'
  const { revenueTrend = [], profitTrend = [] } = data || {}

  const tickStyle = { fill: '#a78bfa', fontSize: 11 }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* === Tren Revenue === */}
      <div className="card p-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2d2a6e 100%)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-bold text-white">Tren Revenue</h3>
            <p className="text-xs text-violet-400">Jan {year} – Des {year}</p>
          </div>
          <select
            className="text-xs bg-white/10 text-violet-200 border border-violet-700 rounded-lg px-2 py-1"
            value={year}
            onChange={e => onYearChange(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="eoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.1)" />
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(0)}jt` : v} tick={tickStyle} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<RevenueTooltip />} />
            <Legend
              formatter={v => <span style={{ color: '#c4b5fd', fontSize: 11 }}>{v === 'target' ? 'Target Revenue' : v}</span>}
              wrapperStyle={{ paddingTop: 8 }}
            />
            <Area type="monotone" dataKey="EO" stroke="#818cf8" strokeWidth={2} fill="url(#eoGrad)" dot={false} />
            <Area type="monotone" dataKey="PH" stroke="#a78bfa" strokeWidth={2} fill="url(#phGrad)" dot={false} />
            <Line type="monotone" dataKey="target" stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#fbbf24' }} name="target" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* === Tren Aktual Profit === */}
      <div className="card p-5" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2d2a6e 100%)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-bold text-white">Tren Aktual Profit</h3>
            <p className="text-xs text-violet-400">Jan {year} – Des {year}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setProfitView('total')}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${profitView === 'total' ? 'bg-violet-600 text-white' : 'bg-white/10 text-violet-300'}`}
            >Total</button>
            <button
              onClick={() => setProfitView('split')}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${profitView === 'split' ? 'bg-violet-600 text-white' : 'bg-white/10 text-violet-300'}`}
            >Detail</button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={profitTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.1)" />
            <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(0)}jt` : v} tick={tickStyle} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<ProfitTooltip />} />
            <Legend
              formatter={v => <span style={{ color: '#c4b5fd', fontSize: 11 }}>
                {v === 'target' ? 'Target Gross Profit' : v === 'aktual' ? 'Aktual' : 'Ekspektasi'}
              </span>}
              wrapperStyle={{ paddingTop: 8 }}
            />
            {profitView === 'total' ? (
              <>
                <Bar dataKey="aktual" fill="#22c55e" radius={[4, 4, 0, 0]} name="aktual" />
                <Bar dataKey="ekspektasi" fill="#818cf8" radius={[4, 4, 0, 0]} name="ekspektasi" />
              </>
            ) : (
              <>
                <Bar dataKey="aktual" fill="#22c55e" radius={[4, 4, 0, 0]} name="aktual" />
                <Bar dataKey="ekspektasi" fill="#6366f1" radius={[4, 4, 0, 0]} name="ekspektasi" />
              </>
            )}
            <Line type="monotone" dataKey="target" stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: '#fbbf24' }} name="target" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
