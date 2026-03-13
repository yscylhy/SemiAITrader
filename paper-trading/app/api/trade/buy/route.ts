import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../../lib/supabase-server'

export async function POST(request: NextRequest) {
  const { symbol, quantity, price } = await request.json()

  if (!symbol || !quantity || !price) {
    return NextResponse.json(
      { error: 'symbol, quantity, price are required' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('execute_buy', {
    p_symbol: symbol.toUpperCase(),
    p_quantity: quantity,
    p_price: price,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
