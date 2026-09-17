'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import SopContent from '@/components/SopContent'

export default function SopPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [agreeing, setAgreeing] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Check if already agreed
  useEffect(() => {
    if (!session) return
    fetch('/api/sop-agreement').then(r => r.json()).then(d => {
      if (d.agreed) router.replace('/dashboard')
    })
  }, [session, router])

  const handleScroll = (e) => {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (nearBottom) setScrolled(true)
  }

  const handleAgree = async () => {
    setAgreeing(true)
    try {
      await fetch('/api/sop-agreement', { method: 'POST' })
      setAgreed(true)
      setTimeout(() => router.replace('/dashboard'), 1500)
    } catch {
      setAgreeing(false)
    }
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-brand-900 text-white px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-sm">W</div>
        <div>
          <div className="font-bold text-sm">Watermark PM</div>
          <div className="text-xs text-white/60">Persetujuan SOP & Kontrak Kerja</div>
        </div>
        <div className="ml-auto text-xs text-white/50">v1.0 · 2026</div>
      </div>

      {/* Instruction banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <p className="text-sm text-amber-800 text-center">
          Baca seluruh dokumen SOP hingga bagian akhir sebelum tombol persetujuan aktif.
        </p>
      </div>

      {/* Scrollable SOP content */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 max-w-4xl mx-auto w-full"
        onScroll={handleScroll}
      >
        <SopContent />
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Agreement footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <p className="text-sm text-gray-600 flex-1 text-center sm:text-left">
            Dengan menekan tombol di bawah, saya menyatakan telah <strong>membaca, memahami, dan menyetujui</strong> seluruh ketentuan SOP dan Pedoman Kerja Watermark Indonesia yang berlaku per tanggal ini.
          </p>
          <button
            onClick={handleAgree}
            disabled={!scrolled || agreeing || agreed}
            className={`min-w-[180px] px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              agreed
                ? 'bg-green-500 text-white'
                : scrolled
                ? 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {agreed
              ? '✓ Tersimpan — Mengalihkan...'
              : agreeing
              ? 'Menyimpan...'
              : scrolled
              ? 'Saya Setuju & Memahami'
              : 'Scroll hingga akhir dulu'}
          </button>
        </div>
      </div>
    </div>
  )
}
