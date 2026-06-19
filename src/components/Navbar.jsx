'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import { isFinanceDirector } from '@/lib/rbac'

// ── Menu order: Daily → PM → Network → Commercial → Finance → Admin ──────────
const NAV_ITEMS = [
  // ── Harian & PM ──
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/my-tasks',  label: 'Tugas Saya' },
  { href: '/projects',  label: 'Projects' },
  { href: '/workload',  label: 'Workload Tim' },
  { href: '/scores',    label: 'Penilaian' },

  // ── Network ──
  { href: '/vendors', label: 'Vendor' },
  { href: '/clients', label: 'Klien' },
  { href: '/team',    label: 'Tim' },

  // ── Commercial / Pipeline ──
  { href: '/quotation', label: 'Quotation', roles: ['OWNER', 'DIRECTOR', 'PROJECT_MANAGER', 'PRODUCER', 'FINANCE', 'FINANCE_STAFF'] },
  { href: '/invoice',   label: 'Invoice',   roles: ['OWNER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF'] },

  // ── Finance & Operasional ──
  { href: '/finance',  label: 'Finance',    roles: ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE', 'FINANCE_STAFF', 'PRODUCTION'] },
  { href: '/targets',  label: 'Target',     roles: ['OWNER', 'DIRECTOR', 'FINANCE'] },
  { href: '/cashflow', label: 'Kas',        cashOnly: true },
  { href: '/opex',     label: 'Opex',       financeStaffOk: true },
  { href: '/debts',    label: 'Hutang',     roles: ['OWNER', 'DIRECTOR', 'FINANCE'] },
  { href: '/assets',   label: 'Aset',       financeStaffOk: true },
  { href: '/salary',   label: 'Gaji',       roles: ['OWNER', 'DIRECTOR', 'FINANCE'] },

  // ── Admin ──
  { href: '/settings', label: 'Pengaturan', settingsOnly: true },
]

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const canSeeAudit = session?.user.role === 'OWNER' || isFinanceDirector(session?.user)
  const canSeeCash = session?.user.role === 'OWNER' || session?.user.role === 'FINANCE' || isFinanceDirector(session?.user)
  const canSeeFinanceStaff = canSeeCash || session?.user.role === 'FINANCE_STAFF'
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.settingsOnly) return session?.user.role === 'OWNER' || canSeeAudit
    if (item.cashOnly) return canSeeCash
    if (item.financeStaffOk) return canSeeFinanceStaff
    return !item.roles || item.roles.includes(session?.user.role)
  })

  async function stopImpersonating() {
    await fetch('/api/admin/impersonate/stop', { method: 'POST' })
    window.location.href = '/settings'
  }

  return (
    <nav className="sticky top-0 z-50" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)' }}>
      {/* Shimmer accent line */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #A78BFA, #818CF8, #A78BFA, transparent)' }} />

      {session?.user.impersonating && (
        <div className="bg-amber-400 text-ink-900 text-xs text-center py-1 px-2 flex items-center justify-center gap-2 font-semibold">
          <span>Mode pengawasan: melihat sebagai <strong>{session.user.name}</strong></span>
          <button onClick={stopImpersonating} className="underline">Kembali ke akun saya</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 gap-3">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>W</div>
            <span className="hidden sm:block text-sm font-bold tracking-wide">Watermark PM</span>
          </Link>

          {/* Desktop nav — single scrollable row */}
          <div className="hidden md:flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide mx-2">
            {visibleItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap',
                  pathname.startsWith(item.href)
                    ? 'text-white shadow-md'
                    : 'text-violet-200 hover:text-white hover:bg-white/10'
                )}
                style={pathname.startsWith(item.href) ? {
                  background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                } : {}}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User info + mobile toggle */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {session && <NotificationBell />}
            {session && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                     style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <Link href="/profile" className="text-xs text-violet-200 hover:text-white font-medium transition-colors">
                  {session.user.name}
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/login' })}
                        className="text-xs text-violet-300 hover:text-white transition-colors">
                  Keluar
                </button>
              </div>
            )}
            <button className="md:hidden p-1.5 rounded-lg text-violet-200 hover:bg-white/10 transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-violet-800/50 px-4 py-3 space-y-1"
             style={{ background: 'rgba(30, 27, 75, 0.98)', backdropFilter: 'blur(8px)' }}>
          {visibleItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'block px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                pathname.startsWith(item.href)
                  ? 'text-white'
                  : 'text-violet-200 hover:bg-white/10 hover:text-white'
              )}
              style={pathname.startsWith(item.href) ? {
                background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
              } : {}}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-violet-800/50 pt-3 mt-2 flex items-center justify-between">
            <span className="text-xs text-violet-300 font-medium">{session?.user.name}</span>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-xs text-violet-300 hover:text-white transition-colors">Keluar</button>
          </div>
        </div>
      )}
    </nav>
  )
}
