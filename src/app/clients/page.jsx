'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { CATEGORY_LABEL, DIVISION_LABEL } from '@/lib/constants'

const fmtRp = n => n == null || n === 0 ? '–' : `Rp ${(n / 1_000_000).toFixed(0)} jt`
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'

const STATUS_COLOR = {
  HOLD: 'bg-gray-100 text-gray-500',
  PITCHING: 'bg-blue-100 text-blue-700',
  WAITING_PITCH_RESULT: 'bg-yellow-100 text-yellow-700',
  PREPARATION: 'bg-orange-100 text-orange-700',
  EVENT_DAY: 'bg-purple-100 text-purple-700',
  REPORTING: 'bg-indigo-100 text-indigo-700',
  INVOICING: 'bg-teal-100 text-teal-700',
  DONE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-slate-100 text-slate-500',
}
const STATUS_LABEL = { HOLD: 'Hold', PITCHING: 'Pitching', WAITING_PITCH_RESULT: 'Waiting', PREPARATION: 'Preparation', EVENT_DAY: 'Event Day', REPORTING: 'Reporting', INVOICING: 'Invoicing', DONE: 'Done', FAILED: 'Failed', CANCELED: 'Canceled' }

const EMPTY = { name: '', industry: '', contact: '', phone: '', email: '', website: '', address: '', npwp: '', notes: '' }
const EMPTY_CONTACT = { name: '', jobTitle: '', email: '', phone: '', address: '', religion: '', notes: '' }

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [contactForm, setContactForm] = useState(null)
  const [activeTab, setActiveTab] = useState({}) // clientId → 'info'|'projects'|'contacts'

  async function load() {
    setLoading(true)
    const res = await fetch('/api/clients')
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!q) return clients
    const lq = q.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(lq) ||
      (c.industry ?? '').toLowerCase().includes(lq) ||
      (c.contact ?? '').toLowerCase().includes(lq) ||
      (c.phone ?? '').toLowerCase().includes(lq)
    )
  }, [clients, q])

  function openAdd() { setEditClient(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(c) {
    setEditClient(c)
    setForm({ name: c.name, industry: c.industry || '', contact: c.contact || '', phone: c.phone || '', email: c.email || '', website: c.website || '', address: c.address || '', npwp: c.npwp || '', notes: c.notes || '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('Nama klien wajib diisi'); return }
    setSaving(true)
    try {
      const url = editClient ? `/api/clients/${editClient.id}` : '/api/clients'
      const method = editClient ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
      setShowForm(false); load()
    } finally { setSaving(false) }
  }

  async function handleDelete(c) {
    if (!confirm(`Hapus klien "${c.name}"? Pastikan tidak ada project terkait.`)) return
    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Gagal'); return }
    load()
  }

  async function saveContact() {
    if (!contactForm.name.trim()) { alert('Nama PIC tidak boleh kosong'); return }
    setSaving(true)
    try {
      const { clientId, contactId, ...fields } = contactForm
      const url = contactId ? `/api/client-contacts/${contactId}` : `/api/clients/${clientId}/contacts`
      const res = await fetch(url, { method: contactId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
      if (!res.ok) { alert('Gagal menyimpan kontak'); return }
      setContactForm(null); load()
    } finally { setSaving(false) }
  }

  async function deleteContact(contactId) {
    if (!confirm('Hapus kontak ini?')) return
    await fetch(`/api/client-contacts/${contactId}`, { method: 'DELETE' })
    load()
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Summary stats
  const totalRevenue = clients.reduce((s, c) => s + (c.totalRevenue || 0), 0)
  const repeatClients = clients.filter(c => c.repeatOrder).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link href="/" className="hover:text-violet-600">← Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Client Database</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Database</h1>
            <p className="text-sm text-gray-500 mt-0.5">Riwayat klien, revenue, dan kontak PIC</p>
          </div>
          <button onClick={openAdd} className="btn-primary">+ Tambah Klien</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Klien', value: clients.length },
            { label: 'Repeat Order', value: repeatClients },
            { label: 'Total Revenue', value: fmtRp(totalRevenue) },
            { label: 'Avg. Revenue/Klien', value: clients.filter(c=>c.totalRevenue>0).length > 0 ? fmtRp(totalRevenue / clients.filter(c=>c.totalRevenue>0).length) : '–' },
          ].map(s => (
            <div key={s.label} className="card p-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="card p-3 mb-4">
          <input className="input w-full sm:w-80" placeholder="Cari nama klien, industri, PIC…" value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {/* Client list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Memuat data klien…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Tidak ada klien ditemukan.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const isOpen = !!expanded[c.id]
              const tab = activeTab[c.id] || 'info'
              const wonProjects = c.projects?.filter(p => ['PREPARATION','EVENT_DAY','REPORTING','INVOICING','DONE'].includes(p.status)) || []

              return (
                <div key={c.id} className="card overflow-hidden">
                  {/* Row header */}
                  <button
                    onClick={() => setExpanded(p => ({ ...p, [c.id]: !p[c.id] }))}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{c.name}</span>
                        {c.repeatOrder && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">Repeat</span>}
                        {c.industry && <span className="text-xs text-gray-500">{c.industry}</span>}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                        <span>{c._count?.projects ?? c.projects?.length ?? 0} project</span>
                        {c.wonProjects > 0 && <span className="text-green-600">{c.wonProjects} deal</span>}
                        {c.totalRevenue > 0 && <span className="text-violet-600 font-semibold">{fmtRp(c.totalRevenue)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(c) }} className="text-xs px-2 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50">Edit</button>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {/* Sub-tabs */}
                      <div className="flex border-b border-gray-100 px-4 bg-gray-50">
                        {['info', 'projects', 'contacts'].map(t => (
                          <button key={t} onClick={() => setActiveTab(p => ({ ...p, [c.id]: t }))}
                            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all ${tab === t ? 'border-violet-500 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                            {t === 'info' ? 'Info' : t === 'projects' ? `Projects (${c.projects?.length ?? 0})` : `Kontak (${c.contacts?.length ?? 0})`}
                          </button>
                        ))}
                      </div>

                      {/* Tab: Info */}
                      {tab === 'info' && (
                        <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          {[
                            { label: 'Industri', value: c.industry },
                            { label: 'PIC Utama', value: c.contact },
                            { label: 'Telepon', value: c.phone },
                            { label: 'Email', value: c.email },
                            { label: 'Website', value: c.website },
                            { label: 'NPWP', value: c.npwp },
                          ].map(f => f.value ? (
                            <div key={f.label}>
                              <p className="text-[11px] text-gray-400 uppercase tracking-wide">{f.label}</p>
                              <p className="text-gray-900 font-medium mt-0.5 break-words">{f.value}</p>
                            </div>
                          ) : null)}
                          {c.address && (
                            <div className="col-span-2 sm:col-span-3">
                              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Alamat</p>
                              <p className="text-gray-900 mt-0.5">{c.address}</p>
                            </div>
                          )}
                          {c.notes && (
                            <div className="col-span-2 sm:col-span-3 border-t border-gray-100 pt-3">
                              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Catatan</p>
                              <p className="text-gray-700 mt-0.5">{c.notes}</p>
                            </div>
                          )}
                          <div className="col-span-2 sm:col-span-3 border-t border-gray-100 pt-3 flex gap-2">
                            <button onClick={() => openEdit(c)} className="btn-secondary text-xs py-1.5 px-3">Edit Info</button>
                            <button onClick={() => handleDelete(c)} className="text-xs px-3 py-1.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">Hapus</button>
                          </div>
                        </div>
                      )}

                      {/* Tab: Projects */}
                      {tab === 'projects' && (
                        <div className="px-4 py-3">
                          {c.projects?.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-3">Belum ada project.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100 text-gray-400">
                                    <th className="py-2 text-left font-semibold uppercase tracking-wide">Project</th>
                                    <th className="py-2 text-left font-semibold uppercase tracking-wide">Status</th>
                                    <th className="py-2 text-left font-semibold uppercase tracking-wide">Tanggal</th>
                                    <th className="py-2 text-right font-semibold uppercase tracking-wide">Nilai</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.projects.map(p => (
                                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-2 pr-3">
                                        <Link href={`/projects/${p.id}`} className="font-semibold text-violet-700 hover:underline">{p.code}</Link>
                                        <p className="text-gray-600 truncate max-w-[200px]">{p.name}</p>
                                      </td>
                                      <td className="py-2 pr-3">
                                        <span className={`px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-500'}`}>
                                          {STATUS_LABEL[p.status] || p.status}
                                        </span>
                                      </td>
                                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                                        {p.startDate ? fmtDate(p.startDate) : '–'}
                                      </td>
                                      <td className="py-2 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                                        {fmtRp(p.projectValue)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                {wonProjects.length > 0 && (
                                  <tfoot>
                                    <tr className="border-t-2 border-gray-200">
                                      <td colSpan={3} className="py-2 text-gray-500 font-semibold">Total Revenue (Won)</td>
                                      <td className="py-2 text-right font-bold text-violet-700 tabular-nums">
                                        {fmtRp(wonProjects.reduce((s, p) => s + (p.projectValue || 0), 0))}
                                      </td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tab: Kontak */}
                      {tab === 'contacts' && (
                        <div className="px-4 py-3 space-y-2">
                          {c.contacts?.map(contact => (
                            contactForm?.contactId === contact.id ? (
                              <ContactFormBlock key={contact.id} form={contactForm} setForm={setContactForm} onSave={saveContact} onCancel={() => setContactForm(null)} saving={saving} />
                            ) : (
                              <div key={contact.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white border border-gray-100">
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                                  {contact.jobTitle && <p className="text-xs text-gray-500">{contact.jobTitle}</p>}
                                  <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                                    {contact.phone && <p>📞 {contact.phone}</p>}
                                    {contact.email && <p>✉ {contact.email}</p>}
                                    {contact.address && <p>📍 {contact.address}</p>}
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button onClick={() => setContactForm({ clientId: c.id, contactId: contact.id, name: contact.name, jobTitle: contact.jobTitle || '', email: contact.email || '', phone: contact.phone || '', address: contact.address || '', religion: contact.religion || '', notes: contact.notes || '' })}
                                    className="text-[11px] px-2 py-1 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50">Edit</button>
                                  <button onClick={() => deleteContact(contact.id)}
                                    className="text-[11px] px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">✕</button>
                                </div>
                              </div>
                            )
                          ))}
                          {!contactForm && (
                            <button onClick={() => setContactForm({ clientId: c.id, contactId: null, ...EMPTY_CONTACT })}
                              className="w-full text-xs py-2 rounded-xl border border-dashed border-violet-300 text-violet-500 hover:bg-violet-50 transition-colors">
                              + Tambah PIC / Kontak
                            </button>
                          )}
                          {contactForm?.clientId === c.id && !contactForm.contactId && (
                            <ContactFormBlock form={contactForm} setForm={setContactForm} onSave={saveContact} onCancel={() => setContactForm(null)} saving={saving} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="font-bold text-gray-900">{editClient ? 'Edit Klien' : 'Tambah Klien Baru'}</p>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nama Klien *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Industri</label>
                <input className="input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="mis: FMCG, Perbankan" />
              </div>
              <div>
                <label className="label">PIC Utama</label>
                <input className="input" value={form.contact} onChange={e => set('contact', e.target.value)} />
              </div>
              <div>
                <label className="label">Telepon</label>
                <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Website</label>
                <input className="input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
              </div>
              <div>
                <label className="label">NPWP</label>
                <input className="input" value={form.npwp} onChange={e => set('npwp', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Alamat</label>
                <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Catatan</label>
                <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 border-t border-gray-100 pt-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Menyimpan…' : (editClient ? 'Simpan' : 'Tambah Klien')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactFormBlock({ form, setForm, onSave, onCancel, saving }) {
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-3 space-y-2">
      <p className="text-xs font-bold text-violet-700">{form.contactId ? 'Edit Kontak' : 'Tambah Kontak Baru'}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="label">Nama *</label>
          <input className="input text-sm" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Jabatan</label>
          <input className="input text-sm" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
        </div>
        <div>
          <label className="label">Agama</label>
          <select className="select text-sm" value={form.religion} onChange={e => set('religion', e.target.value)}>
            <option value="">–</option>
            {['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Telepon</label>
          <input className="input text-sm" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input text-sm" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Alamat</label>
          <input className="input text-sm" value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Catatan</label>
          <input className="input text-sm" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1 text-xs py-1.5">Batal</button>
        <button onClick={onSave} disabled={saving} className="btn-primary flex-1 text-xs py-1.5">{saving ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </div>
  )
}
