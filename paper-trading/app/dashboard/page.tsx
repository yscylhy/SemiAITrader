'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

interface Account {
  cash_balance: number
}

interface Position {
  symbol: string
  quantity: number
  avg_cost: number
  current_price?: number
  change_percent?: number
  market_value?: number
  pnl?: number
  pnl_percent?: number
}

function StatCard({ label, value, sub, color }: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      padding: '20px 24px',
      background: 'var(--bg-card)',
    }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8, letterSpacing: '0.08em' }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--text)' }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [account, setAccount] = useState<Account | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoggedIn(false)
        setLoading(false)
        return
      }

      const { data: acc } = await supabase.from('accounts').select('*').single()
      setAccount(acc)

      const { data: pos } = await supabase.from('positions').select('*')
      if (!pos || pos.length === 0) {
        setPositions([])
        setLoading(false)
        return
      }

      const enriched = await Promise.all(
        pos.map(async (p: Position) => {
          const res = await fetch(`/api/quote?symbol=${p.symbol}`)
          const quote = await res.json()
          const market_value = quote.price * p.quantity
          const pnl = (quote.price - p.avg_cost) * p.quantity
          const pnl_percent = ((quote.price - p.avg_cost) / p.avg_cost) * 100
          return { ...p, current_price: quote.price, change_percent: quote.change_percent, market_value, pnl, pnl_percent }
        })
      )
      setPositions(enriched)
      setLoading(false)
    }
    load()
  }, [])

  async function loginWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  const totalMarketValue = positions.reduce((sum, p) => sum + (p.market_value || 0), 0)
  const totalAssets = (account?.cash_balance || 0) + totalMarketValue
  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const totalCost = positions.reduce((sum, p) => sum + p.avg_cost * p.quantity, 0)
  const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  function fmt(n: number) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtPct(n: number) {
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
  }

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>loading...</div>

  if (!loggedIn) return (
    <div style={{ paddingTop: 80 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        authentication required.
      </p>
      <button
        onClick={loginWithGitHub}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          padding: '8px 20px',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
        }}
      >
        → login with github
      </button>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>
          $ account --summary
        </p>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Dashboard</h1>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1,
        marginBottom: 40,
        background: 'var(--border)',
      }}>
        <StatCard label="Total Assets" value={fmt(totalAssets)} sub="cash + positions" />
        <StatCard label="Cash" value={fmt(account?.cash_balance || 0)} sub="available to trade" />
        <StatCard label="Market Value" value={fmt(totalMarketValue)} sub={`${positions.length} position${positions.length !== 1 ? 's' : ''}`} />
        <StatCard
          label="Total P&L"
          value={fmt(totalPnl)}
          sub={fmtPct(totalPnlPercent)}
          color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 16 }}>
          $ positions --list
        </p>

        {positions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '24px 0' }}>
            no open positions. go to trade to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['symbol', 'qty', 'avg cost', 'current', 'chg%', 'mkt value', 'p&l', 'p&l%'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    fontWeight: 400,
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.symbol} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{p.symbol}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{p.quantity}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{fmt(p.avg_cost)}</td>
                  <td style={{ padding: '12px' }}>{fmt(p.current_price || 0)}</td>
                  <td style={{ padding: '12px', color: (p.change_percent || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(p.change_percent || 0)}
                  </td>
                  <td style={{ padding: '12px' }}>{fmt(p.market_value || 0)}</td>
                  <td style={{ padding: '12px', color: (p.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmt(p.pnl || 0)}
                  </td>
                  <td style={{ padding: '12px', color: (p.pnl_percent || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(p.pnl_percent || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
