'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const router = useRouter()

  const load = () => {
    fetch('/api/notifications').then(r => r.json()).then(data => setItems(Array.isArray(data) ? data : []))
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter(n => !n.read).length

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setItems(items.map(n => ({ ...n, read: true })))
  }

  async function onItemClick(n) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      setItems(items.map(i => i.id === n.id ? { ...i, read: true } : i))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="relative p-1.5 rounded text-ink-200 hover:text-white hover:bg-ink-700">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-brand text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifikasi</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand hover:text-brand-600">Tandai semua dibaca</button>
            )}
          </div>
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Belum ada notifikasi</p>
          )}
          {items.map(n => (
            <button
              key={n.id}
              onClick={() => onItemClick(n)}
              className={clsx(
                'w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                !n.read && 'bg-brand-50'
              )}
            >
              <p className="text-sm font-medium text-gray-900">{n.title}</p>
              {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
