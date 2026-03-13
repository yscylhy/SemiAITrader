'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

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

interface Trade {
  id: string
  symbol: string
  action: string
  quantity: number
  price: number
  total: number
  created_at: string
}

export default function Portfolio() {
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: pos } = await supabase
        .from('positions')
        .select('*')
        .order('symbol')

      const { data: tr } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      setTrades(tr || [])

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

  function fmt(n: number) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtPct(n: number) {
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
  }

  function fmtDate(s: string) {
    const d = new Date(s)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>loading...</div>

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>
          $ portfolio --detail
        </p>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Portfolio</h1>
      </div>

      {/* Positions */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 16 }}>
          OPEN POSITIONS
        </p>

        {positions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '16px 0' }}>
            no open positions.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
            {positions.map(p => (
              <div key={p.symbol} style={{
                background: 'var(--bg-card)',
                padding: '20px 24px',
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 1fr 1fr',
                alignItems: 'center',
                gap: 16,
              }}>
                {/* Symbol */}
                <div style={{ fontWeight: 600, fontSize: 15 }}>{p.symbol}</div>

                {/* Qty + avg cost */}
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>QTY / AVG</div>
                  <div>{p.quantity} @ {fmt(p.avg_cost)}</div>
                </div>

                {/* Current price */}
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>CURRENT</div>
                  <div>
                    {fmt(p.current_price || 0)}{' '}
                    <span style={{
                      fontSize: 11,
                      color: (p.change_percent || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {fmtPct(p.change_percent || 0)}
                    </span>
                  </div>
                </div>

                {/* Market value */}
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>MKT VALUE</div>
                  <div>{fmt(p.market_value || 0)}</div>
                </div>

                {/* P&L */}
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>P&L</div>
                  <div style={{ color: (p.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmt(p.pnl || 0)}
                    <span style={{ fontSize: 11, marginLeft: 6 }}>
                      {fmtPct(p.pnl_percent || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trade History */}
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 16 }}>
          TRADE HISTORY
        </p>

        {trades.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '16px 0' }}>no trades yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['date', 'symbol', 'action', 'qty', 'price', 'total'].map(h => (
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
              {trades.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                    {fmtDate(t.created_at)}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{t.symbol}</td>
                  <td style={{
                    padding: '10px 12px',
                    color: t.action === 'buy' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {t.action}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{t.quantity}</td>
                  <td style={{ padding: '10px 12px' }}>{fmt(t.price)}</td>
                  <td style={{ padding: '10px 12px' }}>{fmt(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
