'use client'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'

const fetcher = url => fetch(url).then(r => r.ok ? r.json() : null)

export function useProfile() {
  const { data: session } = useSession()
  const { data, mutate } = useSWR(
    session ? '/api/profile/me' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )
  return { profile: data, mutate }
}
