'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

const PUBLIC_PATHS = ['/login', '/sop']

export default function SopGate() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return

    fetch('/api/sop-agreement')
      .then(r => r.json())
      .then(d => {
        if (!d.agreed) router.replace('/sop')
      })
      .catch(() => {})
  }, [status, pathname, router])

  return null
}
