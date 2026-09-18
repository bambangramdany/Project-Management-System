'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import BackButton from '@/components/BackButton'

const GENDER_LABEL = { MALE: 'Laki-laki', FEMALE: 'Perempuan' }
const MARITAL_LABEL = { SINGLE: 'Belum Menikah', MARRIED: 'Menikah', DIVORCED: 'Cerai' }
const EDU_LABEL = { SD: 'SD', SMP: 'SMP', SMA: 'SMA/SMK', D1: 'D1', D2: 'D2', D3: 'D3', D4: 'D4', S1: 'S1', S2: 'S2', S3: 'S3' }
const DIVISI_LABEL = { FINANCE_HRGA: 'Finance & HRGA', EVENT: 'Event', PH: 'Post House', CREATIVE: 'Creative', MANAGEMENT: 'Management' }
const ROLE_LABEL = {
  OWNER: 'Owner', DIRECTOR: 'Director', PROJECT_MANAGER: 'Project Manager', PRODUCER: 'Producer',
  FINANCE: 'Finance', FINANCE_STAFF: 'Finance Staff', PRODUCTION: 'Production',
  STAGE_DESIGNER: 'Stage Designer', HRD: 'HRD',
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card p-5 space-y-1">
      <h2 className="text-sm font-semibold text-ink-800 mb-2">{title}</h2>
      {children}
    </div>
  )
}

function fmt(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      fetch('/api/profile/me').then(r => r.ok ? r.json() : null).then(d => { if (d) setProfile(d) })
    }
  }, [status, router])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak sama')
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess('Password berhasil diubah')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal mengubah password')
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
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.name} · {session.user.email}</p>
        </div>

        {profile && (
          <>
            <Section title="Identitas Kerja">
              <InfoRow label="NPK" value={profile.npk} />
              <InfoRow label="Jabatan" value={profile.jobTitle} />
              <InfoRow label="Role" value={ROLE_LABEL[profile.role] || profile.role} />
              <InfoRow label="Divisi" value={DIVISI_LABEL[profile.divisi] || profile.divisi} />
              <InfoRow label="Tanggal Bergabung" value={fmt(profile.joinDate)} />
            </Section>

            <Section title="Data Pribadi">
              <InfoRow label="Tempat Lahir" value={profile.birthPlace} />
              <InfoRow label="Tanggal Lahir" value={fmt(profile.birthDate)} />
              <InfoRow label="Jenis Kelamin" value={GENDER_LABEL[profile.gender] || profile.gender} />
              <InfoRow label="Status Pernikahan" value={MARITAL_LABEL[profile.maritalStatus] || profile.maritalStatus} />
              <InfoRow label="Pendidikan Terakhir" value={profile.educationMajor ? `${EDU_LABEL[profile.education] || profile.education} – ${profile.educationMajor}` : (EDU_LABEL[profile.education] || profile.education)} />
              <InfoRow label="Hobi" value={profile.hobby} />
            </Section>

            <Section title="Kontak">
              <InfoRow label="No. HP" value={profile.phone} />
              <InfoRow label="Email Pribadi" value={profile.personalEmail} />
              <InfoRow label="Kontak Darurat" value={profile.emergencyContact ? `${profile.emergencyContact} (${profile.emergencyContactRel || '–'})` : null} />
            </Section>

            <Section title="Alamat">
              <InfoRow label="Alamat KTP" value={profile.addressKtp} />
              <InfoRow label="Alamat Domisili" value={profile.addressDomicili} />
            </Section>

            <Section title="Data Dokumen & Bank">
              <InfoRow label="No. KTP" value={profile.ktpNumber} />
              <InfoRow label="No. NPWP" value={profile.npwpNumber} />
              <InfoRow label="Bank" value={profile.bankName} />
              <InfoRow label="No. Rekening" value={profile.bankAccount} />
            </Section>

            <Section title="Keluarga">
              <InfoRow label="Nama Ibu" value={profile.motherName} />
              <InfoRow label="Nama Ayah" value={profile.fatherName} />
              <InfoRow label="Jumlah Saudara" value={profile.siblingCount !== null ? profile.siblingCount : null} />
            </Section>
          </>
        )}

        <form onSubmit={submit} className="card p-5 space-y-3">
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Password Baru'}</button>
        </form>
      </main>
    </div>
  )
}
