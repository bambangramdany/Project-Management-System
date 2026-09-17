'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import SopContent from '@/components/SopContent'

export default function SopPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [agreeing, setAgreeing] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!session) return
    fetch('/api/sop-agreement').then(r => r.json()).then(d => {
      if (d.agreed) router.replace('/dashboard')
    })
  }, [session, router])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining < 100) setScrolled(true)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    // also check immediately in case content is short
    checkScroll()
    return () => el.removeEventListener('scroll', checkScroll)
  }, [checkScroll])

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
          Baca seluruh dokumen SOP hingga bagian akhir — tombol persetujuan aktif setelah kamu mencapai bawah halaman.
        </p>
      </div>

      {/* Scrollable SOP content — takes all remaining height */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 py-6"
      >
        <div className="max-w-4xl mx-auto">
          <SopContent />
          {/* visible end-marker */}
          <div className="mt-6 text-center text-xs text-gray-400 py-4 border-t border-dashed border-gray-200">
            — Akhir Dokumen SOP —
          </div>
        </div>
      </div>

      {/* Agreement footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <p className="text-sm text-gray-600 flex-1 text-center sm:text-left">
            Dengan menekan tombol ini, saya menyatakan telah{' '}
            <strong>membaca, memahami, dan menyetujui</strong> seluruh ketentuan
            SOP dan Pedoman Kerja Watermark Indonesia yang berlaku per tanggal ini.
            Persetujuan ini akan tercatat secara digital sebagai kontrak kerja.
          </p>
          <button
            onClick={handleAgree}
            disabled={!scrolled || agreeing || agreed}
            className={`shrink-0 min-w-[200px] px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              agreed
                ? 'bg-green-500 text-white cursor-default'
                : scrolled
                ? 'bg-purple-700 hover:bg-purple-800 text-white cursor-pointer shadow-md'
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
