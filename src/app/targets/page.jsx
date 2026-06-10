'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { DIVISION_LABEL } from '@/lib/constants'

const DIVISIONS = ['EVENT', 'CREATIVE', 'PH', 'FINANCE_HRGA']
const VIEW_ROLES = ['OWNER', 'DIRECTOR', 'FINANCE']

function formatRupiah(n) {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
}

export default function TargetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !VIEW_ROLES.includes(session.user.role)) router.push('/dashboard')
  }, [status, session, router])

  const fetchData = () => {
    setLoading(true)
    fetch(`/api/targets?year=${year}`).then(r => r.ok ? r.json() : null).then(d => {
      setData(d)
      if (d) setForm(d.targets)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated' && VIEW_ROLES.includes(session.user.role)) fetchData()
  }, [status, session, year])

  if (status !== 'authenticated' || !VIEW_ROLES.includes(session?.user.role) || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    await fetch('/api/targets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, targets: form }),
    })
    setSaving(false)
    setEditing(false)
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Target Tahunan</h1>
            <p className="text-sm text-gray-500">Progress revenue & jumlah project per divisi</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="select w-auto" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {data.canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm">Edit Target</button>
            )}
            {editing && (
              <>
                <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                <button onClick={() => { setEditing(false); setForm(data.targets) }} className="btn-secondary text-sm">Batal</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIVISIONS.map(d => {
            const target = data.targets[d]
            const actual = data.actuals[d]
            const revenuePct = target.revenueTarget > 0 ? Math.min(100, (actual.revenue / target.revenueTarget) * 100) : 0
            const countPct = target.projectCountTarget > 0 ? Math.min(100, (actual.projectCount / target.projectCountTarget) * 100) : 0
            return (
              <div key={d} className="card p-4 hover:shadow-md transition-all duration-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{DIVISION_LABEL[d]}</h3>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Revenue (project menang)</span>
                    {!editing && <span>{formatRupiah(actual.revenue)} / {formatRupiah(target.revenueTarget)}</span>}
                  </div>
                  {editing ? (
                    <input
                      type="number" className="input text-sm"
                      value={form[d]?.revenueTarget ?? 0}
                      onChange={e => setForm(f => ({ ...f, [d]: { ...f[d], revenueTarget: e.target.value } }))}
                    />
                  ) : (
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${revenuePct}%` }} />
                    </div>
                  )}
                  {!editing && <p className="text-[10px] text-gray-400 mt-1">{revenuePct.toFixed(0)}% tercapai</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Jumlah Project Menang</span>
                    {!editing && <span>{actual.projectCount} / {target.projectCountTarget}</span>}
                  </div>
                  {editing ? (
                    <input
                      type="number" className="input text-sm"
                      value={form[d]?.projectCountTarget ?? 0}
                      onChange={e => setForm(f => ({ ...f, [d]: { ...f[d], projectCountTarget: e.target.value } }))}
                    />
                  ) : (
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${countPct}%` }} />
                    </div>
                  )}
                  {!editing && <p className="text-[10px] text-gray-400 mt-1">{countPct.toFixed(0)}% tercapai</p>}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
