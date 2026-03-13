'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { useEffect, useState } from 'react'

const links = [
  { href: '/dashboard', label: 'dashboard' },
  { href: '/trade', label: 'trade' },
  { href: '/portfolio', label: 'portfolio' },
]

export default function Nav() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      height: 48,
      gap: 32,
      position: 'sticky',
      top: 0,
      background: 'var(--bg)',
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{
        color: 'var(--text)',
        textDecoration: 'none',
        fontWeight: 600,
        letterSpacing: '0.05em',
        fontSize: 13,
      }}>
        ~/trader
      </Link>

      {/* Links */}
      <div style={{ display: 'flex', gap: 24, flex: 1 }}>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: pathname === link.href ? 'var(--text)' : 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            {pathname === link.href ? `> ${link.label}` : `  ${link.label}`}
          </Link>
        ))}
      </div>

      {/* User */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {user.user_metadata?.user_name}
          </span>
          <button
            onClick={signOut}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              padding: '2px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            exit
          </button>
        </div>
      )}
    </nav>
  )
}
