import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ paddingTop: 80 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
        $ ./paper-trading --mode=simulation
      </p>
      <h1 style={{
        fontSize: 32,
        fontWeight: 600,
        marginBottom: 8,
        letterSpacing: '-0.02em',
      }}>
        SemiAI Trader
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 48 }}>
        a paper trading terminal. no real money, all real data.
      </p>
      <Link
        href="/dashboard"
        style={{
          color: 'var(--text)',
          textDecoration: 'none',
          border: '1px solid var(--border)',
          padding: '8px 20px',
          display: 'inline-block',
          transition: 'border-color 0.15s',
        }}
      >
        → open terminal
      </Link>
    </div>
  )
}
