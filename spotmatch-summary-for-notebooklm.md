# SpotMatch — Complete Codebase Summary

## Overview

SpotMatch is a street parking matching service. Drivers list their parking spots with scheduled departure and return times. The system proactively matches them with compatible drivers based on three criteria: location proximity, schedule overlap, and vehicle type. Both parties must confirm the match bidirectionally before they can coordinate via ephemeral chat.

The app was originally "ParkingShare" (a real-time neighbor parking handoff app) and was fully rebranded and refactored into SpotMatch.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.9 (App Router) |
| Language | TypeScript (strict mode) |
| UI | React 19.2.4, Tailwind CSS 3.4.19 |
| Icons | Lucide React 1.18.0 |
| Map Engine | MapLibre GL 5.24.0 via react-map-gl 8.1.1 |
| Map Tiles | OpenFreeMap (free, no API key) + ArcGIS satellite fallback |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Auth | Supabase Auth (email/password) |
| Database | PostgreSQL with Row Level Security |
| Realtime | Supabase Realtime subscriptions (WebSocket) |
| SMS | Twilio (with fallback to dev-mode: any 6-digit code accepted) |
| Linting | ESLint 9 with eslint-config-next |
| Testing | Vitest 4.1.9 |
| PWA | Service Worker + manifest.json |
| Deployment | Vercel (auto-deploys from GitHub push) |

---

## Project Structure

```
G:\parkingapp\
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (fonts, PWA, globals)
│   │   ├── page.tsx             # Home page (full-screen map + hero "Street Parking Logistics")
│   │   ├── error.tsx            # Global error boundary
│   │   ├── auth/signup/         # Sign-up page with vehicle type
│   │   ├── admin/
│   │   │   ├── layout.tsx       # Admin layout with sidebar + mobile nav
│   │   │   ├── page.tsx         # Admin dashboard
│   │   │   ├── ads/             # Ad campaign management
│   │   │   ├── control-tower/   # Live GPS tracking map (owner/seeker positions, ETAs, connection lines)
│   │   │   ├── users/           # User management
│   │   │   ├── flags/           # Flagged content moderation
│   │   │   ├── pilot-areas/     # Geographic boundary configuration
│   │   │   └── street-sweeping/ # Street cleaning schedule management
│   │   ├── api/
│   │   │   ├── spots/           # CRUD for parking spots (triggers matching engine on create)
│   │   │   ├── spots/[id]/claim/# Legacy claim (now via match confirmation)
│   │   │   ├── spots/[id]/cancel/
│   │   │   ├── spots/[id]/tip/
│   │   │   ├── matches/         # List matches for current user
│   │   │   ├── matches/find/    # Matching engine (Haversine, schedule overlap, vehicle type)
│   │   │   ├── matches/[id]/    # Bidirectional confirm/reject
│   │   │   ├── matches/[id]/status/  # Lifecycle: en_route → arrived → departed (with no-show)
│   │   │   ├── location/update/ # GPS ping ingestion + ETA calculation
│   │   │   ├── location/permission/
│   │   │   ├── auth/            # Auth check
│   │   │   ├── auth/phone-request/  # SMS OTP request (Supabase → Twilio → dev fallback)
│   │   │   ├── auth/phone-verify/   # OTP verify (Supabase → Twilio → dev fallback)
│   │   │   ├── admin/control-tower/ # Enriched active matches with driver locations + sessions
│   │   │   ├── admin/run-migration/ # Migration check/apply endpoint
│   │   │   ├── flags/add/       # Flag inappropriate spots
│   │   │   ├── ratings/add/     # Post-handoff rating
│   │   │   ├── tos/accept/      # Accept Terms of Service
│   │   │   ├── stats/           # User statistics
│   │   │   ├── courses/         # Educational courses + quizzes
│   │   │   ├── street-sweeping/ # Street cleaning schedule
│   │   │   ├── ads/[id]/click|impression/  # Ad analytics
│   │   │   └── agents/          # 5 AI agent endpoints
│   │   ├── profile/             # User profile with map + stats
│   │   ├── settings/            # Name, vehicle type, support link
│   │   ├── courses/             # Educational courses + quizzes
│   │   ├── notifications/       # Notification history
│   │   ├── rankings/            # Leaderboard by neighborhood
│   │   ├── tos/                 # Terms of Service
│   │   ├── support/             # Support center hub + getting-started + reporting guides
│   │   └── ...                  # FAQ, privacy-policy, members/profile, etc.
│   ├── components/
│   │   ├── ParkingMap.tsx       # Main full-screen map (1200 lines, core orchestrator)
│   │   ├── PostSpotForm.tsx     # Spot listing (location + departure/return time pickers)
│   │   ├── MatchList.tsx        # Match management (accept/reject, status badges, chat link)
│   │   ├── ActionButtons.tsx    # "List My Spot" / "My Matches" buttons
│   │   ├── SpotMarker.tsx       # Map marker with countdown + vehicle badge
│   │   ├── SpotDetails.tsx      # Bottom sheet when tapping a spot
│   │   ├── EphemeralChat.tsx    # Temporary chat (30min auto-expire)
│   │   ├── Auth.tsx             # Login/signup
│   │   ├── TOSModal.tsx         # Terms of Service agreement
│   │   ├── SafetyWarningModal.tsx
│   │   ├── PhoneVerificationModal.tsx  # Step flow (phone input → code → verified)
│   │   ├── StatsDashboard.tsx
│   │   ├── AdBanner.tsx         # Geo-targeted ads
│   │   ├── SpotRequestMarker.tsx
│   │   ├── DeparturePingMarker.tsx
│   │   ├── StreetSweepingBanner.tsx
│   │   ├── PilotAreaWarning.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useRealtimeSpots.ts
│   │   ├── useNotifications.ts
│   │   ├── useLeavingTimer.ts
│   │   └── useExpirationTimer.ts
│   ├── lib/
│   │   ├── database.types.ts    # Full Supabase TypeScript types (all 18 tables)
│   │   ├── supabaseClient.ts    # Browser Supabase client (typed as any — build optimization)
│   │   ├── supabaseAdmin.ts     # Admin client (service role key)
│   │   ├── haversine.ts         # Shared Haversine distance utility
│   │   ├── error-logger.ts      # Error logging utility
│   │   ├── rate-limit.ts        # In-memory rate limiter
│   │   ├── otp.ts               # OTP generation, E.164 validation, request/verify logic
│   │   ├── twilio.ts            # Twilio client factory
│   │   ├── tracking/useLocationTracking.ts  # GPS tracking hook for Control Tower
│   │   ├── vehicle-types.ts
│   │   ├── map.ts, geocode.ts, reverse-geocode.ts
│   │   ├── parking-spot.ts, pilot-area.ts, street-sweeping.ts
│   │   ├── ranking.ts, tos.ts
│   │   ├── utils.ts
│   │   ├── api/auth-helpers.ts
│   │   └── agents/              # 5 AI agents
│   └── actions/                 # Server actions (social chat, rankings, TOS)
├── supabase/migrations/
│   ├── 00001-00015              # Base schema → various features
│   ├── 00016_spotmatch.sql      # Rename leaving_at→departure_time, add return_time, spot_matches
│   ├── 00017_phone_otp.sql      # phone_otps table for Twilio OTP storage
│   └── 00018_control_tower.sql  # driver_locations + active_sessions tables with Realtime
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service Worker (navigation + static assets only)
│   └── icons/
└── package.json
```

---

## Database Schema (Supabase PostgreSQL)

### Core Tables

**users** — `id` (UUID PK), `email`, `name`, `avatar_url`, `phone`, `phone_verified`, `phone_verified_at`, `vehicle_type`, `role` (user/admin/moderator), `tos_version`, `tos_hash`, `tos_signed_at`, `created_at`

**parking_spots** — `id` (UUID PK), `user_id` (FK), `latitude`, `longitude`, `address`, `departure_time`, `return_time` (nullable), `status` (active/taken/expired), `vehicle_type`, `claimed_by`, `flag_count`, `lead_minutes`, `expires_at`, `tip_message`, `created_at`

**spot_matches** — `id` (UUID PK), `spot_id` (FK), `spot_owner_id` (FK), `seeker_id` (FK), `status` (pending/confirmed_by_owner/confirmed_by_seeker/confirmed/rejected/expired), `created_at`, `updated_at`
- Triggers: auto-notify both parties on create + on confirmed

### Control Tower Tables (NEW in 00018)

**driver_locations** — Realtime GPS pings
- `id` (UUID PK), `user_id` (FK), `match_id` (FK, nullable), `latitude`, `longitude`, `heading`, `speed`, `accuracy`, `recorded_at`
- Realtime publication enabled (live map updates)
- Indexed on (user_id, recorded_at DESC) and (match_id, recorded_at DESC)

**active_sessions** — Per-user-per-match lifecycle
- `id` (UUID PK), `user_id` (FK), `match_id` (FK), `role` (owner/seeker), `status` (en_route/arrived/departed/no_show/completed), `eta_seconds`, `grace_period_ends_at`, `arrived_at`, `departed_at`, `created_at`, `updated_at`

### Supporting Tables

notifications, ephemeral_chats, ephemeral_messages, spot_requests, departure_pings, phone_otps, tips, user_ranking, user_parking_spots, contribution_stats, courses, user_course_progress, ads, ad_analytics, pilot_areas, street_sweeping, user_ratings, spot_flags

---

## Core App Flow

### 1. Onboarding
Home page (full-screen map + "Street Parking Logistics" hero) → Signup (name, email, password, vehicle type) → Location permission overlay → TOS acceptance → Safety acknowledgment → Phone verification (Twilio SMS or dev fallback)

### 2. Listing a Spot
Tap "List My Spot" → GPS getCurrentPosition (high accuracy, timeout → fallback) → Reverse geocode via Nominatim → Set departure time + return time (datetime-local pickers) → Select vehicle type → POST `/api/spots` → Server validates + inserts → Async trigger `/api/matches/find`

### 3. Matching Engine (`/api/matches/find`)
Loads new spot → Fetches active spot_requests → For each: Haversine ≤200m, schedule overlap, vehicle type match → Creates spot_matches (skip existing/rejected) → DB triggers auto-notify both parties

### 4. Bidirectional Confirmation
Both receive notification → Open "My Matches" → See spot address, schedule, other party → Confirm → State machine: pending → confirmed_by_owner|seeker → confirmed (both needed) → On confirmed: spot → taken, seeker = claimed_by, notify both → Chat opens

### 5. Control Tower (Admin)
Admin goes to `/admin/control-tower` → Live map with: owner markers (purple, heading arrow), seeker markers (blue, heading arrow), spot markers (green), dashed connection lines, ETAs, status badges → Sidebar lists all active matches → Real-time via Supabase Realtime subscriptions to driver_locations + active_sessions + spot_matches → Client: useLocationTracking hook with watchPosition + 15s interval

### 6. No-Show Handling
Matched user status lifecycle: en_route → arrived → departed → no_show (with grace period). Departed (owner) → notifies seeker "Spot is ready!". Arrived (seeker) → notifies owner "Driver arrived". No-show → releases match, notifies other party, re-activates spot.

---

## API Routes (33 total)

| Method | Path | Rate Limit | Purpose |
|--------|------|------------|---------|
| GET | `/api/spots` | — | List active spots |
| POST | `/api/spots` | 10/min per IP | Create spot + trigger matching |
| POST | `/api/spots/[id]/claim` | 20/min per IP | Legacy claim |
| POST | `/api/spots/[id]/cancel` | 10/min per user | Cancel listing |
| POST | `/api/spots/[id]/tip` | 10/min per IP | Send tip |
| GET | `/api/matches` | — | List user matches |
| POST | `/api/matches/find` | — | Run matching engine |
| POST | `/api/matches/[id]` | — | Confirm/reject match |
| POST | `/api/matches/[id]/status` | 30/min per user | Update lifecycle status |
| POST | `/api/location/update` | 60/min per user | GPS ping + ETA calculation |
| GET | `/api/admin/control-tower` | 30/min per admin | Active matches + driver locations |
| POST | `/api/admin/run-migration` | — | Migration check tool |
| POST | `/api/auth/phone-request` | 5/min per IP | Request SMS OTP |
| POST | `/api/auth/phone-verify` | 10/min per IP | Verify OTP code |
| POST | `/api/flags/add` | 5/min per user | Flag spot |
| ... | *others* | — | ratings, courses, ads, agents, etc. |

---

## Phone Verification (Triple-Fallback)
1. Try Supabase `signInWithOtp()` (built-in SMS via Twilio configured in Supabase dashboard)
2. Fall back to direct Twilio SDK call + local `phone_otps` table (if Twilio env vars set)
3. Fall back to dev mode (any 6-digit code accepted, with warning banner)

---

## Key Decisions
- **No state library** — pure React useState + useEffect
- **Supabase as `any`** — `createClient<any>()` to avoid generated-type incompatibility
- **Fire-and-forget matching** — matching engine triggered async after spot creation
- **In-memory rate limiting** — simple Map-based, resets every 60s (cleaned up by interval)
- **Service worker** — only intercepts navigation + static assets (NOT API calls to avoid "offline" errors)
- **MapLibre + OpenFreeMap** — free tiles, no API key required
- **Shared Haversine** — extracted to `lib/haversine.ts` (used by matching engine + control tower ETA)

---

## Edge Cases & Constraints
- Max 3 active listings per user
- Schedule overlap matching (departure→return overlaps seeker's window)
- Haversine distance ≤ 200m for location matching
- Match deduplication (existing non-rejected matches prevent duplicates)
- Spots expire at return_time (or departure + 2h)
- Low-rated users (<3.0) blocked from posting
- 5+ flags on a spot triggers moderation
- Pilot area boundary gating
- TOS must be accepted before posting
- Phone must be verified before posting

---

## Deployment
- **Hosting**: Vercel (auto-deploys on git push to main branch)
- **URL**: https://parkingapp-pi.vercel.app
- **Build**: 51 pages, 33 API routes, zero errors
- **Supabase**: 18 migrations applied, project `gxncvraqqxlfziiymsxb.supabase.co`
- **Git**: `origin → https://github.com/aioverdose/Parkingapp.git`
