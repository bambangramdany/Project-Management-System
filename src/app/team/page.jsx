'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const ROLE_LABEL = {
  OWNER: 'Direktur Utama', PROJECT_MANAGER: 'Project Manager', PRODUCTION: 'Production',
  PROJECT_OFFICER: 'Project Officer', CREATIVE_LEAD: 'Creative Lead',
  GRAPHIC_DESIGNER: 'Graphic Designer', STAGE_DESIGNER: 'Stage Designer',
  CONTENT_CREATOR: 'Content Creator', INTERNSHIP: 'Internship', MEMBER: 'Member',
  DIRECTOR: 'Director', FINANCE: 'Finance', PRODUCER: 'Producer', EDITOR: 'Editor',
}

// Org-hierarchy order: top management down to support staff
const ROLE_ORDER = [
  'OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'CREATIVE_LEAD', 'FINANCE',
  'PROJECT_OFFICER', 'PRODUCTION', 'PRODUCER', 'EDITOR', 'GRAPHIC_DESIGNER', 'STAGE_DESIGNER',
  'CONTENT_CREATOR', 'MEMBER', 'INTERNSHIP',
]
const byHierarchy = (a, b) => {
  const ao = a.teamOrder || 0, bo = b.teamOrder || 0
  if (ao !== bo) return ao - bo
  const ai = ROLE_ORDER.indexOf(a.role), bi = ROLE_ORDER.indexOf(b.role)
  if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  return a.name.localeCompare(b.name)
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

  const owners = team.filter(u => u.role === 'OWNER').sort(byHierarchy)

  const divisions = [
    { key: 'EVENT', title: 'Divisi Event' },
    { key: 'CREATIVE', title: 'Divisi Creative' },
    { key: 'PH', title: 'Production House' },
    { key: 'FINANCE_HRGA', title: 'Finance / HR / GA' },
  ]

  const divisionMembers = divisions.map(d => ({
    ...d,
    director: team.find(u => u.divisi === d.key && u.role === 'DIRECTOR'),
    rest: team.filter(u => u.divisi === d.key && u.role !== 'OWNER' && u.role !== 'DIRECTOR').sort(byHierarchy),
  })).filter(d => d.director || d.rest.length > 0)

  const others = team.filter(u => !u.divisi && u.role !== 'OWNER').sort(byHierarchy)

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Tim Watermark</h1>
          <span className="text-sm text-gray-500">{team.length} anggota aktif</span>
        </div>

        {loading && <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>}

        {!loading && (
          <>
            {/* Manajemen: owners + division directors together */}
            <div>
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 text-center">Manajemen</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {owners.map(u => <PersonCard key={u.id} u={u} />)}
                {divisionMembers.filter(d => d.director).map(d => <PersonCard key={d.director.id} u={d.director} />)}
              </div>
            </div>

            {/* Division columns (staff below their director) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {divisionMembers.map(d => (
                <div key={d.key} className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide text-center">{d.title}</h2>
                  <div className="space-y-2">
                    {d.rest.map(u => <PersonCard key={u.id} u={u} />)}
                  </div>
                </div>
              ))}
            </div>

            {others.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Lainnya</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {others.map(u => <PersonCard key={u.id} u={u} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function PersonCard({ u }) {
  const label = u.role === 'OWNER' ? 'Management' : (u.jobTitle || ROLE_LABEL[u.role])
  return (
    <div className="card p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shrink-0">
        {u.name[0]}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{u.name}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {u.email && <p className="text-xs text-gray-400 truncate">{u.email}</p>}
      </div>
    </div>
  )
}
