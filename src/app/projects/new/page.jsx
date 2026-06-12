'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { canViewAllProjects } from '@/lib/rbac'
import { CATEGORY_LABEL } from '@/lib/constants'
import Link from 'next/link'

export default function NewProjectPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', clientId: '', category: 'MEETING_CONFERENCE', budgetTier: 'MEDIUM',
    eventComplexity: 'MEDIUM', recommendation: 'MAINTAIN', picId: '', division: 'EVENT',
    briefDate: '', startDate: '', endDate: '', loadInDays: '', status: 'HOLD', pitchStatus: 'PITCH', notes: '', quotationNumber: '',
    applySopTemplate: true,
  })
  const [multiDay, setMultiDay] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canViewAllProjects(session.user.role)) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/clients').then(r => r.json()).then(setClients)
      fetch('/api/team').then(r => r.json()).then(setTeam)
    }
  }, [status])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const project = await res.json()
      router.push(`/projects/${project.id}`)
    } else {
      alert('Gagal membuat project')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="text-xl font-bold text-gray-900">Project Baru</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Nama Project *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nama event / project" />
          </div>

          <div>
            <label className="label">Nomor Quotation</label>
            <input className="input" value={form.quotationNumber} onChange={e => set('quotationNumber', e.target.value)} placeholder="Opsional, bisa diisi nanti" />
            <p className="text-xs text-gray-400 mt-1">Tidak wajib saat ini, tapi wajib diisi sebelum tim bisa mengajukan pembayaran untuk project ini.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select className="select" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                <option value="">Pilih client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">PIC</label>
              <select className="select" value={form.picId} onChange={e => set('picId', e.target.value)}>
                <option value="">Pilih PIC</option>
                {team.filter(u => ['PROJECT_MANAGER', 'OWNER'].includes(u.role)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kategori *</label>
              <select className="select" value={form.category} onChange={e => set('category', e.target.value)} required>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={form.applySopTemplate} onChange={e => set('applySopTemplate', e.target.checked)} />
                Terapkan SOP checklist standar untuk kategori ini
              </label>
            </div>
            <div>
              <label className="label">Budget Tier</label>
              <select className="select" value={form.budgetTier} onChange={e => set('budgetTier', e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kompleksitas Event</label>
              <select className="select" value={form.eventComplexity} onChange={e => set('eventComplexity', e.target.value)}>
                <option value="SIMPLE">Simple</option>
                <option value="MEDIUM">Medium</option>
                <option value="COMPLEX">Complex</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="label">Rekomendasi</label>
              <select className="select" value={form.recommendation} onChange={e => set('recommendation', e.target.value)}>
                <option value="MAINTAIN">👍 Maintain</option>
                <option value="PRIORITIZE">🔥 Prioritize</option>
                <option value="EVALUATE">⚠️ Evaluate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Divisi</label>
            <select className="select" value={form.division} onChange={e => set('division', e.target.value)}>
              <option value="EVENT">Event (EO)</option>
              <option value="PH">Production House</option>
              <option value="CREATIVE">Creative</option>
              <option value="FINANCE_HRGA">Finance / HR / GA</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tanggal Brief</label>
              <input type="date" className="input" value={form.briefDate} onChange={e => set('briefDate', e.target.value)} />
            </div>
            <div>
              <label className="label">{multiDay ? 'Tanggal Mulai' : 'Tanggal Event'}</label>
              <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
          </div>

          <div className="border border-gray-100 rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={multiDay} onChange={e => { setMultiDay(e.target.checked); if (!e.target.checked) { set('endDate', ''); set('loadInDays', '') } }} />
              Project / shooting berlangsung lebih dari 1 hari (termasuk loading & GR)
            </label>
            {multiDay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tanggal Selesai</label>
                  <input type="date" className="input" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </div>
                <div>
                  <label className="label">Jumlah Hari Loading / GR</label>
                  <input type="number" min="0" className="input" value={form.loadInDays} onChange={e => set('loadInDays', e.target.value)} placeholder="0" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="HOLD">Hold</option>
                <option value="PITCHING">Pitching</option>
              </select>
            </div>
            <div>
              <label className="label">Pitch Status</label>
              <select className="select" value={form.pitchStatus} onChange={e => set('pitchStatus', e.target.value)}>
                <option value="PITCH">Pitch</option>
                <option value="PITCH_PLUS">Pitch+</option>
                <option value="AUTO_WIN">Auto Win</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Catatan</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Catatan tambahan..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Buat Project'}
            </button>
            <Link href="/projects" className="btn-secondary">Batal</Link>
          </div>
        </form>
      </main>
    </div>
  )
}
