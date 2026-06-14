'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function ClientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [editId, setEditId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const load = () => {
    setLoading(true)
    fetch('/api/clients').then(r => r.ok ? r.json() : []).then(data => {
      setClients(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status])

  const startEdit = (c) => {
    setError('')
    setEditId(c.id)
    setEditValue(c.name)
  }

  const saveEdit = async () => {
    const value = editValue.trim()
    if (!value) { setError('Nama klien tidak boleh kosong'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/clients/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    })
    setSaving(false)
    if (res.ok) {
      setEditId(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menyimpan')
    }
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-400">Memuat...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Klien</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar nama klien yang tercatat di sistem. Pastikan nama klien diisi dengan benar
            (jangan tertukar dengan nama project) — perbaiki di sini jika ada kesalahan, perubahan
            akan otomatis berlaku untuk semua project terkait.
          </p>
        </div>

        <input
          className="input max-w-sm"
          placeholder="Cari nama klien..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                <th className="px-4 py-2.5">Nama Klien</th>
                <th className="px-4 py-2.5">Jumlah Project</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400 text-sm">Tidak ada klien ditemukan</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {editId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          className="input text-sm py-1"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null) }}
                        />
                        <button onClick={saveEdit} disabled={saving} className="text-xs text-brand-600 hover:underline shrink-0">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline shrink-0">Batal</button>
                      </div>
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c._count?.projects ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {editId !== c.id && (
                      <button onClick={() => startEdit(c)} className="text-xs text-brand-600 hover:underline">Edit Nama</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">
          Untuk mengubah nama klien di satu project saja (bukan klien secara umum), atau mengubah
          judul project, gunakan tombol ✏️ di halaman <Link href="/projects" className="text-brand-600 hover:underline">detail project</Link>.
        </p>
      </main>
    </div>
  )
}
