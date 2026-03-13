'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase'

export default function TestTrade() {
  const [result, setResult] = useState('')
  const [user, setUser] = useState<{ email?: string; id: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function initAccount() {
    const res = await fetch('/api/account', { method: 'POST' })
    const data = await res.json()
    setResult(JSON.stringify(data, null, 2))
  }

  async function getAccount() {
    const res = await fetch('/api/account')
    const data = await res.json()
    setResult(JSON.stringify(data, null, 2))
  }

  async function testBuy() {
    const res = await fetch('/api/trade/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'AAPL', quantity: 1, price: 251.92 }),
    })
    const data = await res.json()
    setResult(JSON.stringify(data, null, 2))
  }

  async function loginWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function getSession() {
    const { data } = await supabase.auth.getSession()
    setResult(JSON.stringify(data, null, 2))
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>交易测试</h1>

      <div style={{ marginBottom: 16, padding: 12, background: user ? '#d4edda' : '#f8d7da', borderRadius: 6, color: '#000' }}>
        {user ? `已登录：${user.email ?? user.id}` : '未登录'}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {user ? (
          <button onClick={logout}>退出登录</button>
        ) : (
          <button onClick={loginWithGitHub}>GitHub 登录</button>
        )}
        <button onClick={getSession}>查看 Session</button>
        <button onClick={initAccount}>初始化账户</button>
        <button onClick={getAccount}>查看账户</button>
        <button onClick={testBuy}>买入 AAPL x1</button>
      </div>
      <pre style={{ background: '#f0f0f0', padding: 20, color: '#000' }}>{result}</pre>
    </div>
  )
}
