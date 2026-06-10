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
  DIRECTOR: 'Director', FINANCE: 'Finance',
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

  // Org-hierarchy order: top management down to support staff
  const ROLE_ORDER = [
    'OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'CREATIVE_LEAD', 'FINANCE',
    'PROJECT_OFFICER', 'PRODUCTION', 'GRAPHIC_DESIGNER', 'STAGE_DESIGNER',
    'CONTENT_CREATOR', 'MEMBER', 'INTERNSHIP',
  ]
  const byHierarchy = (a, b) => {
    const ai = ROLE_ORDER.indexOf(a.role), bi = ROLE_ORDER.indexOf(b.role)
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    return a.name.localeCompare(b.name)
  }

  const eventTeam = team.filter(u => u.divisi === 'EVENT').sort(byHierarchy)
  const creativeTeam = team.filter(u => u.divisi === 'CREATIVE').sort(byHierarchy)
  const phTeam = team.filter(u => u.divisi === 'PH').sort(byHierarchy)
  const financeTeam = team.filter(u => u.divisi === 'FINANCE_HRGA').sort(byHierarchy)
  const others = team.filter(u => !u.divisi).sort(byHierarchy)

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
            <DivisiSection title="Production House" members={phTeam} />
            <DivisiSection title="Finance / HR / GA" members={financeTeam} />
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
