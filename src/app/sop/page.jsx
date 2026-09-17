'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SopContent from '@/components/SopContent'

export default function SopPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [agreeing, setAgreeing] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!session) return
    fetch('/api/sop-agreement').then(r => r.json()).then(d => {
      if (d.agreed) router.replace('/dashboard')
    })
  }, [session, router])

  const handleAgree = async () => {
    setAgreeing(true)
    try {
      const res = await fetch('/api/sop-agreement', { method: 'POST' })
      if (res.ok) {
        setAgreed(true)
        setTimeout(() => router.replace('/dashboard'), 1500)
      } else {
        setAgreeing(false)
      }
    } catch {
      setAgreeing(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-brand-900 text-white px-6 py-4 flex items-center gap-3 shrink-0 shadow z-10">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-sm">W</div>
        <div>
          <div className="font-bold text-sm">Watermark PM</div>
          <div className="text-xs text-white/60">Persetujuan SOP & Kontrak Kerja</div>
        </div>
        <div className="ml-auto text-xs text-white/50">v1.0 · 2026</div>
      </div>

      {/* Instruction banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 shrink-0">
        <p className="text-sm text-amber-800 text-center">
          Baca seluruh dokumen SOP, centang pernyataan di bawah, lalu klik tombol persetujuan.
        </p>
      </div>

      {/* Scrollable SOP content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <SopContent />
          <div className="mt-6 text-center text-xs text-gray-400 py-4 border-t border-dashed border-gray-200">
            — Akhir Dokumen SOP —
          </div>
        </div>
      </div>

      {/* Agreement footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 md:px-8 py-5 shadow-[0_-4px_16px_rgba(0,0,0,0.10)]">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={e => setChecked(e.target.checked)}
                disabled={agreed}
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                checked
                  ? 'bg-purple-700 border-purple-700'
                  : 'border-gray-400 bg-white group-hover:border-purple-500'
              }`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-700 leading-snug">
              Saya menyatakan telah <strong>membaca dan memahami</strong> seluruh isi
              dokumen SOP dan Pedoman Kerja Watermark Indonesia di atas, dan bersedia
              mematuhi semua ketentuan yang berlaku. Persetujuan ini bersifat mengikat
              secara digital sebagai bagian dari kontrak kerja saya.
            </span>
          </label>

          {/* Tombol */}
          <div className="flex justify-end">
            <button
              onClick={handleAgree}
              disabled={!checked || agreeing || agreed}
              className={`min-w-[220px] px-8 py-3 rounded-lg font-semibold text-sm transition-all ${
                agreed
                  ? 'bg-green-500 text-white cursor-default'
                  : checked
                  ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {agreed ? '✓ Tersimpan — Mengalihkan...' : agreeing ? 'Menyimpan...' : checked ? 'Saya Setuju & Memahami' : 'Centang pernyataan di atas'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
