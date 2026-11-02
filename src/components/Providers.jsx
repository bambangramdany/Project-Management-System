'use client'
import { SessionProvider } from 'next-auth/react'
import SopGate from './SopGate'

export default function Providers({ children }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <SopGate />
      {children}
    </SessionProvider>
  )
}
