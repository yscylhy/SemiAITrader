# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

> **Known issue:** Port 3000 may be occupied by a stale process. If `npm run dev` starts on a port other than 3000, run:
> ```bash
> kill -9 $(lsof -ti :3000)
> rm -rf .next/dev/lock
> npm run dev
> ```

## Architecture

This is a **paper stock trading simulator** — Next.js full-stack app using App Router. All business logic (account init, buy, sell atomicity) lives in Supabase RPC functions, not in API routes.

### Supabase clients

Two separate clients — use the right one for the context:

- `lib/supabase.ts` — `createClient()`, browser-side (client components)
- `lib/supabase-server.ts` — `createServerSupabaseClient()` (async), server-side (API routes, Server Components), uses Next.js cookies for session

### API Routes → Supabase RPC mapping

| Route | Method | RPC / Table |
|---|---|---|
| `/api/account` | GET | `accounts` table |
| `/api/account` | POST | `init_account()` |
| `/api/trade/buy` | POST | `execute_buy(p_symbol, p_quantity, p_price)` |
| `/api/trade/sell` | POST | `execute_sell(p_symbol, p_quantity, p_price)` |
| `/api/quote?symbol=` | GET | Finnhub API + `quote_cache` table (15 min TTL) |

### Database tables

```sql
accounts      -- user_id, cash_balance (default $100,000)
positions     -- user_id, symbol, quantity, avg_cost
trades        -- user_id, symbol, action, quantity, price, total
quote_cache   -- symbol, price, change_percent, updated_at
```

### Environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://lurxisowppcpkhenczkj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
FINNHUB_API_KEY=...
```

## Current Status

**Completed:** project init, Vercel deploy (root dir: `paper-trading`), Supabase integration with RLS, Finnhub quotes + caching, trade RPC functions, all API routes.

**Next step:** Build frontend pages — Dashboard, Trade, Portfolio.

**Open issues:**
- GitHub OAuth local login broken — login redirects to a stale page, suspected cause is non-fixed local port mismatching the callback URL
- Supabase dashboard → URL Configuration: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**` and `https://semi-ai-trader.vercel.app/**`
- GitHub OAuth App callback URL: `https://lurxisowppcpkhenczkj.supabase.co/auth/v1/callback`

**Test pages** (not production UI):
- `/test` — Supabase connection smoke test
- `/test-trade` — manual trade testing with GitHub OAuth
