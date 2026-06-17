'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminUsersRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings')
  }, [router])
  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
