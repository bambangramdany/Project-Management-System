'use client'
import { Fragment, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

const EMPTY_CONTACT = { name: '', jobTitle: '', email: '', phone: '', address: '', religion: '', notes: '' }

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
  const [deleteError, setDeleteError] = useState({}) // { [clientId]: errorMsg }
  const [expandedId, setExpandedId] = useState(null)
  const [contactForm, setContactForm] = useState(null) // { clientId, contactId|null, ...EMPTY_CONTACT }
  const [newClientName, setNewClientName] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null) // inline confirm state
  const [confirmDeleteContactId, setConfirmDeleteContactId] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const load = () => {
    setLoading(true)
    fetch('/api/clients', { cache: 'no-store' }).then(r => r.ok ? r.json() : []).then(data => {
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

  const toggleExpand = (id) => {
    setContactForm(null)
    setExpandedId(expandedId === id ? null : id)
  }

  const startAddContact = (clientId) => {
    setContactForm({ clientId, contactId: null, ...EMPTY_CONTACT })
  }

  const startEditContact = (clientId, contact) => {
    setContactForm({
      clientId, contactId: contact.id,
      name: contact.name || '', jobTitle: contact.jobTitle || '', email: contact.email || '',
      phone: contact.phone || '', address: contact.address || '', religion: contact.religion || '', notes: contact.notes || '',
    })
  }

  const saveContact = async () => {
    if (!contactForm.name.trim()) { alert('Nama PIC tidak boleh kosong'); return }
    setSaving(true)
    const { clientId, contactId, ...fields } = contactForm
    const url = contactId ? `/api/client-contacts/${contactId}` : `/api/clients/${clientId}/contacts`
    const res = await fetch(url, {
      method: contactId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setSaving(false)
    if (res.ok) {
      setContactForm(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Gagal menyimpan')
    }
  }

  const addClient = async () => {
    const value = newClientName.trim()
    if (!value) return
    setAddingClient(true)
    setError('')
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: value }),
    })
    setAddingClient(false)
    if (res.ok) {
      setNewClientName('')
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Gagal menambahkan klien')
    }
  }

  const deleteClient = async (c) => {
    setError('')
    setDeleteError(prev => ({ ...prev, [c.id]: null }))
    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE', cache: 'no-store' })
    if (res.ok) {
      setConfirmDeleteId(null)
      load()
    } else if (res.status === 404) {
      setConfirmDeleteId(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      const msg = d.error || 'Gagal menghapus klien'
      setDeleteError(prev => ({ ...prev, [c.id]: msg }))
    }
  }

  const deleteContact = async (contactId) => {
    const res = await fetch(`/api/client-contacts/${contactId}`, { method: 'DELETE' })
    setConfirmDeleteContactId(null)
    if (res.ok) load()
    else alert('Gagal menghapus')
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-brand-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-400">Memuat...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Klien</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daftar nama klien yang tercatat di sistem. Pastikan nama klien diisi dengan benar
            (jangan tertukar dengan nama project) — perbaiki di sini jika ada kesalahan, perubahan
            akan otomatis berlaku untuk semua project terkait. Klik nama klien untuk melihat dan
            mengelola kontak PIC.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input max-w-sm"
            placeholder="Cari nama klien..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              className="input max-w-sm"
              placeholder="Nama klien baru..."
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addClient() }}
            />
            <button onClick={addClient} disabled={addingClient || !newClientName.trim()} className="btn-primary text-sm px-3 py-2 shrink-0">
              {addingClient ? 'Menambah...' : '+ Tambah Klien'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="card overflow-x-auto">
          <div className="min-w-[480px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="px-4 py-2.5">Nama Klien</th>
                  <th className="px-4 py-2.5">Jumlah Project</th>
                  <th className="px-4 py-2.5">PIC</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Tidak ada klien ditemukan</td></tr>
                )}
                {filtered.map(c => (
                  <Fragment key={c.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50">
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
                          <button onClick={() => toggleExpand(c.id)} className="text-left hover:text-brand-600 flex items-center gap-2 group">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-sm shrink-0 transition-colors ${expandedId === c.id ? 'bg-brand-100 border-brand-300 text-brand-600' : 'border-gray-300 text-gray-400 group-hover:border-brand-300 group-hover:text-brand-600'}`}>
                              {expandedId === c.id ? '−' : '+'}
                            </span>
                            {c.name}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c._count?.projects ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500">{c.contacts?.length || 0}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {editId !== c.id && (
                          confirmDeleteId === c.id ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs text-gray-500">Yakin hapus?</span>
                                <button
                                  onClick={() => deleteClient(c)}
                                  className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                                >Ya, Hapus</button>
                                <button
                                  onClick={() => { setConfirmDeleteId(null); setDeleteError(prev => ({ ...prev, [c.id]: null })) }}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >Batal</button>
                              </span>
                              {deleteError[c.id] && (
                                <p className="text-[10px] text-red-600 text-right max-w-[220px] leading-tight">{deleteError[c.id]}</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-3">
                              <button onClick={() => startEdit(c)} className="text-xs text-brand-600 hover:underline py-1">Edit Nama</button>
                              <button
                                onClick={() => setConfirmDeleteId(c.id)}
                                className="text-xs text-red-500 hover:underline py-1"
                              >Hapus</button>
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                    {expandedId === c.id && (
                      <tr className="bg-gray-50/60 border-b border-gray-100">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="space-y-2">
                            {c.contacts?.length === 0 && !contactForm && (
                              <p className="text-xs text-gray-400">Belum ada data PIC untuk klien ini.</p>
                            )}
                            {c.contacts?.map(contact => (
                              contactForm?.contactId === contact.id ? (
                                <ContactFormBlock key={contact.id} form={contactForm} setForm={setContactForm} onSave={saveContact} onCancel={() => setContactForm(null)} saving={saving} />
                              ) : (
                                <div key={contact.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white border border-gray-100">
                                  <div className="text-xs text-gray-600 space-y-0.5">
                                    <p className="text-sm font-semibold text-gray-800">{contact.name}{contact.jobTitle && <span className="text-gray-400 font-normal"> · {contact.jobTitle}</span>}</p>
                                    {contact.email && <p>Email: {contact.email}</p>}
                                    {contact.phone && <p>Telp: {contact.phone}</p>}
                                    {contact.address && <p>Alamat: {contact.address}</p>}
                                    {contact.religion && <p>Agama: {contact.religion}</p>}
                                    {contact.notes && <p className="text-gray-400">Catatan: {contact.notes}</p>}
                                  </div>
                                  <div className="flex flex-col gap-1 shrink-0 text-xs">
                                    <button onClick={() => startEditContact(c.id, contact)} className="text-brand-600 hover:underline">Edit</button>
                                    {confirmDeleteContactId === contact.id ? (
                                      <span className="inline-flex items-center gap-1">
                                        <button onClick={() => deleteContact(contact.id)} className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px]">Ya</button>
                                        <button onClick={() => setConfirmDeleteContactId(null)} className="text-gray-400 hover:underline text-[10px]">Batal</button>
                                      </span>
                                    ) : (
                                      <button onClick={() => setConfirmDeleteContactId(contact.id)} className="text-red-500 hover:underline">Hapus</button>
                                    )}
                                  </div>
                                </div>
                              )
                            ))}
                            {contactForm?.clientId === c.id && contactForm.contactId === null && (
                              <ContactFormBlock form={contactForm} setForm={setContactForm} onSave={saveContact} onCancel={() => setContactForm(null)} saving={saving} />
                            )}
                            {!(contactForm?.clientId === c.id) && (
                              <button onClick={() => startAddContact(c.id)} className="text-xs text-brand-600 hover:underline">+ Tambah PIC</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Untuk mengubah nama klien di satu project saja (bukan klien secara umum), atau mengubah
          judul project, gunakan tombol ✏️ di halaman <Link href="/projects" className="text-brand-600 hover:underline">detail project</Link>.
        </p>
      </main>
    </div>
  )
}

function ContactFormBlock({ form, setForm, onSave, onCancel, saving }) {
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  return (
    <div className="p-3 rounded-lg bg-white border border-brand-200 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Nama PIC</label>
          <input className="input text-sm" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nama lengkap" />
        </div>
        <div>
          <label className="label">Jabatan</label>
          <input className="input text-sm" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="opsional" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input text-sm" value={form.email} onChange={e => set('email', e.target.value)} placeholder="opsional" />
        </div>
        <div>
          <label className="label">No. Telepon</label>
          <input className="input text-sm" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="opsional" />
        </div>
      </div>
      <div>
        <label className="label">Alamat</label>
        <input className="input text-sm" value={form.address} onChange={e => set('address', e.target.value)} placeholder="opsional" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Agama (untuk bingkisan hari raya)</label>
          <input className="input text-sm" value={form.religion} onChange={e => set('religion', e.target.value)} placeholder="opsional" />
        </div>
        <div>
          <label className="label">Catatan</label>
          <input className="input text-sm" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="opsional" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5">{saving ? 'Menyimpan...' : 'Simpan'}</button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:underline">Batal</button>
      </div>
    </div>
  )
}
