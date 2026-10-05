'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BackButton from '@/components/BackButton'

const GENDER_OPTIONS = [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]
const MARITAL_OPTIONS = [
  { value: 'SINGLE', label: 'Belum Menikah' },
  { value: 'MARRIED', label: 'Menikah' },
  { value: 'DIVORCED', label: 'Cerai' },
]
const EDU_OPTIONS = [
  { value: 'SD', label: 'SD' }, { value: 'SMP', label: 'SMP' }, { value: 'SMA', label: 'SMA/SMK' },
  { value: 'D1', label: 'D1' }, { value: 'D2', label: 'D2' }, { value: 'D3', label: 'D3' },
  { value: 'D4', label: 'D4' }, { value: 'S1', label: 'S1' }, { value: 'S2', label: 'S2' }, { value: 'S3', label: 'S3' },
]
const GENDER_LABEL = { L: 'Laki-laki', P: 'Perempuan', MALE: 'Laki-laki', FEMALE: 'Perempuan' }
const MARITAL_LABEL = { SINGLE: 'Belum Menikah', MARRIED: 'Menikah', DIVORCED: 'Cerai' }
const EDU_LABEL = { SD: 'SD', SMP: 'SMP', SMA: 'SMA/SMK', D1: 'D1', D2: 'D2', D3: 'D3', D4: 'D4', S1: 'S1', S2: 'S2', S3: 'S3' }
const DIVISI_LABEL = { FINANCE_HRGA: 'Finance & HRGA', EVENT: 'Event', PH: 'Post House', CREATIVE: 'Creative', MANAGEMENT: 'Management' }
const ROLE_LABEL = {
  OWNER: 'Owner', DIRECTOR: 'Director', PROJECT_MANAGER: 'Project Manager', PRODUCER: 'Producer',
  FINANCE: 'Finance', FINANCE_STAFF: 'Finance Staff', PRODUCTION: 'Production',
  STAGE_DESIGNER: 'Stage Designer', HRD: 'HRD', CONTENT_CREATOR: 'Content Creator',
  EDITOR: 'Editor', CREATIVE_LEAD: 'Creative Lead', DESIGNER: 'Designer',
  MOTION_DESIGNER: 'Motion Designer', MARKETING: 'Marketing', GA: 'General Affairs',
}

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function toInputDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().slice(0, 10)
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === '') return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-400 italic">–</p>
    </div>
  )
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

function FieldInput({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div className="py-1.5">
      <label className="label">{label}</label>
      <input
        type={type}
        name={name}
        className="input"
        value={value ?? ''}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function FieldSelect({ label, name, value, onChange, options }) {
  return (
    <div className="py-1.5">
      <label className="label">{label}</label>
      <select className="input" name={name} value={value ?? ''} onChange={e => onChange(name, e.target.value)}>
        <option value="">– Pilih –</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function FieldTextarea({ label, name, value, onChange, placeholder = '' }) {
  return (
    <div className="py-1.5">
      <label className="label">{label}</label>
      <textarea
        name={name}
        className="input"
        rows={2}
        value={value ?? ''}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' })

  // password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' })
  const [pwdSaving, setPwdSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      fetch('/api/profile/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setProfile(d) })
    }
  }, [status, router])

  function startEdit() {
    setForm({
      phone: profile?.phone ?? '',
      personalEmail: profile?.personalEmail ?? '',
      emergencyContact: profile?.emergencyContact ?? '',
      emergencyContactRel: profile?.emergencyContactRel ?? '',
      addressKtp: profile?.addressKtp ?? '',
      addressDomicili: profile?.addressDomicili ?? '',
      bankName: profile?.bankName ?? '',
      bankAccount: profile?.bankAccount ?? '',
      npwpNumber: profile?.npwpNumber ?? '',
      ktpNumber: profile?.ktpNumber ?? '',
      hobby: profile?.hobby ?? '',
      birthPlace: profile?.birthPlace ?? '',
      birthDate: toInputDate(profile?.birthDate),
      gender: profile?.gender ?? '',
      maritalStatus: profile?.maritalStatus ?? '',
      education: profile?.education ?? '',
      educationMajor: profile?.educationMajor ?? '',
      motherName: profile?.motherName ?? '',
      fatherName: profile?.fatherName ?? '',
      siblingCount: profile?.siblingCount ?? '',
    })
    setSaveMsg({ type: '', text: '' })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveMsg({ type: '', text: '' })
  }

  function handleChange(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function saveEdit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg({ type: '', text: '' })
    const res = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setProfile(updated)
      setEditing(false)
      setSaveMsg({ type: 'success', text: 'Profil berhasil disimpan' })
    } else {
      const d = await res.json().catch(() => ({}))
      setSaveMsg({ type: 'error', text: d.error || 'Gagal menyimpan profil' })
    }
  }

  async function submitPassword(e) {
    e.preventDefault()
    setPwdMsg({ type: '', text: '' })
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Konfirmasi password baru tidak sama' })
      return
    }
    setPwdSaving(true)
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setPwdSaving(false)
    if (res.ok) {
      setPwdMsg({ type: 'success', text: 'Password berhasil diubah' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      const d = await res.json().catch(() => ({}))
      setPwdMsg({ type: 'error', text: d.error || 'Gagal mengubah password' })
    }
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <main className="max-w-md mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-6 space-y-5">
        <BackButton />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
            <p className="text-sm text-gray-500 mt-0.5">{session.user.name} · {session.user.email}</p>
          </div>
          {!editing && profile && (
            <button onClick={startEdit} className="btn-secondary text-sm shrink-0">Edit Profil</button>
          )}
        </div>

        {/* Save message */}
        {saveMsg.text && !editing && (
          <p className={`text-sm rounded-lg px-3 py-2 ${saveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {saveMsg.text}
          </p>
        )}

        {/* Identitas Kerja — selalu read-only */}
        {profile && (
          <div className="card p-5 space-y-1">
            <h2 className="text-sm font-semibold text-ink-800 mb-2">Identitas Kerja</h2>
            <p className="text-[11px] text-gray-400 mb-2">Data ini dikelola oleh HR/Admin</p>
            <InfoRow label="NPK" value={profile.npk} />
            <InfoRow label="Jabatan" value={profile.jobTitle} />
            <InfoRow label="Role" value={ROLE_LABEL[profile.role] || profile.role} />
            <InfoRow label="Divisi" value={DIVISI_LABEL[profile.divisi] || profile.divisi} />
            <InfoRow label="Tanggal Bergabung" value={fmt(profile.joinDate)} />
          </div>
        )}

        {/* View mode */}
        {profile && !editing && (
          <>
            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-2">Data Pribadi</h2>
              <InfoRow label="Tempat Lahir" value={profile.birthPlace} />
              <InfoRow label="Tanggal Lahir" value={fmt(profile.birthDate)} />
              <InfoRow label="Jenis Kelamin" value={GENDER_LABEL[profile.gender] || profile.gender} />
              <InfoRow label="Status Pernikahan" value={MARITAL_LABEL[profile.maritalStatus] || profile.maritalStatus} />
              <InfoRow label="Pendidikan Terakhir" value={profile.educationMajor ? `${EDU_LABEL[profile.education] || profile.education} – ${profile.educationMajor}` : (EDU_LABEL[profile.education] || profile.education)} />
              <InfoRow label="Hobi" value={profile.hobby} />
            </div>

            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-2">Kontak</h2>
              <InfoRow label="No. HP" value={profile.phone} />
              <InfoRow label="Email Pribadi" value={profile.personalEmail} />
              <InfoRow label="Kontak Darurat" value={profile.emergencyContact ? `${profile.emergencyContact}${profile.emergencyContactRel ? ` (${profile.emergencyContactRel})` : ''}` : null} />
            </div>

            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-2">Alamat</h2>
              <InfoRow label="Alamat KTP" value={profile.addressKtp} />
              <InfoRow label="Alamat Domisili" value={profile.addressDomicili} />
            </div>

            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-2">Data Dokumen & Bank</h2>
              <InfoRow label="No. KTP" value={profile.ktpNumber} />
              <InfoRow label="No. NPWP" value={profile.npwpNumber} />
              <InfoRow label="Bank" value={profile.bankName} />
              <InfoRow label="No. Rekening" value={profile.bankAccount} />
            </div>

            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-2">Keluarga</h2>
              <InfoRow label="Nama Ibu" value={profile.motherName} />
              <InfoRow label="Nama Ayah" value={profile.fatherName} />
              <InfoRow label="Jumlah Saudara" value={profile.siblingCount !== null && profile.siblingCount !== undefined ? profile.siblingCount : null} />
            </div>
          </>
        )}

        {/* Edit mode */}
        {editing && (
          <form onSubmit={saveEdit} className="space-y-5">
            {/* Data Pribadi */}
            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-1">Data Pribadi</h2>
              <FieldInput label="Tempat Lahir" name="birthPlace" value={form.birthPlace} onChange={handleChange} />
              <FieldInput label="Tanggal Lahir" name="birthDate" value={form.birthDate} onChange={handleChange} type="date" />
              <FieldSelect label="Jenis Kelamin" name="gender" value={form.gender} onChange={handleChange} options={GENDER_OPTIONS} />
              <FieldSelect label="Status Pernikahan" name="maritalStatus" value={form.maritalStatus} onChange={handleChange} options={MARITAL_OPTIONS} />
              <FieldSelect label="Pendidikan Terakhir" name="education" value={form.education} onChange={handleChange} options={EDU_OPTIONS} />
              <FieldInput label="Jurusan / Program Studi" name="educationMajor" value={form.educationMajor} onChange={handleChange} placeholder="Contoh: Manajemen Komunikasi" />
              <FieldInput label="Hobi" name="hobby" value={form.hobby} onChange={handleChange} placeholder="Contoh: Membaca, Fotografi" />
            </div>

            {/* Kontak */}
            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-1">Kontak</h2>
              <FieldInput label="No. HP / WhatsApp" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="08xx-xxxx-xxxx" />
              <FieldInput label="Email Pribadi" name="personalEmail" value={form.personalEmail} onChange={handleChange} type="email" placeholder="email@pribadi.com" />
              <FieldInput label="Kontak Darurat (nama & no. HP)" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="Nama – 08xx-xxxx-xxxx" />
              <FieldInput label="Hubungan Kontak Darurat" name="emergencyContactRel" value={form.emergencyContactRel} onChange={handleChange} placeholder="Contoh: Ibu, Suami, Kakak" />
            </div>

            {/* Alamat */}
            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-1">Alamat</h2>
              <FieldTextarea label="Alamat KTP" name="addressKtp" value={form.addressKtp} onChange={handleChange} placeholder="Sesuai KTP" />
              <FieldTextarea label="Alamat Domisili" name="addressDomicili" value={form.addressDomicili} onChange={handleChange} placeholder="Alamat tempat tinggal sekarang" />
            </div>

            {/* Dokumen & Bank */}
            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-1">Data Dokumen & Bank</h2>
              <FieldInput label="No. KTP" name="ktpNumber" value={form.ktpNumber} onChange={handleChange} placeholder="16 digit NIK" />
              <FieldInput label="No. NPWP" name="npwpNumber" value={form.npwpNumber} onChange={handleChange} placeholder="XX.XXX.XXX.X-XXX.XXX" />
              <FieldInput label="Nama Bank" name="bankName" value={form.bankName} onChange={handleChange} placeholder="Contoh: BCA, Mandiri, BNI" />
              <FieldInput label="No. Rekening" name="bankAccount" value={form.bankAccount} onChange={handleChange} placeholder="Nomor rekening aktif" />
            </div>

            {/* Keluarga */}
            <div className="card p-5 space-y-1">
              <h2 className="text-sm font-semibold text-ink-800 mb-1">Keluarga</h2>
              <FieldInput label="Nama Ibu" name="motherName" value={form.motherName} onChange={handleChange} />
              <FieldInput label="Nama Ayah" name="fatherName" value={form.fatherName} onChange={handleChange} />
              <FieldInput label="Jumlah Saudara" name="siblingCount" value={form.siblingCount} onChange={handleChange} type="number" placeholder="0" />
            </div>

            {saveMsg.text && (
              <p className={`text-sm rounded-lg px-3 py-2 ${saveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg.text}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={cancelEdit} className="btn-secondary flex-1">Batal</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        )}

        {/* Ubah Password */}
        <form onSubmit={submitPassword} className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-ink-800">Ubah Password</h2>
          <div>
            <label className="label">Password Saat Ini</label>
            <input type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password Baru</label>
            <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            <p className="text-xs text-gray-400 mt-1">Minimal 6 karakter</p>
          </div>
          <div>
            <label className="label">Konfirmasi Password Baru</label>
            <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          {pwdMsg.text && (
            <p className={`text-sm ${pwdMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{pwdMsg.text}</p>
          )}
          <button className="btn-primary w-full" disabled={pwdSaving}>{pwdSaving ? 'Menyimpan...' : 'Simpan Password Baru'}</button>
        </form>
      </main>
    </div>
  )
}
