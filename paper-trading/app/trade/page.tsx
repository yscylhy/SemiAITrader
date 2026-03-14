'use client'

import { useState } from 'react'

interface Quote {
  symbol: string
  price: number
  change_percent: number
}

interface Rule {
  condition: string
  threshold: number
  window_days: number
  action: string
}

interface ExitRules {
  hold_type: string
  max_hold_days: number | null
  rules: Rule[]
}

const DEFAULT_RULES: ExitRules = {
  hold_type: 'short_term',
  max_hold_days: 90,
  rules: [
    { condition: 'gain_pct', threshold: 5, window_days: 2, action: 'sell_all' },
    { condition: 'gain_pct', threshold: 3, window_days: 2, action: 'sell_half' },
    { condition: 'loss_pct', threshold: 8, window_days: 7, action: 'sell_all' },
  ]
}

const CONDITIONS = [
  { value: 'gain_pct', label: '涨幅 %' },
  { value: 'loss_pct', label: '跌幅 %' },
  { value: 'gain_pct_1w', label: '1周涨幅 %' },
  { value: 'loss_pct_1w', label: '1周跌幅 %' },
  { value: 'gain_pct_1m', label: '1月涨幅 %' },
  { value: 'loss_pct_1m', label: '1月跌幅 %' },
]

const ACTIONS = [
  { value: 'sell_all', label: '全部清仓' },
  { value: 'sell_half', label: '清仓一半' },
  { value: 'sell_quarter', label: '清仓 1/4' },
]

function Input({ value, onChange, placeholder, type = 'text', style = {} }: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        padding: '6px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        outline: 'none',
        width: '100%',
        ...style,
      }}
    />
  )
}

function Select({ value, onChange, options }: any) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        padding: '6px 10px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        outline: 'none',
        width: '100%',
        cursor: 'pointer',
      }}
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
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

  // Exit rules state
  const [exitRules, setExitRules] = useState<ExitRules>(DEFAULT_RULES)
  const [nlInput, setNlInput] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [showExitRules, setShowExitRules] = useState(false)

  async function fetchQuote() {
    if (!symbol.trim()) return
    setQuoteLoading(true)
    setQuoteError('')
    setQuote(null)
    const res = await fetch(`/api/quote?symbol=${symbol.trim()}`)
    const data = await res.json()
    if (data.error) setQuoteError(data.error)
    else { setQuote(data); setShowExitRules(true) }
    setQuoteLoading(false)
  }

  async function generateRulesFromNL() {
    if (!nlInput.trim()) return
    setNlLoading(true)
    const res = await fetch('/api/generate-exit-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: nlInput, symbol: quote?.symbol }),
    })
    const data = await res.json()
    if (data.exit_rules) setExitRules(data.exit_rules)
    setNlLoading(false)
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
        exit_rules: action === 'buy' ? exitRules : undefined,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setMessage({
        text: `${action === 'buy' ? 'bought' : 'sold'} ${quantity} ${quote.symbol} @ $${quote.price} — total $${data.total.toFixed(2)}`,
        ok: true,
      })
      setQuantity('')
      setNlInput('')
      setShowExitRules(false)
    } else {
      setMessage({ text: data.error || 'trade failed', ok: false })
    }
    setTradeLoading(false)
  }

  function updateRule(index: number, field: string, value: any) {
    const updated = [...exitRules.rules]
    updated[index] = { ...updated[index], [field]: value }
    setExitRules({ ...exitRules, rules: updated })
  }

  function addRule() {
    setExitRules({
      ...exitRules,
      rules: [...exitRules.rules, { condition: 'gain_pct', threshold: 5, window_days: 1, action: 'sell_all' }]
    })
  }

  function removeRule(index: number) {
    setExitRules({
      ...exitRules,
      rules: exitRules.rules.filter((_, i) => i !== index)
    })
  }

  const total = quote && quantity ? (quote.price * Number(quantity)).toFixed(2) : null

  const label = (s: string) => (
    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, letterSpacing: '0.06em' }}>
      {s}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>$ trade --interactive</p>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Trade</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 900 }}>

        {/* Left: Quote + Exit Rules */}
        <div>
          {/* Symbol lookup */}
          <div style={{ marginBottom: 24 }}>
            {label('SYMBOL LOOKUP')}
            <div style={{ display: 'flex', gap: 8 }}>
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
              <button onClick={fetchQuote} disabled={quoteLoading} style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text)', padding: '8px 16px', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 13,
              }}>
                {quoteLoading ? '...' : 'fetch'}
              </button>
            </div>
            {quoteError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{quoteError}</p>}
          </div>

          {/* Quote card */}
          {quote && (
            <div style={{ border: '1px solid var(--border)', padding: '16px 20px', background: 'var(--bg-card)', marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{quote.symbol}</span>
                <span style={{ fontSize: 11, color: quote.change_percent >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {quote.change_percent >= 0 ? '+' : ''}{quote.change_percent.toFixed(2)}%
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>${quote.price.toFixed(2)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>delayed · 15min cache</div>
            </div>
          )}

          {/* Exit Rules - only show for buy */}
          {showExitRules && action === 'buy' && (
            <div>
              <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 16, paddingBottom: 8 }}>
                {label('EXIT STRATEGY')}
              </div>

              {/* Hold type */}
              <div style={{ marginBottom: 16 }}>
                {label('HOLD TYPE')}
                <div style={{ display: 'flex', gap: 1, background: 'var(--border)' }}>
                  {[
                    { value: 'short_term', label: 'short term' },
                    { value: 'long_term', label: 'long term' },
                  ].map(o => (
                    <button key={o.value} onClick={() => setExitRules({ ...exitRules, hold_type: o.value, max_hold_days: o.value === 'long_term' ? null : 90 })}
                      style={{
                        flex: 1, padding: '6px', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                        background: exitRules.hold_type === o.value ? 'var(--text)' : 'var(--bg-card)',
                        color: exitRules.hold_type === o.value ? '#000' : 'var(--text-muted)',
                      }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max hold days */}
              {exitRules.hold_type === 'short_term' && (
                <div style={{ marginBottom: 16 }}>
                  {label('MAX HOLD DAYS')}
                  <Input
                    type="number"
                    value={exitRules.max_hold_days || ''}
                    onChange={(e: any) => setExitRules({ ...exitRules, max_hold_days: Number(e.target.value) })}
                    placeholder="90"
                  />
                </div>
              )}

              {/* Natural language input */}
              <div style={{ marginBottom: 16 }}>
                {label('DESCRIBE YOUR STRATEGY (Claude will generate rules)')}
                <textarea
                  value={nlInput}
                  onChange={e => setNlInput(e.target.value)}
                  placeholder="e.g. 两天内涨超5%卖一半，跌超8%全清，最多持有3个月"
                  rows={3}
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text)', padding: '8px 10px', fontFamily: 'var(--font-mono)',
                    fontSize: 12, outline: 'none', resize: 'vertical',
                  }}
                />
                <button onClick={generateRulesFromNL} disabled={nlLoading || !nlInput.trim()}
                  style={{
                    marginTop: 6, background: 'none', border: '1px solid var(--border)',
                    color: nlInput.trim() ? 'var(--text)' : 'var(--text-dim)',
                    padding: '6px 14px', cursor: nlInput.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-mono)', fontSize: 12,
                  }}>
                  {nlLoading ? 'generating...' : '→ generate with claude'}
                </button>
              </div>

              {/* Rules table */}
              <div style={{ marginBottom: 8 }}>
                {label('RULES')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {exitRules.rules.map((rule, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1fr 60px 50px 1fr 24px',
                      gap: 4, alignItems: 'center',
                    }}>
                      <Select value={rule.condition} onChange={(e: any) => updateRule(i, 'condition', e.target.value)} options={CONDITIONS} />
                      <Input type="number" value={rule.threshold} onChange={(e: any) => updateRule(i, 'threshold', Number(e.target.value))} placeholder="%" />
                      <Input type="number" value={rule.window_days} onChange={(e: any) => updateRule(i, 'window_days', Number(e.target.value))} placeholder="d" />
                      <Select value={rule.action} onChange={(e: any) => updateRule(i, 'action', e.target.value)} options={ACTIONS} />
                      <button onClick={() => removeRule(i)} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        cursor: 'pointer', fontSize: 14, padding: 0,
                      }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={addRule} style={{
                  marginTop: 8, background: 'none', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', padding: '4px 12px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                }}>
                  + add rule
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order */}
        <div>
          {label('ORDER')}
          <div style={{ display: 'flex', gap: 1, marginBottom: 16, background: 'var(--border)' }}>
            {(['buy', 'sell'] as const).map(a => (
              <button key={a} onClick={() => setAction(a)} style={{
                flex: 1, padding: '8px', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: action === a ? 600 : 400,
                background: action === a ? (a === 'buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg-card)',
                color: action === a ? '#000' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
                {a}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            {label('QUANTITY')}
            <input
              type="number" value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0" min="0"
              style={{
                width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text)', padding: '8px 12px', fontFamily: 'var(--font-mono)',
                fontSize: 13, outline: 'none',
              }}
            />
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '12px 0', borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)', marginBottom: 16,
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>ESTIMATED TOTAL</span>
            <span style={{ fontWeight: 600 }}>{total ? `$${total}` : '—'}</span>
          </div>

          <button onClick={submitTrade} disabled={!quote || !quantity || tradeLoading} style={{
            width: '100%', padding: '10px',
            background: !quote || !quantity ? 'var(--bg-card)' : action === 'buy' ? 'var(--green)' : 'var(--red)',
            color: !quote || !quantity ? 'var(--text-dim)' : '#000',
            border: '1px solid var(--border)',
            cursor: !quote || !quantity ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
          }}>
            {tradeLoading ? 'processing...' : `confirm ${action}`}
          </button>

          {message && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              border: `1px solid ${message.ok ? 'var(--green)' : 'var(--red)'}`,
              color: message.ok ? 'var(--green)' : 'var(--red)', fontSize: 12,
            }}>
              {message.ok ? '✓ ' : '✗ '}{message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
