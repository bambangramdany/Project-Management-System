'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { PROJECT_SCORE_CRITERIA } from '@/lib/constants'

function fmt(v) {
  return v == null ? '-' : v.toFixed(1)
}

export default function ScoresPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allNotes, setAllNotes] = useState(null)
  const [directors, setDirectors] = useState([])
  const [noteForm, setNoteForm] = useState({ directorId: '', message: '' })
  const [noteSent, setNoteSent] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/scores/summary').then(r => r.json()).then(d => { setData(d); setLoading(false) })
    fetch('/api/team').then(r => r.json()).then(members => {
      setDirectors((Array.isArray(members) ? members : []).filter(m => m.role === 'DIRECTOR'))
    })
    if (session.user.role === 'OWNER' || (session.user.role === 'DIRECTOR' && session.user.divisi === 'FINANCE_HRGA')) {
      fetch('/api/director-notes').then(r => r.json()).then(setAllNotes)
    }
  }, [status, session])

  if (status !== 'authenticated' || loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const canSubmitNote = !['OWNER', 'DIRECTOR'].includes(session.user.role)

  const submitNote = async (e) => {
    e.preventDefault()
    if (!noteForm.directorId || !noteForm.message.trim()) return
    await fetch('/api/director-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteForm),
    })
    setNoteForm({ directorId: '', message: '' })
    setNoteSent(true)
    setTimeout(() => setNoteSent(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Penilaian Bonus</h1>
          <p className="text-sm text-gray-500">Ringkasan penilaian per project sebagai dasar skema bonus</p>
        </div>

        {/* My summary */}
        <div className="card p-4">
          <p className="text-sm font-semibold text-ink-800 mb-3">Penilaian Saya</p>
          {data.mine.count === 0 ? (
            <p className="text-sm text-gray-400">Belum ada penilaian.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mb-2">
                {PROJECT_SCORE_CRITERIA.map(c => (
                  <div key={c.key} className="bg-brand-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className="text-lg font-bold text-brand-700">{fmt(data.mine.byCriteria[c.key])}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Rata-rata keseluruhan: <span className="font-semibold text-ink-800">{fmt(data.mine.overall)}</span> dari {data.mine.count} penilaian. Identitas penilai dirahasiakan.</p>
            </>
          )}
        </div>

        {/* Anonymous notes addressed to me (director) */}
        {session.user.role === 'DIRECTOR' && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink-800 mb-2">Catatan dari Tim (Anonim)</p>
            {(!data.myNotes || data.myNotes.length === 0) ? (
              <p className="text-sm text-gray-400">Belum ada catatan.</p>
            ) : (
              <ul className="space-y-2">
                {data.myNotes.map(n => (
                  <li key={n.id} className="text-sm bg-gray-50 rounded-lg p-2.5 text-gray-700">
                    {n.message}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('id-ID')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Team summary */}
        {data.team && data.team.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink-800 mb-3">Ringkasan Penilaian Tim</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="pb-2 pr-2">Nama</th>
                    {PROJECT_SCORE_CRITERIA.map(c => (
                      <th key={c.key} className="pb-2 px-2 text-center">{c.label}</th>
                    ))}
                    <th className="pb-2 pl-2 text-center">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {data.team.map(({ user, summary }) => (
                    <tr key={user.id} className="border-t border-gray-100">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-ink-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.jobTitle || user.role}</p>
                      </td>
                      {PROJECT_SCORE_CRITERIA.map(c => (
                        <td key={c.key} className="py-2 px-2 text-center text-gray-700">{fmt(summary.byCriteria[c.key])}</td>
                      ))}
                      <td className="py-2 pl-2 text-center font-semibold text-brand-700">{fmt(summary.overall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submit anonymous note to a director */}
        {canSubmitNote && directors.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink-800 mb-1">Sampaikan Catatan ke Direktur</p>
            <p className="text-xs text-gray-500 mb-3">Identitas Anda dirahasiakan dari direktur penerima — hanya Direktur Utama & HR yang dapat melihatnya.</p>
            <form onSubmit={submitNote} className="space-y-2">
              <select className="select" value={noteForm.directorId} onChange={e => setNoteForm(f => ({ ...f, directorId: e.target.value }))} required>
                <option value="">Pilih direktur tujuan</option>
                {directors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.jobTitle || d.role}</option>)}
              </select>
              <textarea className="input" rows={3} placeholder="Tulis catatan Anda..." value={noteForm.message} onChange={e => setNoteForm(f => ({ ...f, message: e.target.value }))} required />
              <button type="submit" className="btn-primary">Kirim Catatan</button>
              {noteSent && <span className="ml-2 text-xs text-green-600">Catatan terkirim.</span>}
            </form>
          </div>
        )}

        {/* Owner / HR: all notes with authors */}
        {allNotes && (
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink-800 mb-2">Semua Catatan Tim untuk Direktur</p>
            {allNotes.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada catatan.</p>
            ) : (
              <ul className="space-y-2">
                {allNotes.map(n => (
                  <li key={n.id} className="text-sm bg-gray-50 rounded-lg p-2.5 text-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Untuk <strong>{n.director?.name}</strong> dari <strong>{n.author?.name}</strong> ({n.author?.jobTitle})</p>
                    {n.message}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString('id-ID')}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
