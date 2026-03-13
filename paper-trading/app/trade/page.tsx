'use client'

import { useState } from 'react'

interface Quote {
  symbol: string
  price: number
  change_percent: number
}

export default function Trade() {
  const [symbol, setSymbol] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quantity, setQuantity] = useState('')
  const [action, setAction] = useState<'buy' | 'sell'>('buy')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [quoteError, setQuoteError] = useState('')

  async function fetchQuote() {
    if (!symbol.trim()) return
    setQuoteLoading(true)
    setQuoteError('')
    setQuote(null)
    const res = await fetch(`/api/quote?symbol=${symbol.trim()}`)
    const data = await res.json()
    if (data.error) {
      setQuoteError(data.error)
    } else {
      setQuote(data)
    }
    setQuoteLoading(false)
  }

  async function submitTrade() {
    if (!quote || !quantity || Number(quantity) <= 0) return
    setTradeLoading(true)
    setMessage(null)
    const res = await fetch(`/api/trade/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: quote.symbol,
        quantity: Number(quantity),
        price: quote.price,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setMessage({
        text: `${action === 'buy' ? 'bought' : 'sold'} ${quantity} ${quote.symbol} @ $${quote.price} — total $${data.total.toFixed(2)}`,
        ok: true,
      })
      setQuantity('')
    } else {
      setMessage({ text: data.error || 'trade failed', ok: false })
    }
    setTradeLoading(false)
  }

  const total = quote && quantity ? (quote.price * Number(quantity)).toFixed(2) : null

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>
          $ trade --interactive
        </p>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Trade</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 800 }}>

        {/* Left: Quote lookup */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>
            SYMBOL LOOKUP
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && fetchQuote()}
              placeholder="AAPL"
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={fetchQuote}
              disabled={quoteLoading}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 16px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
              }}
            >
              {quoteLoading ? '...' : 'fetch'}
            </button>
          </div>

          {/* Quote result */}
          {quoteError && (
            <p style={{ color: 'var(--red)', fontSize: 12 }}>{quoteError}</p>
          )}

          {quote && (
            <div style={{
              border: '1px solid var(--border)',
              padding: '20px',
              background: 'var(--bg-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{quote.symbol}</span>
                <span style={{
                  fontSize: 11,
                  color: quote.change_percent >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {quote.change_percent >= 0 ? '+' : ''}{quote.change_percent.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                ${quote.price.toFixed(2)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                delayed · 15min cache
              </div>
            </div>
          )}
        </div>

        {/* Right: Order form */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>
            ORDER
          </p>

          {/* Buy / Sell toggle */}
          <div style={{ display: 'flex', gap: 1, marginBottom: 16, background: 'var(--border)' }}>
            {(['buy', 'sell'] as const).map(a => (
              <button
                key={a}
                onClick={() => setAction(a)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: action === a ? (a === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg-card)',
                  color: action === a ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: action === a ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 6 }}>
              QUANTITY
            </label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
              min="0"
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            marginBottom: 16,
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>ESTIMATED TOTAL</span>
            <span style={{ fontWeight: 600 }}>{total ? `$${total}` : '—'}</span>
          </div>

          {/* Submit */}
          <button
            onClick={submitTrade}
            disabled={!quote || !quantity || tradeLoading}
            style={{
              width: '100%',
              padding: '10px',
              background: !quote || !quantity ? 'var(--bg-card)' : action === 'buy' ? 'var(--green)' : 'var(--red)',
              color: !quote || !quantity ? 'var(--text-dim)' : '#000',
              border: '1px solid var(--border)',
              cursor: !quote || !quantity ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            {tradeLoading ? 'processing...' : `confirm ${action}`}
          </button>

          {/* Message */}
          {message && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              border: `1px solid ${message.ok ? 'var(--green)' : 'var(--red)'}`,
              color: message.ok ? 'var(--green)' : 'var(--red)',
              fontSize: 12,
            }}>
              {message.ok ? '✓ ' : '✗ '}{message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
