'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { canViewAllProjects } from '@/lib/rbac'
import { CATEGORY_LABEL, EO_CATEGORIES, PH_CATEGORIES } from '@/lib/constants'
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
    estimatedValue: '', quotationDeadline: '', quotationStatus: 'PENDING',
    applySopTemplate: true,
  })
  const [customCategory, setCustomCategory] = useState('')
  const [multiDay, setMultiDay] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canViewAllProjects(session.user.role)) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/clients?simple=1').then(r => r.json()).then(setClients)
      fetch('/api/team').then(r => r.json()).then(setTeam)
    }
  }, [status])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    // resolve custom category
    const finalCategory = form.category === '__CUSTOM__'
      ? customCategory.trim()
      : form.category
    if (!finalCategory) { alert('Kategori tidak boleh kosong'); return }
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, category: finalCategory }),
    })
    if (res.ok) {
      const project = await res.json()
      // Pass ?new=1 so project detail page shows the "Next Steps" banner
      router.push(`/projects/${project.id}?new=1`)
    } else {
      alert('Gagal membuat project')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-50">
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

          {/* ── Estimasi Nilai & Status Quotation ── */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-800">📄 Informasi Quotation</p>

            <div>
              <label className="label">Status Quotation *</label>
              <select className="select" value={form.quotationStatus} onChange={e => set('quotationStatus', e.target.value)}>
                <option value="READY">Quotation sudah ada / siap dilampirkan</option>
                <option value="PENDING">Quotation sedang disiapkan (menyusul)</option>
                <option value="NOT_NEEDED">Tidak perlu quotation (project internal / retainer)</option>
              </select>
            </div>

            {form.quotationStatus === 'READY' && (
              <div>
                <label className="label">Nomor Quotation</label>
                <input className="input" value={form.quotationNumber} onChange={e => set('quotationNumber', e.target.value)}
                  placeholder="WTM/EVENT/QUOT/2026/001" />
                <p className="text-xs text-gray-400 mt-1">Quotation yang sudah ada akan terhubung otomatis jika nomornya sesuai.</p>
              </div>
            )}

            {form.quotationStatus === 'PENDING' && (
              <div>
                <label className="label">Target Tanggal Kirim Quotation ke Klien *</label>
                <input type="date" className="input" value={form.quotationDeadline}
                  onChange={e => set('quotationDeadline', e.target.value)} required />
                <p className="text-xs text-amber-600 mt-1">⏰ Akan muncul sebagai reminder jika quotation belum dibuat melewati tanggal ini.</p>
              </div>
            )}

            <div>
              <label className="label">
                Estimasi Nilai Project (Rp)
                {form.quotationStatus !== 'READY' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <input type="number" className="input" value={form.estimatedValue}
                onChange={e => set('estimatedValue', e.target.value)}
                placeholder="Contoh: 150000000"
                required={form.quotationStatus !== 'READY'} />
              <p className="text-xs text-gray-400 mt-1">
                {form.quotationStatus === 'READY'
                  ? 'Opsional — akan otomatis terisi dari nilai quotation saat diimport ke budget.'
                  : 'Wajib diisi agar dashboard Overview Keuangan bisa menampilkan estimasi omset sejak awal.'}
              </p>
            </div>
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

          <div>
            <label className="label">Divisi</label>
            <select className="select" value={form.division} onChange={e => {
              const division = e.target.value
              const validCategories = division === 'EVENT' ? EO_CATEGORIES : division === 'PH' ? PH_CATEGORIES : EO_CATEGORIES
              const keepCat = validCategories.includes(form.category)
              setCustomCategory('')
              setForm(f => ({ ...f, division, category: keepCat ? f.category : validCategories[0] }))
            }}>
              <option value="EVENT">Event (EO)</option>
              <option value="PH">Production House</option>
              <option value="CREATIVE">Creative</option>
              <option value="FINANCE_HRGA">Finance / HR / GA</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kategori *</label>
              <select className="select" value={form.category} onChange={e => { set('category', e.target.value); setCustomCategory('') }} required>
                {(form.division === 'PH' ? PH_CATEGORIES : EO_CATEGORIES).map(k => (
                  <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
                ))}
                <option value="__CUSTOM__">+ Kategori lain (custom)…</option>
              </select>
              {form.category === '__CUSTOM__' && (
                <input
                  className="input mt-2 text-sm"
                  placeholder="Tulis nama kategori baru…"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  required
                />
              )}
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
