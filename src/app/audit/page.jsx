'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuditRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings')
  }, [router])
  return (
    <div className="fixed inset-0 bg-brand-50 flex items-center justify-center z-50">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
