import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase'

export async function POST() {
  const supabase = createClient()
  const { error } = await supabase.rpc('init_account')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .single()

  return NextResponse.json(account)
}

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
