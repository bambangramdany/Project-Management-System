'use client'
import Link from 'next/link'

export default function BackButton({ href = '/dashboard', label = 'Kembali ke Dashboard' }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-700 transition-colors mb-6 group"
    >
      <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  )
}
