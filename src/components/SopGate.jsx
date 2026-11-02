'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useSopCheck } from '@/hooks/useSopCheck'

const PUBLIC_PATHS = ['/login', '/sop']

export default function SopGate() {
  const router = useRouter()
  const pathname = usePathname()
  const { agreed } = useSopCheck()

  useEffect(() => {
    if (agreed === undefined) return
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return
    if (!agreed) router.replace('/sop')
  }, [agreed, pathname, router])

  return null
}
