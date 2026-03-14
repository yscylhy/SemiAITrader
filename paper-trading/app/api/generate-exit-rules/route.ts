import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { description, symbol } = await request.json()

  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1000,
        system: `You are a financial rule parser. Convert natural language exit strategy descriptions into structured JSON.

Return ONLY valid JSON in this exact format, no other text:
{
  "hold_type": "short_term" or "long_term",
  "max_hold_days": number or null,
  "rules": [
    {
      "condition": "gain_pct" | "loss_pct" | "gain_pct_1w" | "loss_pct_1w" | "gain_pct_1m" | "loss_pct_1m",
      "threshold": number (always positive),
      "window_days": number,
      "action": "sell_all" | "sell_half" | "sell_quarter"
    }
  ]
}`,
        messages: [
          {
            role: 'user',
            content: `Stock: ${symbol || 'unknown'}\nStrategy: ${description}`,
          },
        ],
      }),
    })

    const responseText = await response.text()
    console.log('Anthropic response status:', response.status)
    console.log('Anthropic response body:', responseText)

    if (!response.ok) {
      return NextResponse.json({ error: `Anthropic API error: ${responseText}` }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    const text = data.content[0].text
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const exit_rules = JSON.parse(cleaned)    

    return NextResponse.json({ exit_rules })

  } catch (e: any) {
    console.error('Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
