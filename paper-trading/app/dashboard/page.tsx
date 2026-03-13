'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

interface Position {
  symbol: string
  quantity: number
  avg_cost: number
  price?: number
  change_percent?: number
  market_value?: number
  pnl?: number
  pnl_percent?: number
}

interface Account {
  cash_balance: number
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('not logged in')
        setLoading(false)
        return
      }

      const [{ data: acct }, { data: pos }] = await Promise.all([
        supabase.from('accounts').select('cash_balance').eq('user_id', user.id).single(),
        supabase.from('positions').select('symbol, quantity, avg_cost').eq('user_id', user.id),
      ])

      if (!acct) {
        setError('no account found')
        setLoading(false)
        return
      }

      setAccount(acct)

      const enriched: Position[] = await Promise.all(
        (pos ?? []).map(async (p) => {
          try {
            const res = await fetch(`/api/quote?symbol=${p.symbol}`)
            const q = await res.json()
            const price = q.price ?? p.avg_cost
            const market_value = price * p.quantity
            const pnl = (price - p.avg_cost) * p.quantity
            const pnl_percent = ((price - p.avg_cost) / p.avg_cost) * 100
            return { ...p, price, change_percent: q.change_percent, market_value, pnl, pnl_percent }
          } catch {
            const market_value = p.avg_cost * p.quantity
            return { ...p, price: p.avg_cost, change_percent: 0, market_value, pnl: 0, pnl_percent: 0 }
          }
        })
      )

      setPositions(enriched)
      setLoading(false)
    }

    load()
  }, [])

  const totalMarketValue = positions.reduce((s, p) => s + (p.market_value ?? 0), 0)
  const totalPnl = positions.reduce((s, p) => s + (p.pnl ?? 0), 0)
  const totalAssets = (account?.cash_balance ?? 0) + totalMarketValue

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', color: 'var(--text-muted)' }}>
        loading...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 24px', color: 'var(--red)' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>$ dashboard --live</p>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>overview</h1>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 40,
      }}>
        {[
          { label: 'total assets', value: fmt(totalAssets) },
          { label: 'cash', value: fmt(account?.cash_balance ?? 0) },
          { label: 'market value', value: fmt(totalMarketValue) },
          {
            label: 'total p&l',
            value: fmt(totalPnl),
            color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
          },
        ].map(card => (
          <div key={card.label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: '16px 20px',
          }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: card.color ?? 'var(--text)',
              letterSpacing: '-0.02em',
            }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Positions Table */}
      <div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 11 }}>
          positions [{positions.length}]
        </p>

        {positions.length === 0 ? (
          <div style={{
            border: '1px solid var(--border)',
            padding: '32px 24px',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            no open positions — go trade something
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)' }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
              padding: '8px 16px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 11,
            }}>
              {['symbol', 'qty', 'avg cost', 'price', 'chg %', 'mkt val', 'p&l', 'p&l %'].map(h => (
                <span key={h}>{h}</span>
              ))}
            </div>

            {/* Table Rows */}
            {positions.map((p, i) => (
              <div key={p.symbol} style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                padding: '10px 16px',
                borderBottom: i < positions.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600 }}>{p.symbol}</span>
                <span>{p.quantity}</span>
                <span>{fmt(p.avg_cost)}</span>
                <span>{fmt(p.price ?? 0)}</span>
                <span style={{ color: (p.change_percent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtPct(p.change_percent ?? 0)}
                </span>
                <span>{fmt(p.market_value ?? 0)}</span>
                <span style={{ color: (p.pnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmt(p.pnl ?? 0)}
                </span>
                <span style={{ color: (p.pnl_percent ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtPct(p.pnl_percent ?? 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
