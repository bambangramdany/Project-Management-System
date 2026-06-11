'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AdminUsersPanel from '@/components/AdminUsersPanel'
import AuditLogPanel from '@/components/AuditLogPanel'
import { isFinanceDirector } from '@/lib/rbac'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const isOwner = session?.user.role === 'OWNER'
  const canSeeAudit = isOwner || isFinanceDirector(session?.user)

  const [tab, setTab] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isOwner && !canSeeAudit) router.push('/dashboard')
  }, [status, isOwner, canSeeAudit, router])

  useEffect(() => {
    if (tab === null && status === 'authenticated') {
      setTab(isOwner ? 'akun' : 'audit')
    }
  }, [status, isOwner, tab])

  if (status !== 'authenticated' || (!isOwner && !canSeeAudit) || tab === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-sm text-gray-500">Kelola akun tim dan riwayat aktivitas sistem</p>
        </div>

        <div className="flex gap-2 border-b border-gray-200">
          {isOwner && (
            <button
              onClick={() => setTab('akun')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'akun' ? 'border-brand text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Setup Akun
            </button>
          )}
          {canSeeAudit && (
            <button
              onClick={() => setTab('audit')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'audit' ? 'border-brand text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Audit Log
            </button>
          )}
        </div>

        {tab === 'akun' && isOwner && <AdminUsersPanel />}
        {tab === 'audit' && canSeeAudit && <AuditLogPanel />}
      </main>
    </div>
  )
}
