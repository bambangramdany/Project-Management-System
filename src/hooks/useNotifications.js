'use client'
import useSWR from 'swr'

const fetcher = url => fetch(url).then(r => r.ok ? r.json() : [])

export function useNotifications() {
  const { data, mutate } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    refreshInterval: 60000,
  })
  return { notifications: Array.isArray(data) ? data : [], mutate }
}
