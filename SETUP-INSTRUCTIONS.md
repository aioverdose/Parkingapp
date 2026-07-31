# ParkingApp Setup Instructions

## 1. Configure Supabase Credentials

Go to https://supabase.com → Your Project → **Project Settings** → **API**

Copy these values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 2. Run All 27 Database Migrations

### Option A — Supabase SQL Editor (easiest)

1. Go to Supabase Dashboard → **SQL Editor**
2. Open each file from `supabase/migrations/` **in numeric order**:

| Order | File |
|-------|------|
| 1 | `00001_schema.sql` |
| 2 | `00002_vehicle_type.sql` |
| 3 | `00003_tos_rankings.sql` |
| 4 | `00004_ephemeral.sql` |
| 5 | `00005_ttl_cron.sql` |
| 6 | `00006_admin_ads.sql` |
| 7 | `00007_ad_clicks.sql` |
| 8 | `00008_spot_requests.sql` |
| 9 | `00009_fix_contribution_stats.sql` |
| 10 | `00010_apply_all.sql` |
| 11 | `00011_agents.sql` |
| 12 | `00012_user_parking_spots.sql` |
| 13 | `00013_user_flow_tos_sweeping.sql` |
| 14 | `00014_security_layer.sql` |
| 15 | `00015_courses_ranking.sql` |
| 16 | `00016_spotmatch.sql` |
| 17 | `00017_phone_otp.sql` |
| 18 | `00018_control_tower.sql` |
| 19 | `00019_live_location_sharing.sql` |
| 20 | `00019_spot_waitlist.sql` |
| 21 | `00020_admin_rls_policies.sql` |
| 22 | `00020_recurring_schedules.sql` |
| 23 | `00021_spotquest.sql` |
| 24 | `00022_vehicle_type.sql` |
| 25 | `00023_relay_mode.sql` |
| 26 | `00024_user_schedule.sql` |
| 27 | `00025_device_push_subscriptions.sql` |

Copy-paste each file's contents into the SQL Editor and click **Run**.

> Files `00019` and `00020` each have two files — apply them in the order listed above.

### Option B — Combined single file (faster)

A combined migration file already exists at:
- `G:\parkingapp\combined_migration.sql`

You can copy the entire contents of that file and paste it into the Supabase SQL Editor, then click **Run**. This runs everything at once.

## 3. Configure Additional Environment Variables

After Supabase is set up, add these to `.env.local`:

```
# Map defaults (Long Beach, CA)
NEXT_PUBLIC_MAP_DEFAULT_LAT=33.7701
NEXT_PUBLIC_MAP_DEFAULT_LNG=-118.1937
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty

# Phone verification (optional — set to false to skip)
PHONE_VERIFICATION_ENABLED=false

# Twilio (only needed if phone verification is enabled)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Web Push notifications (VAPID keys)
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:your@email.com
```

## 4. Deploy to Vercel

```bash
git add .
git commit -m "Complete setup"
git push origin main
```

Vercel will auto-deploy. Then add all the same environment variables to your Vercel project settings:
- Vercel Dashboard → Project → **Settings** → **Environment Variables**
- Add every var from `.env.local`

## 5. Enable Supabase Auth

In Supabase Dashboard → **Authentication** → **Providers**:
- Enable **Email** (turn off "Confirm email" for now)
- Enable **Phone** if using Twilio

## 6. Verify the Build

```bash
npm run build
```

If it passes, the app is ready.

## What's Already Built (no action needed)

- User auth (email + phone OTP)
- Main map with MapLibre GL
- Post/claim parking spots
- Match system with two-party confirmation
- Voice-guided turn-by-turn navigation (OSRM + Web Speech API)
- Courses & ranking system (5 courses)
- SpotQuest gamification (XP, badges, quests, leaderboard)
- Push notifications (match found, partner arrived)
- Street sweeping alerts (Long Beach)
- Admin dashboard
- Ephemeral chat
- Rating & flag system
- Live location sharing
- PWA support
- Recurring schedules
