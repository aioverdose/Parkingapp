# SpotMatch — Street Parking Matching Service

Real-time parking spot sharing app. Next.js 16, Supabase, Maplibre GL, Tailwind CSS.

## Features

- **Spot Handoffs** — Post your spot when you leave, claim spots that fit your vehicle
- **Vehicle Matching** — Specify your vehicle type; only see compatible spots
- **Lightweight Rankings** — 7-day/30-day streaks, neighborhood leaderboard (anonymous), impact metrics ("You saved X hours")
- **Limited Social** — Ephemeral spot handoff chat (auto-closes after handoff or 30min), departure pings ("leaving in 10 min" broadcast to nearby users)
- **TOS Gate** — Scrollable TOS modal on sign-up, version+hash+timestamp stored in user record, server-side validation, re-present on major version updates
- **Real-time** — Live spot updates via Supabase Realtime
- **Map** — Maplibre GL (OpenFreeMap tiles, no paid API)

## Environment Variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_MAP_DEFAULT_LAT=33.7701
NEXT_PUBLIC_MAP_DEFAULT_LNG=-118.1937
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
```

## Database Setup

Run migrations in order from `supabase/migrations/` in the Supabase SQL editor:

1. `00001_schema.sql` — Base schema (users, parking_spots, tips, notifications)
2. `00002_vehicle_type.sql` — Vehicle type columns
3. `00003_tos_rankings.sql` — TOS columns, contribution_stats table
4. `00004_ephemeral.sql` — Ephemeral chats, messages, departure pings
5. `00005_ttl_cron.sql` — TTL cleanup functions, auto-close chat on claim, stats triggers

Also enable the `pg_cron` extension in Supabase and schedule:

```sql
select cron.schedule('ttl-cleanup-chats', '*/5 * * * *', 'select public.cleanup_ephemeral_chats()');
select cron.schedule('ttl-cleanup-pings', '*/5 * * * *', 'select public.cleanup_departure_pings()');
select cron.schedule('maintain-streaks', '0 0 * * *', 'select public.maintain_streaks()');
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed Data

```bash
npm run seed
```

Creates 5 demo users (password: `demo123456`). Re-run to refresh spots.

## TTL Cleanup (Local)

```bash
npm run ttl-cleanup
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Main map view (SPA) |
| `/auth/signup` | Sign up with TOS gate |
| `/tos/latest` | Latest Terms of Service |
| `/tos/review` | Re-accept TOS on version update |
| `/rankings` | Neighborhood leaderboard & impact |

## Deploy to Vercel

1. Push to GitHub
2. Import into Vercel
3. Add environment variables from `.env.local`
4. Deploy

The Supabase instance handles auth, database, and real-time — no other external services needed.
