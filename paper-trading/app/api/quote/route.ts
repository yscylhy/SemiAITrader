import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase'

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY
const CACHE_MINUTES = 15

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  const supabase = createClient()

  // 先查缓存
  const { data: cached } = await supabase
    .from('quote_cache')
    .select('*')
    .eq('symbol', symbol)
    .single()

  if (cached) {
    const age = (Date.now() - new Date(cached.updated_at).getTime()) / 1000 / 60
    if (age < CACHE_MINUTES) {
      return NextResponse.json({ ...cached, from_cache: true })
    }
  }

  // 缓存过期或不存在，调 Finnhub
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
  )
  const data = await res.json()

  if (!data.c || data.c === 0) {
    return NextResponse.json({ error: 'symbol not found' }, { status: 404 })
  }

  const quote = {
    symbol,
    price: data.c,           // 当前价格
    change_percent: ((data.c - data.pc) / data.pc) * 100,
    updated_at: new Date().toISOString(),
  }

  // 写入缓存
  await supabase.from('quote_cache').upsert(quote)

  return NextResponse.json(quote)
}

