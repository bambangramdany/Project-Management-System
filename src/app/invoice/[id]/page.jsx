'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import PDFPreviewModal from '@/components/PDFPreviewModal'

const fmt = (n) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

const STATUS_COLOR = {
  DRAFT:     'bg-gray-100 text-gray-600',
  ISSUED:    'bg-blue-100 text-blue-700',
  PAID:      'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-400',
}

export default function InvoiceDetailPage() {
  const { data: session, status } = useSession()
  const { id } = useParams()
  const router  = useRouter()

  const [inv,         setInv]         = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [form,        setForm]        = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [editingRef,  setEditingRef]  = useState(false)  // inline edit for PO & Faktur Pajak
  const [refForm,     setRefForm]     = useState({ poNumber: '', taxInvoiceNumber: '' })

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])

  const load = () => {
    setLoading(true)
    fetch(`/api/invoices/${id}`).then(r => r.json()).then(d => {
      setInv(d)
      setForm(buildForm(d))
      setLoading(false)
    })
  }

  useEffect(() => { if (id && status === 'authenticated') load() }, [id, status])

  function buildForm(d) {
    return {
      financeClientName: d.financeClientName || '',
      financeEventName:  d.financeEventName  || '',
      poNumber:          d.poNumber          || '',
      taxInvoiceNumber:  d.taxInvoiceNumber  || '',
      picFinanceName:    d.picFinanceName     || '',
      picFinancePhone:   d.picFinancePhone    || '',
      mode:              d.mode              || 'DETAIL',
      issueDate:         d.issueDate ? d.issueDate.slice(0,10) : '',
      dueDate:           d.dueDate   ? d.dueDate.slice(0,10)   : '',
      totalAmount:       String(d.totalAmount || ''),
      notes:             d.notes || '',
      termsConditions:   d.termsConditions || '',
      items:             (d.items || []).map(it => ({ id: it.id, showInDetail: it.showInDetail })),
    }
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, action: 'update' }),
    })
    setSaving(false)
    if (res.ok) { setEditing(false); load() }
    else { const d = await res.json().catch(()=>({})); alert(d.error || 'Gagal') }
  }

  async function issueInvoice() {
    if (!confirm('Issue invoice ini? Status akan berubah ke ISSUED.')) return
    setSaving(true)
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'issue', issueDate: form?.issueDate || new Date().toISOString().slice(0,10) }),
    })
    setSaving(false)
    if (res.ok) load()
    else { const d = await res.json().catch(()=>({})); alert(d.error || 'Gagal') }
  }

  async function saveRef() {
    setSaving(true)
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_refs', ...refForm }),
    })
    setSaving(false)
    if (res.ok) { setEditingRef(false); load() }
    else { const d = await res.json().catch(()=>({})); alert(d.error || 'Gagal') }
  }

  async function deleteInvoice() {
    if (!confirm('Hapus invoice ini beserta receivable-nya?')) return
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/finance')
    else { const d = await res.json().catch(()=>({})); alert(d.error || 'Gagal') }
  }

  function toggleItemDetail(itemId, val) {
    setForm(f => ({ ...f, items: f.items.map(it => it.id === itemId ? { ...it, showInDetail: val } : it) }))
  }

  if (loading || status !== 'authenticated') {
    return <div className="min-h-screen bg-brand-50"><Navbar /><div className="flex justify-center py-24 text-gray-400 text-sm">Memuat...</div></div>
  }
  if (!inv || inv.error) {
    return <div className="min-h-screen bg-brand-50"><Navbar /><div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500">Invoice tidak ditemukan. <Link href="/finance" className="text-brand underline">Kembali</Link></div></div>
  }

  const canEdit    = ['OWNER','FINANCE','FINANCE_STAFF','DIRECTOR'].includes(session?.user?.role)
  const isDraft    = inv.status === 'DRAFT'
  const isIssued   = inv.status === 'ISSUED'
  const q          = inv.quotation
  const itemDetail = form?.items ? Object.fromEntries(form.items.map(it => [it.id, it.showInDetail])) : {}

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <Link href="/finance" className="text-gray-400 hover:text-gray-600 mt-1">←</Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm text-gray-500">{inv.invoiceNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[inv.status]}`}>{inv.status}</span>
                {inv.isDP && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">DP</span>}
              </div>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">{inv.financeEventName || q?.eventName}</h1>
              <p className="text-sm text-gray-500">{inv.financeClientName || q?.clientName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Dari: <Link href={`/quotation/${q?.id}`} className="text-brand hover:underline">{q?.quotationNumber}</Link>
                {' · '}Dibuat oleh {inv.createdBy?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* PDF actions — always visible */}
            <button
              onClick={() => setShowPreview(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              👁 Preview PDF
            </button>
            <a
              href={`/api/invoices/${id}/pdf`}
              download
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              ⬇ Download PDF
            </a>

            {isDraft && canEdit && (
              <>
                <button onClick={() => setEditing(e => !e)} className="btn-secondary text-sm">
                  {editing ? '✕ Batal' : '✏ Edit'}
                </button>
                <button onClick={issueInvoice} disabled={saving} className="btn-primary text-sm">
                  📤 Issue Invoice
                </button>
              </>
            )}
            {isDraft && canEdit && (
              <button onClick={deleteInvoice} className="text-xs text-red-400 hover:text-red-600 ml-1">Hapus</button>
            )}
          </div>
        </div>

        {/* Mode toggle + totals */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">Mode PDF:</span>
            {isDraft && editing ? (
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {['DETAIL','SUMMARY'].map(m => (
                  <button key={m} onClick={() => setForm(f => ({...f, mode: m}))}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      form.mode === m ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}>{m}</button>
                ))}
              </div>
            ) : (
              <span className="text-sm font-semibold text-brand">{inv.mode}</span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-gray-400">Sub Total</p>
              <p className="font-medium text-sm">{fmt(inv.subtotal)}</p>
            </div>
            {inv.agencyFeeAmount > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Agency Fee</p>
                <p className="font-medium text-sm">{fmt(inv.agencyFeeAmount)}</p>
              </div>
            )}
            {inv.ppnAmount > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">PPN</p>
                <p className="font-medium text-sm">{fmt(inv.ppnAmount)}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Invoice</p>
              {isDraft && editing ? (
                <input type="number" className="input w-36 text-right font-bold text-brand text-sm mt-0.5"
                  value={form.totalAmount} onChange={e => setForm(f => ({...f, totalAmount: e.target.value}))} />
              ) : (
                <p className="font-bold text-brand text-lg">{fmt(inv.totalAmount)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        {editing && isDraft && (
          <div className="card p-5 space-y-4 border-t-4 border-indigo-300">
            <h3 className="font-semibold text-gray-800">Edit Detail Invoice</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nama Klien (versi Finance)</label>
                <input className="input" value={form.financeClientName}
                  onChange={e => setForm(f=>({...f, financeClientName: e.target.value}))} />
              </div>
              <div>
                <label className="label">Nama Event / Project (versi Finance)</label>
                <input className="input" value={form.financeEventName}
                  onChange={e => setForm(f=>({...f, financeEventName: e.target.value}))} />
              </div>
              <div>
                <label className="label">No. PO Klien</label>
                <input className="input font-mono" value={form.poNumber}
                  onChange={e => setForm(f=>({...f, poNumber: e.target.value}))}
                  placeholder="Opsional" />
              </div>
              <div>
                <label className="label">No. Faktur Pajak</label>
                <input className="input font-mono" value={form.taxInvoiceNumber}
                  onChange={e => setForm(f=>({...f, taxInvoiceNumber: e.target.value}))}
                  placeholder="Opsional" />
              </div>
              <div>
                <label className="label">PIC Finance (nama di dokumen)</label>
                <input className="input" value={form.picFinanceName}
                  onChange={e => setForm(f=>({...f, picFinanceName: e.target.value}))} />
              </div>
              <div>
                <label className="label">No. HP PIC Finance</label>
                <input className="input" value={form.picFinancePhone}
                  onChange={e => setForm(f=>({...f, picFinancePhone: e.target.value}))} />
              </div>
              <div>
                <label className="label">Tanggal Invoice</label>
                <input type="date" className="input" value={form.issueDate}
                  onChange={e => setForm(f=>({...f, issueDate: e.target.value}))} />
              </div>
              <div>
                <label className="label">Jatuh Tempo</label>
                <input type="date" className="input" value={form.dueDate}
                  onChange={e => setForm(f=>({...f, dueDate: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="label">Catatan</label>
              <textarea className="input h-16 resize-none" value={form.notes}
                onChange={e => setForm(f=>({...f, notes: e.target.value}))} />
            </div>
            <div>
              <label className="label">
                Terms &amp; Conditions
                <span className="text-gray-400 font-normal ml-1">(ditampilkan di PDF)</span>
              </label>
              <textarea className="input h-36 resize-y font-mono text-xs" value={form.termsConditions}
                onChange={e => setForm(f=>({...f, termsConditions: e.target.value}))}
                placeholder={'1. Cancellation within 14 days of events will be subject to 50% of total payment.\n2. Any additional cost outside those mentioned above should be settled maximum 7 days after event.\n3. Payment can be transferred to:\n   Bank Central Asia (BCA) a/n PT SINEMATIK ANAK BANGSA\n   No. Rekening: 7061111011\n   Please send the receipt to watermark.indonesia@gmail.com'} />
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Batal</button>
            </div>
          </div>
        )}

        {/* Invoice info summary */}
        {!editing && (
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-gray-400">Tanggal Invoice</p><p className="text-sm font-medium">{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('id-ID',{dateStyle:'medium'}) : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Jatuh Tempo</p><p className="text-sm font-medium">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('id-ID',{dateStyle:'medium'}) : '—'}</p></div>
              {/* PO & Faktur — inline editable regardless of status */}
              {editingRef ? (
                <>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">No. PO</p>
                    <input className="input font-mono text-sm py-1"
                      value={refForm.poNumber}
                      onChange={e => setRefForm(f => ({ ...f, poNumber: e.target.value }))}
                      placeholder="Nomor PO klien" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">No. Faktur Pajak</p>
                    <input className="input font-mono text-sm py-1"
                      value={refForm.taxInvoiceNumber}
                      onChange={e => setRefForm(f => ({ ...f, taxInvoiceNumber: e.target.value }))}
                      placeholder="Nomor faktur pajak" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-400">No. PO</p>
                    <p className="text-sm font-mono">{inv.poNumber || <span className="text-gray-300 italic">belum diisi</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">No. Faktur Pajak</p>
                    <p className="text-sm font-mono">{inv.taxInvoiceNumber || <span className="text-gray-300 italic">belum diisi</span>}</p>
                  </div>
                </>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                {editingRef ? (
                  <>
                    <button onClick={saveRef} disabled={saving}
                      className="text-xs px-3 py-1 bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                      {saving ? 'Menyimpan...' : 'Simpan No. PO & Faktur'}
                    </button>
                    <button onClick={() => setEditingRef(false)} className="text-xs text-gray-400 hover:text-gray-600">Batal</button>
                  </>
                ) : (
                  <button onClick={() => {
                    setRefForm({ poNumber: inv.poNumber || '', taxInvoiceNumber: inv.taxInvoiceNumber || '' })
                    setEditingRef(true)
                  }} className="text-xs text-brand hover:underline">
                    ✏ Edit No. PO &amp; Faktur Pajak
                  </button>
                )}
                {inv.picFinanceName && <span className="text-xs text-gray-400 ml-auto">PIC Finance: {inv.picFinanceName}{inv.picFinancePhone && ` · ${inv.picFinancePhone}`}</span>}
              </div>
            )}
            {!canEdit && inv.picFinanceName && (
              <div className="pt-1 border-t border-gray-100"><p className="text-xs text-gray-400">PIC Finance: {inv.picFinanceName}{inv.picFinancePhone && ` · ${inv.picFinancePhone}`}</p></div>
            )}
          </div>
        )}

        {/* Items table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Rincian Item</p>
            {isDraft && editing && (
              <p className="text-xs text-gray-400">Toggle "Tampil di Detail" untuk mode DETAIL PDF</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-gray-400 border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-2 py-2 text-right w-28 hidden md:table-cell">Rate</th>
                    <th className="px-2 py-2 text-center w-16">Qty</th>
                    <th className="px-2 py-2 text-center w-14 hidden md:table-cell">Days</th>
                    <th className="px-4 py-2 text-right w-32">Subtotal</th>
                    {isDraft && editing && <th className="px-3 py-2 text-center w-24">Detail PDF</th>}
                  </tr>
                </thead>
                <tbody>
                  {inv.items.map(item => {
                    const showInDetail = itemDetail[item.id] !== undefined ? itemDetail[item.id] : item.showInDetail
                    return (
                      <tr key={item.id} className={`border-b border-gray-50 ${!showInDetail && inv.mode === 'DETAIL' ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-2.5 align-top">
                          <p className="font-medium text-gray-800">{item.description}</p>
                          {item.detailText && <p className="text-xs text-gray-400 whitespace-pre-line mt-0.5">{item.detailText}</p>}
                          {item.includeAgencyFee && <span className="text-[10px] text-purple-500 mt-0.5 block">AF</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right text-gray-600 align-top hidden md:table-cell">
                          {item.rate == null ? <span className="text-amber-500 text-xs">by client</span> : fmt(item.rate)}
                        </td>
                        <td className="px-2 py-2.5 text-center text-gray-600 align-top">{item.qty}</td>
                        <td className="px-2 py-2.5 text-center text-gray-600 align-top hidden md:table-cell">{item.days}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800 align-top">
                          {item.rate == null ? '—' : fmt(item.subtotal)}
                        </td>
                        {isDraft && editing && (
                          <td className="px-3 py-2.5 text-center align-top">
                            <input type="checkbox" checked={showInDetail}
                              onChange={e => toggleItemDetail(item.id, e.target.checked)}
                              className="w-4 h-4 cursor-pointer" />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {/* Totals footer */}
          <div className="px-5 py-3 border-t border-gray-100 space-y-1 max-w-xs ml-auto">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Sub Total</span><span>{fmt(inv.subtotal)}</span></div>
            {inv.agencyFeeAmount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Agency Fee</span><span>{fmt(inv.agencyFeeAmount)}</span></div>}
            {inv.ppnAmount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">PPN</span><span>{fmt(inv.ppnAmount)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
              <span>Total</span><span className="text-brand">{fmt(inv.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions (read-only) */}
        {!editing && inv.termsConditions && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Terms &amp; Conditions</p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{inv.termsConditions}</pre>
          </div>
        )}

        {/* Receivable status */}
        {inv.receivables?.length > 0 && (
          <div className="card divide-y divide-gray-100">
            <p className="px-5 py-3 text-sm font-semibold text-gray-700">Status Pembayaran (Piutang)</p>
            {inv.receivables.map(rec => (
              <div key={rec.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${rec.status === 'PAID' ? 'bg-green-500' : 'bg-amber-400'}`} />
                  <span className="text-gray-700">{rec.status === 'PAID' ? 'Lunas' : 'Belum Dibayar'}</span>
                  {rec.paidAt && <span className="text-gray-400 text-xs">· {new Date(rec.paidAt).toLocaleDateString('id-ID',{dateStyle:'medium'})}</span>}
                </div>
                <div className="text-right">
                  <p className="font-medium">{fmt(rec.status === 'PAID' ? rec.paidAmount : rec.amount)}</p>
                  {rec.pphAmount > 0 && <p className="text-xs text-gray-400">PPh: {fmt(rec.pphAmount)}</p>}
                </div>
              </div>
            ))}
            <div className="px-5 py-2 text-xs text-gray-400">
              Kelola pembayaran di <Link href="/finance" className="text-brand hover:underline">halaman Finance → Piutang</Link>
            </div>
          </div>
        )}

      </main>

      {/* PDF Preview Modal */}
      {showPreview && (
        <PDFPreviewModal
          url={`/api/invoices/${id}/pdf`}
          title={inv.invoiceNumber}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
