import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用 service role key，绕过 RLS，可以读取所有用户数据
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // 验证请求来自 GitHub Actions
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 获取所有有退出规则的持仓
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*, accounts(cash_balance)')
    .not('exit_rules', 'eq', '{}')
    .gt('quantity', 0)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!positions || positions.length === 0) {
    return NextResponse.json({ message: 'no positions to check', checked: 0 })
  }

  const results = []

  for (const position of positions) {
    const { symbol, quantity, avg_cost, exit_rules, user_id, created_at } = position

    // 获取当前价格
    const quoteRes = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
    )
    const quote = await quoteRes.json()
    const currentPrice = quote.c
    if (!currentPrice) continue

    const rules = exit_rules?.rules || []
    const maxHoldDays = exit_rules?.max_hold_days

    // 检查最大持有天数
    if (maxHoldDays) {
      const daysSinceBuy = (Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceBuy >= maxHoldDays) {
        await executeSell(user_id, symbol, quantity, currentPrice, 'max_hold_days_reached')
        results.push({ symbol, action: 'sell_all', reason: 'max_hold_days_reached' })
        continue
      }
    }

    // 检查每条规则
    for (const rule of rules) {
      const { condition, threshold, action } = rule
      const gainPct = ((currentPrice - avg_cost) / avg_cost) * 100

      let triggered = false

      if (condition === 'gain_pct' && gainPct >= threshold) triggered = true
      if (condition === 'loss_pct' && gainPct <= -threshold) triggered = true

      // 周/月维度暂时用同样的逻辑（可以后续扩展历史价格比较）
      if (condition === 'gain_pct_1w' && gainPct >= threshold) triggered = true
      if (condition === 'loss_pct_1w' && gainPct <= -threshold) triggered = true
      if (condition === 'gain_pct_1m' && gainPct >= threshold) triggered = true
      if (condition === 'loss_pct_1m' && gainPct <= -threshold) triggered = true

      if (triggered) {
        let sellQty = quantity
        if (action === 'sell_half') sellQty = quantity / 2
        if (action === 'sell_quarter') sellQty = quantity / 4

        await executeSell(user_id, symbol, sellQty, currentPrice, `rule: ${condition} ${threshold}%`)
        results.push({ symbol, action, reason: `${condition} triggered at ${gainPct.toFixed(2)}%` })
        break // 一次只触发一条规则
      }
    }
  }

  return NextResponse.json({
    message: 'check complete',
    checked: positions.length,
    triggered: results.length,
    results,
  })
}

async function executeSell(
  userId: string,
  symbol: string,
  quantity: number,
  price: number,
  reason: string
) {
  // 执行卖出
  const { error } = await supabase.rpc('execute_sell', {
    p_symbol: symbol,
    p_quantity: quantity,
    p_price: price,
  })

  if (error) {
    console.error(`Failed to sell ${symbol} for user ${userId}:`, error)
    return
  }

  // 记录检查历史
  await supabase.from('exit_checks').insert({
    user_id: userId,
    symbol,
    rule_triggered: reason,
    action_taken: `sold ${quantity} shares`,
    price_at_check: price,
  })

  console.log(`✓ Sold ${quantity} ${symbol} @ $${price} for user ${userId} (${reason})`)
}
