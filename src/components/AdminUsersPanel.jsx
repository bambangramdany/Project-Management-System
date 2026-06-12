'use client'
import { useEffect, useState } from 'react'
import { DIVISION_LABEL } from '@/lib/constants'

const ROLE_LABEL = {
  OWNER: 'Direktur Utama', PROJECT_MANAGER: 'Project Manager', PRODUCTION: 'Production',
  PROJECT_OFFICER: 'Project Officer', CREATIVE_LEAD: 'Creative Lead',
  GRAPHIC_DESIGNER: 'Graphic Designer', STAGE_DESIGNER: 'Stage Designer',
  CONTENT_CREATOR: 'Content Creator', INTERNSHIP: 'Internship', MEMBER: 'Member',
  DIRECTOR: 'Director', FINANCE: 'Finance',
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'MEMBER', divisi: '', jobTitle: '', phone: '' }

export default function AdminUsersPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [resetPasswordId, setResetPasswordId] = useState(null)
  const [resetPassword, setResetPassword] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/users').then(r => r.ok ? r.json() : []).then(d => {
      setUsers(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Nama, email, dan password wajib diisi')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, divisi: form.divisi || null }),
    })
    setSubmitting(false)
    if (res.ok) {
      setForm(EMPTY_FORM)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal membuat akun')
    }
  }

  const startEdit = (u) => {
    setEditId(u.id)
    setEditForm({ name: u.name, role: u.role, divisi: u.divisi || '', jobTitle: u.jobTitle || '', phone: u.phone || '', employeeStatus: u.employeeStatus })
  }

  const saveEdit = async (id) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, divisi: editForm.divisi || null }),
    })
    if (res.ok) {
      setEditId(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menyimpan')
    }
  }

  const moveUser = async (u, direction) => {
    const group = users.filter(x => x.divisi === u.divisi && x.employeeStatus === 'ACTIVE')
    const idx = group.findIndex(x => x.id === u.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= group.length) return
    const a = group[idx], b = group[swapIdx]
    await Promise.all([
      fetch(`/api/admin/users/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamOrder: swapIdx }) }),
      fetch(`/api/admin/users/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamOrder: idx }) }),
    ])
    // Make sure the rest of the group has sequential order values too
    await Promise.all(group.map((x, i) => {
      if (x.id === a.id || x.id === b.id) return null
      if (x.teamOrder === i) return null
      return fetch(`/api/admin/users/${x.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamOrder: i }) })
    }))
    load()
  }

  const loginAs = async (u) => {
    if (!confirm(`Masuk sebagai ${u.name}? Anda bisa kembali ke akun sendiri kapan saja lewat tombol di navbar.`)) return
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id }),
    })
    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal masuk sebagai user ini')
    }
  }

  const removeUser = async (u) => {
    if (!confirm(`Hapus akun ${u.name} secara permanen? Tindakan ini tidak bisa dibatalkan. Jika akun ini sudah resign tapi punya riwayat project/task, sebaiknya set status "Tidak Aktif" saja.`)) return
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    if (res.ok) {
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menghapus akun')
    }
  }

  const submitResetPassword = async (id) => {
    if (resetPassword.length < 6) { alert('Password minimal 6 karakter'); return }
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: resetPassword }),
    })
    if (res.ok) {
      setResetPasswordId(null)
      setResetPassword('')
      alert('Password berhasil direset')
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal reset password')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 border-t-4 border-blue-400">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tambah Akun Baru</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nama Lengkap</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="contoh: Budi Santoso" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="budi@watermark.co.id" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Password Awal</label>
              <input type="text" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="minimal 6 karakter" />
            </div>
            <div>
              <label className="label">Jabatan</label>
              <input className="input" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="opsional" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Divisi</label>
              <select className="select" value={form.divisi} onChange={e => setForm(f => ({ ...f, divisi: e.target.value }))}>
                <option value="">- Tidak ada -</option>
                {Object.entries(DIVISION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">No. HP</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="opsional" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Menyimpan...' : '+ Buat Akun'}</button>
        </form>
      </div>

      <div className="card overflow-x-auto border-t-4 border-orange-400">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
              <th className="px-4 py-2.5">Nama</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Divisi</th>
              <th className="px-4 py-2.5">Jabatan</th>
              <th className="px-4 py-2.5">No. HP</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Urutan</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">Memuat...</td></tr>
            )}
            {!loading && users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                {editId === u.id ? (
                  <>
                    <td className="px-4 py-3">
                      <input className="input text-xs" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <select className="select text-xs" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                        {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select className="select text-xs" value={editForm.divisi} onChange={e => setEditForm(f => ({ ...f, divisi: e.target.value }))}>
                        <option value="">-</option>
                        {Object.entries(DIVISION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input className="input text-xs" value={editForm.jobTitle} onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))} />
                    </td>
                    <td className="px-4 py-3">
                      <input className="input text-xs" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                    </td>
                    <td className="px-4 py-3">
                      <select className="select text-xs" value={editForm.employeeStatus} onChange={e => setEditForm(f => ({ ...f, employeeStatus: e.target.value }))}>
                        <option value="ACTIVE">Aktif</option>
                        <option value="NOT_ACTIVE">Non-aktif</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">-</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => saveEdit(u.id)} className="text-xs text-brand-600 hover:underline">Simpan</button>
                      <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-gray-700">{ROLE_LABEL[u.role] || u.role}</td>
                    <td className="px-4 py-3 text-gray-700">{u.divisi ? DIVISION_LABEL[u.divisi] : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.jobTitle || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.employeeStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.employeeStatus === 'ACTIVE' ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.divisi && u.employeeStatus === 'ACTIVE' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveUser(u, -1)} title="Naikkan urutan" className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-brand-600 border border-gray-200 rounded">↑</button>
                          <button onClick={() => moveUser(u, 1)} title="Turunkan urutan" className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-brand-600 border border-gray-200 rounded">↓</button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => startEdit(u)} className="text-xs text-brand-600 hover:underline">Edit</button>
                      <button onClick={() => { setResetPasswordId(resetPasswordId === u.id ? null : u.id); setResetPassword('') }} className="text-xs text-gray-400 hover:underline">Reset Password</button>
                      {u.role !== 'OWNER' && (
                        <button onClick={() => loginAs(u)} className="text-xs text-amber-600 hover:underline">Login sebagai</button>
                      )}
                      {u.role !== 'OWNER' && (
                        <button onClick={() => removeUser(u)} className="text-xs text-red-500 hover:underline">Hapus</button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!loading && users.map(u => resetPasswordId === u.id && (
              <tr key={u.id + '-reset'} className="bg-gray-50 border-b border-gray-100">
                <td colSpan={9} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Reset password untuk {u.name}:</span>
                    <input type="text" className="input text-xs w-48" placeholder="password baru (min 6 karakter)" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                    <button onClick={() => submitResetPassword(u.id)} className="btn-primary text-xs px-3 py-1.5">Simpan</button>
                    <button onClick={() => setResetPasswordId(null)} className="text-xs text-gray-400 hover:underline">Batal</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
