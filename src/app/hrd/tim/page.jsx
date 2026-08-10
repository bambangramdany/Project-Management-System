'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const DIVISI_LABEL = { EVENT: 'Event Organizer', PH: 'Production House', CREATIVE: 'Creative', FINANCE_HRGA: 'Finance & HRGA', MARKETING: 'Marketing' }
const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'PRODUCER', label: 'Producer' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'FINANCE_STAFF', label: 'Finance Staff' },
  { value: 'DIRECTOR', label: 'Director' },
]

function toInputDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FieldRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-gray-700 break-words min-w-0">{value}</span>
    </div>
  )
}

// ── Shared form fields used by both Edit and New modals ──────────────────────
function EmployeeFormFields({ form, set, isNew }) {
  const inp = 'border border-gray-200 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:border-brand-400'

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identitas Utama</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 block mb-1">NPK</label><input className={inp} value={form.npk} onChange={e => set('npk', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Nama Lengkap *</label><input className={inp} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Email Login *</label><input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="xxx@watermark.co.id" /></div>
          {isNew && <div><label className="text-xs text-gray-500 block mb-1">Password Awal</label><input className={inp} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Default: watermark2026" /></div>}
          <div><label className="text-xs text-gray-500 block mb-1">Jabatan</label><input className={inp} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Divisi</label>
            <select className={inp} value={form.divisi} onChange={e => set('divisi', e.target.value)}>
              <option value="">— Pilih —</option>
              {Object.entries(DIVISI_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Role Sistem</label>
            <select className={inp} value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Jenis Kelamin</label>
            <select className={inp} value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">— Pilih —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Pribadi</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 block mb-1">Tempat Lahir</label><input className={inp} value={form.birthPlace} onChange={e => set('birthPlace', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Tanggal Lahir</label><input type="date" className={inp} value={form.birthDate} onChange={e => set('birthDate', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Status Pernikahan</label><input className={inp} value={form.maritalStatus} onChange={e => set('maritalStatus', e.target.value)} placeholder="Belum Menikah / Menikah" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Pendidikan Terakhir</label><input className={inp} value={form.education} onChange={e => set('education', e.target.value)} placeholder="S1, D3, SMA…" /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500 block mb-1">Jurusan</label><input className={inp} value={form.educationMajor} onChange={e => set('educationMajor', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Nama Ibu Kandung</label><input className={inp} value={form.motherName} onChange={e => set('motherName', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Nama Ayah Kandung</label><input className={inp} value={form.fatherName} onChange={e => set('fatherName', e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="text-xs text-gray-500 block mb-1">Hobi</label><input className={inp} value={form.hobby} onChange={e => set('hobby', e.target.value)} /></div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Kontak & Kepegawaian</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 block mb-1">No. HP Kerja</label><input className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Email Pribadi</label><input className={inp} type="email" value={form.personalEmail} onChange={e => set('personalEmail', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Tanggal Masuk Kerja</label><input type="date" className={inp} value={form.joinDate} onChange={e => set('joinDate', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Kontak Darurat</label><input className={inp} value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Hubungan Kontak Darurat</label><input className={inp} value={form.emergencyContactRel} onChange={e => set('emergencyContactRel', e.target.value)} /></div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dokumen & Bank</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500 block mb-1">No. KTP</label><input className={inp} value={form.ktpNumber} onChange={e => set('ktpNumber', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">No. NPWP</label><input className={inp} value={form.npwpNumber} onChange={e => set('npwpNumber', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Bank</label><input className={inp} value={form.bankName} onChange={e => set('bankName', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">No. Rekening</label><input className={inp} value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} /></div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Alamat</p>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-500 block mb-1">Alamat KTP</label><textarea rows={2} className={inp + ' resize-none'} value={form.addressKtp} onChange={e => set('addressKtp', e.target.value)} /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Alamat Domisili</label><textarea rows={2} className={inp + ' resize-none'} value={form.addressDomicili} onChange={e => set('addressDomicili', e.target.value)} /></div>
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'MEMBER', jobTitle: '', divisi: '',
  gender: '', npk: '', birthPlace: '', birthDate: '', joinDate: '',
  maritalStatus: '', education: '', educationMajor: '',
  personalEmail: '', emergencyContact: '', emergencyContactRel: '',
  bankName: '', bankAccount: '', ktpNumber: '', npwpNumber: '',
  addressKtp: '', addressDomicili: '', hobby: '', motherName: '', fatherName: '',
}

function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    name: user.name || '', email: user.email || '', role: user.role || 'MEMBER',
    jobTitle: user.jobTitle || '', divisi: user.divisi || '', gender: user.gender || '',
    npk: user.npk || '', birthPlace: user.birthPlace || '',
    birthDate: toInputDate(user.birthDate), joinDate: toInputDate(user.joinDate),
    maritalStatus: user.maritalStatus || '', education: user.education || '',
    educationMajor: user.educationMajor || '', personalEmail: user.personalEmail || '',
    phone: user.phone || '', emergencyContact: user.emergencyContact || '',
    emergencyContactRel: user.emergencyContactRel || '', bankName: user.bankName || '',
    bankAccount: user.bankAccount || '', ktpNumber: user.ktpNumber || '',
    npwpNumber: user.npwpNumber || '', addressKtp: user.addressKtp || '',
    addressDomicili: user.addressDomicili || '', hobby: user.hobby || '',
    motherName: user.motherName || '', fatherName: user.fatherName || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/team/members/${user.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, birthDate: form.birthDate || null, joinDate: form.joinDate || null }),
      })
      if (res.ok) { onSaved(); onClose() }
      else { const d = await res.json(); setError(d.error || 'Gagal menyimpan') }
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Edit Data: {user.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="p-5">
          <EmployeeFormFields form={form} set={set} isNew={false} />
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline text-sm py-1.5 px-4">Batal</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40">{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  )
}

function NewEmployeeModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name.trim()) { setError('Nama wajib diisi'); return }
    if (!form.email.trim()) { setError('Email login wajib diisi'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, birthDate: form.birthDate || null, joinDate: form.joinDate || null }),
      })
      if (res.ok) { onSaved(); onClose() }
      else { const d = await res.json(); setError(d.error || 'Gagal menyimpan') }
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Tambah Karyawan Baru</h2>
            <p className="text-xs text-gray-400 mt-0.5">Data tersimpan & akun langsung bisa digunakan untuk login</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="p-5">
          <EmployeeFormFields form={form} set={set} isNew={true} />
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline text-sm py-1.5 px-4">Batal</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40">{saving ? 'Menyimpan...' : '+ Tambah Karyawan'}</button>
        </div>
      </div>
    </div>
  )
}

function MemberCard({ user, onEdit }) {
  const completeness = [
    user.npk, user.birthDate, user.gender, user.joinDate,
    user.phone, user.personalEmail, user.maritalStatus,
    user.education, user.ktpNumber, user.bankName, user.bankAccount,
  ].filter(Boolean).length
  const pct = Math.round((completeness / 11) * 100)

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {user.npk && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{user.npk}</span>}
            <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
            {user.gender && <span className="text-xs text-gray-400">{user.gender === 'L' ? '♂' : '♀'}</span>}
          </div>
          <p className="text-xs text-gray-500">{user.jobTitle} · {DIVISI_LABEL[user.divisi] || user.divisi || '—'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div title={`Data ${pct}% lengkap`} className="hidden sm:flex items-center gap-1">
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-400">{pct}%</span>
          </div>
          <button onClick={() => onEdit(user)} className="text-xs btn-outline py-1 px-2.5">Edit</button>
        </div>
      </div>

      <div className="space-y-1 pt-1 border-t border-gray-50">
        <FieldRow label="Tanggal Lahir" value={user.birthDate ? `${user.birthPlace ? user.birthPlace + ', ' : ''}${formatDate(user.birthDate)}` : null} />
        <FieldRow label="Masuk Kerja" value={user.joinDate ? formatDate(user.joinDate) : null} />
        <FieldRow label="Status Menikah" value={user.maritalStatus} />
        <FieldRow label="Pendidikan" value={user.education ? `${user.education}${user.educationMajor ? ' — ' + user.educationMajor : ''}` : null} />
        <FieldRow label="No. HP" value={user.phone} />
        <FieldRow label="Email Pribadi" value={user.personalEmail} />
        <FieldRow label="Kontak Darurat" value={user.emergencyContact ? `${user.emergencyContact}${user.emergencyContactRel ? ` (${user.emergencyContactRel})` : ''}` : null} />
        <FieldRow label="Bank / Rekening" value={user.bankName ? `${user.bankName}${user.bankAccount ? ' · ' + user.bankAccount : ''}` : null} />
        <FieldRow label="No. KTP" value={user.ktpNumber} />
        <FieldRow label="No. NPWP" value={user.npwpNumber} />
        {user.addressKtp && <FieldRow label="Alamat KTP" value={user.addressKtp} />}
        <FieldRow label="Hobi" value={user.hobby} />
        <FieldRow label="Ibu Kandung" value={user.motherName} />
        <FieldRow label="Ayah Kandung" value={user.fatherName} />
      </div>
    </div>
  )
}

export default function HrdTimPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [search, setSearch] = useState('')
  const [divisiFilter, setDivisiFilter] = useState('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated') {
      const u = session.user
      if (!u?.canHrdEvaluate && u?.role !== 'OWNER') router.push('/')
    }
  }, [status, session, router])

  const load = useCallback(() => {
    fetch('/api/team/members').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setMembers(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  if (status !== 'authenticated') return null

  const divisis = ['ALL', ...Object.keys(DIVISI_LABEL)]
  const filtered = members.filter(m => {
    if (divisiFilter !== 'ALL' && m.divisi !== divisiFilter) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !(m.jobTitle || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalComplete = members.filter(m =>
    [m.npk, m.birthDate, m.phone, m.ktpNumber, m.bankAccount].filter(Boolean).length >= 4
  ).length

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {addingNew && <NewEmployeeModal onClose={() => setAddingNew(false)} onSaved={load} />}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Data Karyawan</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {members.length} karyawan aktif · {totalComplete} data lengkap
            </p>
          </div>
          <button onClick={() => setAddingNew(true)} className="btn-primary text-sm py-2 px-4 flex-shrink-0">
            + Karyawan Baru
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input placeholder="Cari nama atau jabatan…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400" />
          <div className="flex gap-1.5 flex-wrap">
            {divisis.map(d => (
              <button key={d} onClick={() => setDivisiFilter(d)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${divisiFilter === d ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {d === 'ALL' ? 'Semua' : DIVISI_LABEL[d] || d}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Memuat data…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {filtered.map(m => <MemberCard key={m.id} user={m} onEdit={setEditing} />)}
          </div>
        )}
      </main>
    </div>
  )
}
