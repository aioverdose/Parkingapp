# SpotMatch — Street Parking Matching Service

Real-time parking spot sharing app. Next.js 16, Supabase, Maplibre GL, Tailwind CSS.

## Features

- **Departure Coordination** — Share an expected departure and coordinate with drivers whose timing fits
- **Vehicle Matching** — Specify your vehicle type; only see compatible spots
- **Lightweight Rankings** — 7-day/30-day streaks, neighborhood leaderboard (anonymous), impact metrics ("You saved X hours")
- **Limited Social** — Ephemeral spot handoff chat (auto-closes after handoff or 30min), departure pings ("leaving in 10 min" broadcast to nearby users)
- **TOS Gate** — Scrollable TOS modal on sign-up, version+hash+timestamp stored in user record, server-side validation, re-present on major version updates
- **Real-time** — Live spot updates via Supabase Realtime
- **Map** — Maplibre GL (OpenFreeMap tiles, no paid API)

## Environment Variables

### OpenStreetMap reference imports

Administrators can import bounded OpenStreetMap parking references from `/admin/osm-import`. Imports are fetched server-side from an allowlisted Overpass endpoint, reviewed, and published separately from user-generated parking spots. Published records are reference data only and must display OpenStreetMap/ODbL attribution; they do not claim availability or guaranteed access.

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

Apply the migrations from `supabase/migrations/` using the Supabase CLI. The
repository currently contains 53 migration files, including two historical
duplicate version prefixes (`00019` and `00020`). Do not rename or replay those
files against an existing project without first reconciling the project's
`supabase_migrations.schema_migrations` history. See `supabase/migrations/README.md`.

The original foundation is:

1. `00001_schema.sql` — Base schema (users, parking_spots, tips, notifications)
2. `00002_vehicle_type.sql` — Vehicle type columns
3. `00003_tos_rankings.sql` — TOS columns, contribution_stats table
4. `00004_ephemeral.sql` — Ephemeral chats, messages, departure pings
5. `00005_ttl_cron.sql` — TTL cleanup functions, auto-close chat on claim, stats triggers

Later migrations add realtime handoffs, matching, business networks, SpotQuest,
admin tooling, retention, and the business directory. Review all migration
files before production deployment rather than relying on this abbreviated list.

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

For local or controlled staging tests when SMS/A2P delivery is unavailable, create
synthetic preverified users with:

```bash
npm run create-synthetic-users
```

This uses reserved `.test` email addresses and `555` phone numbers. These users
are preverified only for testing and must never be used as a production signup
or phone-verification bypass.

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
| `/business` | Business and network coordination |
| `/admin` | Administrative operations and testing |

## Deploy to Vercel

1. Push to GitHub
2. Import into Vercel
3. Add environment variables from `.env.local`
4. Deploy

The Supabase instance handles auth, database, and real-time — no other external services needed.
