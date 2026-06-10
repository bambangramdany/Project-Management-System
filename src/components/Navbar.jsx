'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
  { href: '/workload', label: 'Workload Tim' },
  { href: '/team', label: 'Tim' },
  { href: '/finance', label: 'Finance', roles: ['OWNER', 'PROJECT_MANAGER', 'DIRECTOR', 'FINANCE'] },
]

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-ink-800 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center text-white text-xs font-black">W</div>
            <span className="hidden sm:block text-sm tracking-wide">Watermark PM</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(session?.user.role)).map(item => (
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
          <div className="flex items-center gap-3">
            {session && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs text-ink-200">{session.user.name}</span>
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
          {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(session?.user.role)).map(item => (
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
