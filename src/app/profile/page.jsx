'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-md mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-400 text-center py-8">Memuat...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-md mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
          <p className="text-sm text-gray-500 mt-1">{session.user.name} · {session.user.email}</p>
        </div>

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
