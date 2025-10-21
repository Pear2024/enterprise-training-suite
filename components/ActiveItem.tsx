// app/components/ActiveItem.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ActiveItem({ href, children }: { href: string; children: React.ReactNode }) {
  const p = usePathname()
  const isActive = p === href || (href !== '/' && p?.startsWith(href))
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded hover:bg-accent ${isActive ? 'bg-accent font-medium' : ''}`}
    >
      {children}
    </Link>
  )
}
