import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
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
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
