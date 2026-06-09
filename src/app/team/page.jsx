'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const ROLE_LABEL = {
  OWNER: 'Owner', PROJECT_MANAGER: 'Project Manager', PRODUCTION: 'Production',
  PROJECT_OFFICER: 'Project Officer', CREATIVE_LEAD: 'Creative Lead',
  GRAPHIC_DESIGNER: 'Graphic Designer', STAGE_DESIGNER: 'Stage Designer',
  CONTENT_CREATOR: 'Content Creator', INTERNSHIP: 'Internship', MEMBER: 'Member',
}

export default function TeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/team').then(r => r.json()).then(data => {
        setTeam(Array.isArray(data) ? data : [])
        setLoading(false)
      })
    }
  }, [status])

  const eventTeam = team.filter(u => u.divisi === 'EVENT')
  const creativeTeam = team.filter(u => u.divisi === 'CREATIVE')
  const others = team.filter(u => !u.divisi)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Tim Watermark</h1>
          <span className="text-sm text-gray-500">{team.length} anggota aktif</span>
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}

        {!loading && (
          <>
            <DivisiSection title="Divisi Event" members={eventTeam} />
            <DivisiSection title="Divisi Creative" members={creativeTeam} />
            {others.length > 0 && <DivisiSection title="Lainnya" members={others} />}
          </>
        )}
      </main>
    </div>
  )
}

function DivisiSection({ title, members }) {
  if (members.length === 0) return null
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map(u => (
          <div key={u.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shrink-0">
              {u.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-500">{u.jobTitle || ROLE_LABEL[u.role]}</p>
              {u.email && <p className="text-xs text-gray-400 truncate">{u.email}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
