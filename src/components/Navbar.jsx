'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import { isFinanceDirector } from '@/lib/rbac'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/my-tasks', label: 'Tugas Saya' },
  { href: '/projects', label: 'Projects' },
  { href: '/workload', label: 'Workload Tim' },
  { href: '/scores', label: 'Nilai Tim' },
  { href: '/finance', label: 'Finance', roles: ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE', 'PRODUCTION'] },
  { href: '/targets', label: 'Target', roles: ['OWNER', 'DIRECTOR', 'FINANCE'] },
  { href: '/vendors', label: 'Vendor' },
  { href: '/team', label: 'Tim' },
  { href: '/cashflow', label: 'Kas', cashOnly: true },
  { href: '/opex', label: 'Opex', cashOnly: true },
  { href: '/assets', label: 'Aset', cashOnly: true },
  { href: '/debts', label: 'Hutang', roles: ['OWNER', 'DIRECTOR', 'FINANCE'] },
  { href: '/settings', label: 'Pengaturan', settingsOnly: true },
]

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const canSeeAudit = session?.user.role === 'OWNER' || isFinanceDirector(session?.user)
  const canSeeCash = session?.user.role === 'OWNER' || session?.user.role === 'FINANCE' || isFinanceDirector(session?.user)
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.settingsOnly) return session?.user.role === 'OWNER' || canSeeAudit
    if (item.cashOnly) return canSeeCash
    return !item.roles || item.roles.includes(session?.user.role)
  })

  async function stopImpersonating() {
    await fetch('/api/admin/impersonate/stop', { method: 'POST' })
    window.location.href = '/settings'
  }

  return (
    <nav className="bg-ink-800 sticky top-0 z-50 shadow-sm">
      {session?.user.impersonating && (
        <div className="bg-amber-500 text-ink-900 text-xs text-center py-1 px-2 flex items-center justify-center gap-2">
          <span>Mode pengawasan: melihat sebagai <strong>{session.user.name}</strong></span>
          <button onClick={stopImpersonating} className="underline font-semibold">Kembali ke akun saya</button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-14 gap-2">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center text-white text-xs font-black">W</div>
            <span className="hidden sm:block text-sm tracking-wide">Watermark PM</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center justify-center gap-1 absolute left-1/2 -translate-x-1/2">
            {visibleItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-brand text-white'
                    : 'text-ink-200 hover:text-white hover:bg-ink-700'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User + mobile menu */}
          <div className="flex items-center justify-end gap-3 ml-auto">
            {session && <NotificationBell />}
            {session && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <Link href="/profile" className="text-xs text-ink-200 hover:text-brand-300">{session.user.name}</Link>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-ink-300 hover:text-brand-300">
                  Keluar
                </button>
              </div>
            )}
            <button className="md:hidden p-1.5 rounded text-ink-200" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-ink-700 bg-ink-800 px-4 py-3 space-y-1">
          {visibleItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'block px-3 py-2 rounded-md text-sm font-medium',
                pathname.startsWith(item.href) ? 'bg-brand text-white' : 'text-ink-200 hover:bg-ink-700'
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-ink-700 pt-2 mt-2 flex items-center justify-between">
            <span className="text-xs text-ink-300">{session?.user.name}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-brand-300">Keluar</button>
          </div>
        </div>
      )}
    </nav>
  )
}
