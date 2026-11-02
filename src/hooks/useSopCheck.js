'use client'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'

const fetcher = url => fetch(url).then(r => r.ok ? r.json() : null)

export function useSopCheck() {
  const { status } = useSession()
  const { data } = useSWR(
    status === 'authenticated' ? '/api/sop-agreement' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )
  return { agreed: data?.agreed }
}
