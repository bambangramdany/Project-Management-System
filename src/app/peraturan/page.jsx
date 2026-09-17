'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SopContent from '@/components/SopContent'

export default function PeraturanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return null

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>Watermark PM</span>
          <span>/</span>
          <span className="text-purple-600 font-medium">SOP & Peraturan</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">SOP & Peraturan Perusahaan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pedoman kerja dan standard operating procedure yang berlaku untuk seluruh karyawan
          PT Sinematik Anak Bangsa — Watermark Indonesia.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
            Versi 1.0 · 2026
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Status: Berlaku
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
            Internal Use Only
          </span>
        </div>

        {session && <AgreementBadge />}
      </div>

      {/* Konten SOP */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 md:px-10 py-8">
        <SopContent />
        <div className="mt-6 text-center text-xs text-gray-400 py-4 border-t border-dashed border-gray-200">
          — Akhir Dokumen SOP · Watermark Indonesia 2026 —
        </div>
      </div>
    </div>
  )
}

function AgreementBadge() {
  const [agreed, setAgreed] = useState(null)
  const [agreedAt, setAgreedAt] = useState(null)

  useEffect(() => {
    fetch('/api/sop-agreement')
      .then(r => r.json())
      .then(d => { setAgreed(d.agreed); setAgreedAt(d.agreedAt) })
      .catch(() => {})
  }, [])

  if (agreed === null) return null

  if (agreed) {
    const date = agreedAt
      ? new Date(agreedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—'
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Kamu telah menyetujui dokumen ini pada <strong className="ml-1">{date}</strong>
      </div>
    )
  }

  return (
    <div className="mt-4 inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Belum menyetujui dokumen ini.
    </div>
  )
}
