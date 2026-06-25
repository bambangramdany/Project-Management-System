'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { VENDOR_TYPES, VENDOR_STATUSES, VENDOR_SUBCATEGORIES } from '@/lib/constants'

const EMPTY_FORM = {
  name: '', vendorType: '', subCategory: '', province: '', city: '', address: '', area: '',
  capacity: '', ballroomCapacity: '', meetingCapacity: '', website: '', instagram: '',
  output: '', productService: '', status: 'Active', picContact: '', phone: '',
  priceMin: '', priceMax: '', priceNote: '', notes: '',
}

export default function VendorsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [vendorType, setVendorType] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [city, setCity] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState('createdAt_desc')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [ratings, setRatings] = useState([])
  const [ratingsAvg, setRatingsAvg] = useState(null)
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [ratingForm, setRatingForm] = useState({ rating: 5, review: '', projectName: '', usageDate: '' })
  const [savingRating, setSavingRating] = useState(false)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [previewFile, setPreviewFile] = useState(null) // { url, name }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (vendorType) params.set('vendorType', vendorType)
    if (subCategory) params.set('subCategory', subCategory)
    if (city) params.set('city', city)
    setLoading(true)
    fetch(`/api/vendors?${params.toString()}`).then(r => r.json()).then(data => {
      setVendors(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [q, vendorType, subCategory, city])

  useEffect(() => {
    if (status === 'authenticated') {
      const t = setTimeout(load, 300)
      return () => clearTimeout(t)
    }
  }, [status, load])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (v) => {
    setEditing(v)
    setForm({
      name: v.name || '', vendorType: v.vendorType || '', subCategory: v.subCategory || '', province: v.province || '',
      city: v.city || '', address: v.address || '', area: v.area || '',
      capacity: v.capacity || '', ballroomCapacity: v.ballroomCapacity || '',
      meetingCapacity: v.meetingCapacity || '', website: v.website || '', instagram: v.instagram || '',
      output: v.output || '', productService: v.productService || '', status: v.status || 'Active',
      picContact: v.picContact || '', phone: v.phone || '',
      priceMin: v.priceMin ?? '', priceMax: v.priceMax ?? '', priceNote: v.priceNote || '', notes: v.notes || '',
    })
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const url = editing ? `/api/vendors/${editing.id}` : '/api/vendors'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Gagal menyimpan')
    }
  }

  const remove = async (v) => {
    const res = await fetch(`/api/vendors/${v.id}`, { method: 'DELETE' })
    if (res.ok) {
      setConfirmDeleteId(null)
      if (detail?.id === v.id) setDetail(null)
      load()
    }
  }

  const MAX_FILE_BYTES = 1 * 1024 * 1024 // 1 MB

  // Kompresi gambar pakai Canvas sebelum upload (max 1200px, quality 0.80)
  // Jika setelah kompres masih > 1MB, turunkan quality secara bertahap sampai muat
  const compressImage = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { resolve(file); return }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      // Coba kompres mulai quality 0.80, turun terus sampai < 1MB
      const tryCompress = (quality) => {
        canvas.toBlob(blob => {
          if (blob.size <= MAX_FILE_BYTES || quality <= 0.30) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          } else {
            tryCompress(Math.round((quality - 0.10) * 100) / 100)
          }
        }, 'image/jpeg', quality)
      }
      tryCompress(0.80)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })

  const uploadPhoto = async (vendorId, file) => {
    // Validasi ukuran file non-gambar sebelum upload
    if (!file.type.startsWith('image/') && file.size > MAX_FILE_BYTES) {
      alert(`Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimal 1 MB untuk PDF/dokumen.`)
      return
    }
    setUploading(true)
    const compressed = await compressImage(file)
    // Cek ulang setelah kompresi (edge case gambar sangat detail)
    if (compressed.size > MAX_FILE_BYTES) {
      setUploading(false)
      alert(`File masih terlalu besar setelah dikompres (${(compressed.size / 1024 / 1024).toFixed(1)} MB). Coba foto dengan resolusi lebih rendah.`)
      return
    }
    const fd = new FormData()
    fd.append('file', compressed)
    const res = await fetch(`/api/vendors/${vendorId}/photos`, { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) {
      const updated = await res.json()
      setDetail(updated)
      load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error || 'Gagal upload')
    }
  }

  const loadRatings = (vendorId) => {
    setRatingsLoading(true)
    setRatings([])
    setRatingsAvg(null)
    fetch(`/api/vendors/${vendorId}/ratings`)
      .then(r => r.json())
      .then(data => {
        setRatings(data.ratings || [])
        setRatingsAvg(data.avg ?? null)
        setRatingsLoading(false)
      })
  }

  const submitRating = async (e) => {
    e.preventDefault()
    setSavingRating(true)
    const res = await fetch(`/api/vendors/${detail.id}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ratingForm),
    })
    setSavingRating(false)
    if (res.ok) {
      setShowRatingForm(false)
      setRatingForm({ rating: 5, review: '', projectName: '', usageDate: '' })
      loadRatings(detail.id)
    }
  }

  const deleteRating = async (ratingId) => {
    const res = await fetch(`/api/vendors/${detail.id}/ratings?ratingId=${ratingId}`, { method: 'DELETE' })
    if (res.ok) loadRatings(detail.id)
  }

  const removePhoto = async (vendorId, url) => {
    const res = await fetch(`/api/vendors/${vendorId}/photos`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
    if (res.ok) {
      const updated = await res.json()
      setDetail(updated)
      load()
    }
  }

  const fmtPrice = (v) => {
    if (v.priceMin == null && v.priceMax == null) return '-'
    const f = (n) => n != null ? `Rp${Number(n).toLocaleString('id-ID')}` : '?'
    if (v.priceMin != null && v.priceMax != null && v.priceMin !== v.priceMax) return `${f(v.priceMin)} - ${f(v.priceMax)}`
    return f(v.priceMin ?? v.priceMax)
  }

  const effectivePrice = (v) => v.priceMin ?? v.priceMax ?? null

  const displayed = vendors
    .filter(v => {
      const pMin = priceMin !== '' ? parseFloat(priceMin) : null
      const pMax = priceMax !== '' ? parseFloat(priceMax) : null
      const ep = effectivePrice(v)
      if (pMin != null && (ep == null || (v.priceMax ?? v.priceMin ?? 0) < pMin)) return false
      if (pMax != null && (ep == null || (v.priceMin ?? v.priceMax ?? Infinity) > pMax)) return false
      return true
    })
    .slice()
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'name_desc': return b.name.localeCompare(a.name)
        case 'price_asc': {
          const pa = effectivePrice(a) ?? Infinity, pb = effectivePrice(b) ?? Infinity
          return pa - pb
        }
        case 'price_desc': {
          const pa = effectivePrice(a) ?? -Infinity, pb = effectivePrice(b) ?? -Infinity
          return pb - pa
        }
        case 'city_asc': return (a.city || '').localeCompare(b.city || '')
        default: return new Date(b.createdAt) - new Date(a.createdAt)
      }
    })

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[70%]">{previewFile.name || 'Preview File'}</span>
              <div className="flex items-center gap-2">
                <a href={previewFile.url} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  ↗ Buka di tab baru
                </a>
                <button onClick={() => setPreviewFile(null)} className="text-gray-500 hover:text-gray-800 text-xl font-bold px-2">✕</button>
              </div>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-gray-100 p-4">
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(previewFile.name || previewFile.url) ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[75vh] object-contain rounded" />
              ) : /\.pdf$/i.test(previewFile.name || previewFile.url) ? (
                <iframe src={previewFile.url} className="w-full h-[75vh] rounded" title={previewFile.name} />
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📎</div>
                  <p className="text-gray-600 mb-4 text-sm">{previewFile.name}</p>
                  <a href={previewFile.url} target="_blank" rel="noreferrer" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Download / Buka File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-gray-900">Database Vendor</h1>
          <button onClick={openAdd} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">+ Tambah Vendor</button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari nama, kota, area, produk, PIC, catatan..."
            className="flex-1 min-w-[220px] border rounded-lg px-3 py-2 text-sm"
          />
          <select value={vendorType} onChange={e => { setVendorType(e.target.value); setSubCategory('') }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Semua Jenis</option>
            {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {vendorType && VENDOR_SUBCATEGORIES[vendorType] && (
            <select value={subCategory} onChange={e => setSubCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Semua Sub-kategori</option>
              {VENDOR_SUBCATEGORIES[vendorType].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input
            value={city} onChange={e => setCity(e.target.value)}
            placeholder="Kota"
            className="border rounded-lg px-3 py-2 text-sm w-32"
          />
          <input
            type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
            placeholder="Harga Min"
            className="border rounded-lg px-3 py-2 text-sm w-32"
          />
          <input
            type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
            placeholder="Harga Max"
            className="border rounded-lg px-3 py-2 text-sm w-32"
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="createdAt_desc">Terbaru</option>
            <option value="name_asc">Nama A-Z</option>
            <option value="name_desc">Nama Z-A</option>
            <option value="price_asc">Harga Terendah</option>
            <option value="price_desc">Harga Tertinggi</option>
            <option value="city_asc">Kota A-Z</option>
          </select>
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}

        {!loading && (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <div className="min-w-[900px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-3 py-2">Nama Vendor</th>
                  <th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2 hidden sm:table-cell">Kota / Area</th>
                  <th className="px-3 py-2">PIC / Kontak</th>
                  <th className="px-3 py-2">Harga</th>
                  <th className="px-3 py-2 hidden md:table-cell">Rating</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 hidden sm:table-cell">Diisi oleh</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(v => (
                  <tr key={v.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => { setDetail(v); loadRatings(v.id) }}>
                    <td className="px-3 py-2 font-medium text-gray-900">{v.name}</td>
                    <td className="px-3 py-2 text-gray-600">{v.vendorType}{v.subCategory && <span className="text-gray-400"> · {v.subCategory}</span>}</td>
                    <td className="px-3 py-2 text-gray-600 hidden sm:table-cell">{[v.city, v.area].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{[v.picContact, v.phone].filter(Boolean).join(' - ') || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtPrice(v)}</td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      {v.avgRating != null ? (
                        <span className="text-amber-400 text-xs whitespace-nowrap">
                          {'★'.repeat(Math.round(v.avgRating))}{'☆'.repeat(5 - Math.round(v.avgRating))}
                          <span className="text-gray-500 ml-1 text-[10px]">{v.avgRating.toFixed(1)}</span>
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${v.status === 'Active' ? 'bg-green-100 text-green-700' : v.status === 'Blacklist' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{v.enteredBy?.name || v.enteredByName || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(v) }} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                      {confirmDeleteId === v.id ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); remove(v) }} className="text-xs px-1.5 py-0.5 rounded bg-red-500 text-white mr-1">Ya</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null) }} className="text-xs text-gray-400 hover:underline">Batal</button>
                        </>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(v.id) }} className="text-red-500 hover:underline text-xs">Hapus</button>
                      )}
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Tidak ada vendor ditemukan</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold">{editing ? 'Edit Vendor' : 'Tambah Vendor'}</h2>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama Vendor *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
                <SelectField label="Jenis Vendor *" value={form.vendorType} onChange={v => setForm(f => ({ ...f, vendorType: v, subCategory: '' }))} options={VENDOR_TYPES} required />
                {form.vendorType && VENDOR_SUBCATEGORIES[form.vendorType] && (
                  <SelectField label="Sub-kategori" value={form.subCategory} onChange={v => setForm(f => ({ ...f, subCategory: v }))} options={VENDOR_SUBCATEGORIES[form.vendorType]} />
                )}
                <Field label="Provinsi" value={form.province} onChange={v => setForm(f => ({ ...f, province: v }))} />
                <Field label="Kota" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} />
                <Field label="Area" value={form.area} onChange={v => setForm(f => ({ ...f, area: v }))} />
                <Field label="Alamat" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} />
                <Field label="Kapasitas" value={form.capacity} onChange={v => setForm(f => ({ ...f, capacity: v }))} />
                <Field label="Kapasitas Ballroom" value={form.ballroomCapacity} onChange={v => setForm(f => ({ ...f, ballroomCapacity: v }))} />
                <Field label="Kapasitas Meeting" value={form.meetingCapacity} onChange={v => setForm(f => ({ ...f, meetingCapacity: v }))} />
                <Field label="Website" value={form.website} onChange={v => setForm(f => ({ ...f, website: v }))} />
                <Field label="Instagram" value={form.instagram} onChange={v => setForm(f => ({ ...f, instagram: v }))} />
                <Field label="Output" value={form.output} onChange={v => setForm(f => ({ ...f, output: v }))} />
                <Field label="Produk / Layanan" value={form.productService} onChange={v => setForm(f => ({ ...f, productService: v }))} />
                <SelectField label="Status" value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={VENDOR_STATUSES} />
                <Field label="PIC Kontak" value={form.picContact} onChange={v => setForm(f => ({ ...f, picContact: v }))} />
                <Field label="Telepon" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                <Field label="Harga Min" type="number" value={form.priceMin} onChange={v => setForm(f => ({ ...f, priceMin: v }))} />
                <Field label="Harga Max" type="number" value={form.priceMax} onChange={v => setForm(f => ({ ...f, priceMax: v }))} />
              </div>
              <Field label="Catatan Harga" value={form.priceNote} onChange={v => setForm(f => ({ ...f, priceNote: v }))} />
              <div>
                <label className="text-xs text-gray-500">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{detail.name}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="text-sm text-gray-700 grid grid-cols-2 gap-2">
              <Info label="Jenis" value={detail.vendorType} />
              <Info label="Status" value={detail.status} />
              <Info label="Provinsi / Kota" value={[detail.province, detail.city].filter(Boolean).join(' / ')} />
              <Info label="Area" value={detail.area} />
              <Info label="Alamat" value={detail.address} />
              <Info label="Kapasitas" value={detail.capacity} />
              <Info label="Kapasitas Ballroom" value={detail.ballroomCapacity} />
              <Info label="Kapasitas Meeting" value={detail.meetingCapacity} />
              <Info label="Website" value={detail.website} />
              <Info label="Instagram" value={detail.instagram} />
              <Info label="Output" value={detail.output} />
              <Info label="Produk / Layanan" value={detail.productService} />
              <Info label="PIC Kontak" value={detail.picContact} />
              <Info label="Telepon" value={detail.phone} />
              <Info label="Harga" value={fmtPrice(detail)} />
              <Info label="Catatan Harga" value={detail.priceNote} />
              <Info label="Diisi oleh" value={detail.enteredBy?.name || detail.enteredByName} />
            </div>
            {detail.notes && (
              <div>
                <div className="text-xs text-gray-500">Catatan</div>
                <div className="text-sm whitespace-pre-wrap">{detail.notes}</div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500 font-medium">Foto / Dokumen</div>
                <label className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none bg-gray-50 text-gray-400' : 'border-brand-300 text-brand-600 hover:bg-brand-50'}`}>
                  {uploading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin inline-block" />
                      Mengompres...
                    </span>
                  ) : '+ Lampirkan File'}
                  <input
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => e.target.files[0] && uploadPhoto(detail.id, e.target.files[0])}
                  />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">Gambar otomatis dikompres hingga &lt;1 MB. PDF/dokumen maks. 1 MB.</p>
              {(Array.isArray(detail.photos) ? detail.photos : []).length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada file terlampir.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {(Array.isArray(detail.photos) ? detail.photos : []).map((p, i) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(p.name || p.url)
                    return (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex flex-col">
                        <div className="cursor-pointer" onClick={() => setPreviewFile({ url: p.url, name: p.name })}>
                          {isImage ? (
                            <img src={p.url} alt={p.name} className="w-full h-20 object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-20 p-2 hover:bg-gray-100 transition-colors">
                              <span className="text-2xl mb-1">{/\.pdf$/i.test(p.name || '') ? '📄' : '📎'}</span>
                              <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-2">{p.name || 'File'}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between px-1.5 py-1 border-t bg-white">
                          <button
                            onClick={() => setPreviewFile({ url: p.url, name: p.name })}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
                          >🔍 Preview</button>
                          <button
                            onClick={() => removePhoto(detail.id, p.url)}
                            className="text-[10px] text-red-500 hover:text-red-700 font-medium"
                          >✕ Hapus</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Rating & Ulasan */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">⭐ Rating & Ulasan</span>
                  {ratingsAvg !== null && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                      {ratingsAvg.toFixed(1)} / 5 ({ratings.length} ulasan)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowRatingForm(v => !v)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                >+ Beri Rating</button>
              </div>

              {showRatingForm && (
                <form onSubmit={submitRating} className="p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500 w-16 shrink-0">Bintang</label>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button"
                          onClick={() => setRatingForm(f => ({ ...f, rating: n }))}
                          className={`text-2xl transition-colors ${n <= ratingForm.rating ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500 w-16 shrink-0">Project</label>
                    <input className="flex-1 border rounded px-2 py-1 text-xs"
                      placeholder="Nama project (opsional)"
                      value={ratingForm.projectName}
                      onChange={e => setRatingForm(f => ({ ...f, projectName: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500 w-16 shrink-0">Tgl Pakai</label>
                    <input type="date" className="border rounded px-2 py-1 text-xs"
                      value={ratingForm.usageDate}
                      onChange={e => setRatingForm(f => ({ ...f, usageDate: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500 w-16 shrink-0">Ulasan</label>
                    <textarea className="flex-1 border rounded px-2 py-1 text-xs" rows={2}
                      placeholder="Catatan pengalaman memakai vendor ini..."
                      value={ratingForm.review}
                      onChange={e => setRatingForm(f => ({ ...f, review: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowRatingForm(false)} className="text-xs px-3 py-1 border rounded">Batal</button>
                    <button type="submit" disabled={savingRating} className="text-xs px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">
                      {savingRating ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              )}

              {ratingsLoading ? (
                <p className="text-xs text-gray-400 italic">Memuat ulasan...</p>
              ) : ratings.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Belum ada ulasan. Jadilah yang pertama memberi rating!</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {ratings.map(r => (
                    <div key={r.id} className="flex gap-2 p-2.5 rounded-lg bg-gray-50 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-amber-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                          <span className="font-medium text-gray-700">{r.createdBy?.name}</span>
                          {r.projectName && <span className="text-gray-400">· {r.projectName}</span>}
                          {r.usageDate && (
                            <span className="text-gray-400">
                              · {new Date(r.usageDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {r.review && <p className="mt-0.5 text-gray-600 leading-relaxed">{r.review}</p>}
                      </div>
                      <button onClick={() => deleteRating(r.id)}
                        className="text-gray-300 hover:text-red-400 shrink-0 self-start" title="Hapus ulasan">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setDetail(null); openEdit(detail) }} className="px-4 py-2 text-sm rounded-lg border">Edit</button>
              {confirmDeleteId === detail?.id ? (
                <>
                  <button onClick={() => remove(detail)} className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white">Ya, Hapus</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm rounded-lg border">Batal</button>
                </>
              ) : (
                <button onClick={() => setConfirmDeleteId(detail?.id)} className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-600">Hapus</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} className="w-full border rounded-lg px-3 py-2 text-sm" />
    </div>
  )
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} required={required} className="w-full border rounded-lg px-3 py-2 text-sm">
        <option value="">- Pilih -</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Info({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div>{value}</div>
    </div>
  )
}
