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
| Linting | ESLint 9 with eslint-config-next |
| Testing | Vitest 4.1.9 |
| PWA | Service Worker + manifest.json for installable offline mode |

---

## Project Structure

```
G:\parkingapp\
├── src/
│   ├── app/                    # Next.js App Router pages + API routes
│   │   ├── layout.tsx          # Root layout (fonts, PWA, globals)
│   │   ├── page.tsx            # Home page (map + hero overlay)
│   │   ├── auth/signup/        # Sign-up page with vehicle type
│   │   ├── admin/              # Admin panel (dashboard, ads, users, flags)
│   │   ├── api/                # 28 API route handlers
│   │   │   ├── spots/          # CRUD for parking spots
│   │   │   ├── matches/        # Matching engine + confirm/reject + list
│   │   │   ├── auth/           # Phone verification
│   │   │   ├── agents/         # AI agent triggers (demand match, congestion, etc.)
│   │   │   ├── parking-spots/  # Saved/favorite spots
│   │   │   ├── courses/        # Educational courses API
│   │   │   ├── flags/          # Flag inappropriate spots
│   │   │   └── ...             # Ratings, stats, TOS, street sweeping
│   │   ├── profile/            # User profile with map + stats
│   │   ├── settings/           # Name, vehicle type settings
│   │   ├── courses/            # Educational courses + quizzes
│   │   ├── notifications/      # Notification history
│   │   ├── rankings/           # Community leaderboard
│   │   ├── tos/                # Terms of Service
│   │   └── ...                 # FAQ, privacy policy, member profile
│   ├── components/             # ~30 React components
│   │   ├── ParkingMap.tsx      # Main full-screen map (1200 lines, core component)
│   │   ├── PostSpotForm.tsx    # Spot listing form (location + departure/return times)
│   │   ├── MatchList.tsx       # Match management UI (accept/reject/chat)
│   │   ├── ActionButtons.tsx   # "List My Spot" / "My Matches" buttons
│   │   ├── SpotMarker.tsx      # Map marker with countdown + vehicle type
│   │   ├── SpotDetails.tsx     # Bottom sheet when tapping a spot
│   │   ├── EphemeralChat.tsx   # Temporary chat between matched users
│   │   ├── Auth.tsx            # Login/signup form
│   │   ├── TOSModal.tsx        # Terms of Service agreement
│   │   ├── SafetyWarningModal.tsx  # Safety disclaimer
│   │   ├── PhoneVerificationModal.tsx  # Phone code verification
│   │   ├── StatsDashboard.tsx  # User statistics dashboard
│   │   ├── AdBanner.tsx        # Geo-targeted ads
│   │   ├── SpotRequestMarker.tsx   # "Looking for spot" orange marker
│   │   ├── DeparturePingMarker.tsx # Departure announcement marker
│   │   ├── StreetSweepingBanner.tsx  # Street sweeping alerts
│   │   ├── PilotAreaWarning.tsx  # Geographic boundary warning
│   │   ├── FlagSpotModal.tsx   # Report inappropriate spot
│   │   ├── RatingModal.tsx     # Post-handoff rating
│   │   └── ... admin components, course cards, rank badges, etc.
│   ├── hooks/                  # Custom React hooks
│   │   ├── useRealtimeSpots.ts # Supabase Realtime subscription for spots
│   │   ├── useNotifications.ts # Real-time notification listener
│   │   ├── useLeavingTimer.ts  # Countdown to departure time
│   │   └── useExpirationTimer.ts  # Countdown to spot expiration
│   ├── lib/                    # Utilities and shared code
│   │   ├── database.types.ts   # Full Supabase TypeScript type definitions
│   │   ├── api-client.ts       # Client-side API fetch wrapper
│   │   ├── supabaseClient.ts   # Browser Supabase client singleton
│   │   ├── supabaseAdmin.ts    # Admin Supabase client (service role)
│   │   ├── vehicle-types.ts    # Vehicle type constants (compact, sedan, SUV, truck, van, motorcycle)
│   │   ├── map.ts              # Map constants (initial view, style URLs)
│   │   ├── geocode.ts          # Forward/reverse geocoding via Nominatim
│   │   ├── reverse-geocode.ts  # Street-level reverse geocoding
│   │   ├── parking-spot.ts     # Server actions for saved spots
│   │   ├── pilot-area.ts       # Geographic boundary checking
│   │   ├── street-sweeping.ts  # Street sweeping schedule queries
│   │   ├── ranking.ts          # Rank tier thresholds and helpers
│   │   ├── tos.ts              # TOS version/content management
│   │   ├── utils.ts            # cn() classname utility
│   │   ├── api/                # Auth helpers, rate limiting
│   │   └── agents/             # 5 AI agents (demand match, congestion, growth, prediction, ads)
│   └── scripts/                # Cron setup guide
├── supabase/
│   └── migrations/             # 16 SQL migration files
│       ├── 00001_schema.sql    # Base tables (users, parking_spots, tips, notifications)
│       ├── 00002_vehicle_type.sql
│       ├── 00003_tos_rankings.sql
│       ├── 00004_ephemeral.sql  # Ephemeral chats + messages
│       ├── 00005_ttl_cron.sql   # TTL cleanup functions
│       ├── 00006_admin_ads.sql
│       ├── 00007_ad_clicks.sql
│       ├── 00008_spot_requests.sql
│       ├── 00009-00015         # Additional features
│       └── 00016_spotmatch.sql # Rename leaving_at→departure_time, add return_time, spot_matches table
├── public/
│   ├── manifest.json           # PWA manifest (name: "SpotMatch")
│   ├── sw.js                   # Service Worker for offline caching
│   └── icons/                  # App icons
├── scripts/                    # Seed data + TTL cleanup scripts
└── package.json                # Dependencies and scripts
```

---

## Database Schema (Supabase PostgreSQL)

### Core Tables

**users** — User profiles
- `id` (UUID, PK), `email`, `name`, `avatar_url`, `phone`, `vehicle_type`, `role` (user/admin/moderator)
- `tos_version`, `tos_hash`, `tos_signed_at` — TOS tracking
- `created_at`

**parking_spots** — Spot listings (renamed from original schema)
- `id` (UUID, PK), `user_id` (FK→users), `latitude`, `longitude`, `address`
- `departure_time` (TIMESTAMPTZ) — when the owner leaves
- `return_time` (TIMESTAMPTZ, nullable) — when the owner returns
- `status` — 'active', 'taken', 'expired'
- `vehicle_type`, `claimed_by`, `flag_count`, `expires_at`
- `created_at`

**spot_matches** — Bidirectional matching (NEW)
- `id` (UUID, PK), `spot_id` (FK→parking_spots), `spot_owner_id` (FK→users), `seeker_id` (FK→users)
- `status` — 'pending', 'confirmed_by_owner', 'confirmed_by_seeker', 'confirmed', 'rejected', 'expired'
- `created_at`, `updated_at`
- Auto-trigger: creates notifications for both parties on match creation
- Auto-trigger: notifies both parties when match reaches 'confirmed' status

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `notifications` | In-app notification queue with type, title, message |
| `ephemeral_chats` | Temporary chats (auto-expire 30min) between matched users |
| `ephemeral_messages` | Messages within ephemeral chats |
| `spot_requests` | Users actively looking for a spot (with location, radius, vehicle type) |
| `departure_pings` | Imminent departure announcements (legacy feature) |
| `tips` | Monetary tips between users |
| `user_ranking` | Rank tier, points, trust score, handoff count |
| `user_parking_spots` | User's saved/favorite parking spots |
| `contribution_stats` | Aggregated user metrics |
| `courses` + `user_course_progress` | Educational courses with quizzes |
| `ads` + `ad_analytics` | Geo-targeted ad campaigns |
| `pilot_areas` + `street_sweeping` | Geographic boundaries and street cleaning schedules |
| `user_ratings` | Post-handoff ratings (1-5 stars) |
| `spot_flags` | User-flagged spots for moderation |

---

## Core App Flow

### 1. User Onboarding
1. User lands on home page with full-screen map and SpotMatch hero overlay
2. "Find a Match" CTA leads to signup (name, email, password, vehicle type selection)
3. Location permission overlay (required for map features)
4. TOS acceptance modal
5. Safety warning acknowledgment
6. Phone verification (required before posting)

### 2. Listing a Spot
1. User taps "List My Spot" (primary action button)
2. GPS location request (with accuracy targeting ≤50m)
3. Address reverse-geocoded from coordinates via Nominatim
4. User picks **departure time** (datetime-local picker) — must be in future
5. User picks **return time** (datetime-local picker) — must be after departure
6. User selects **vehicle type** that fits the spot
7. On submit, POST to `/api/spots` with `departure_time`, `return_time`, `latitude`, `longitude`, `address`, `vehicle_type`
8. Server validates schedule, sets `expires_at` = `return_time` (or +2h if no return time)
9. Spot inserted with status='active'
10. Server **asynchronously triggers** the matching engine via POST `/api/matches/find`

### 3. Matching Engine (`/api/matches/find`)
1. Loads the newly created spot
2. Fetches all active spot requests that haven't expired
3. For each request, checks three compatibility criteria:
   - **Location**: Haversine distance ≤ 200 meters between spot and seeker
   - **Vehicle type**: Both null/any, or exact match
   - **Schedule**: Seeker's desired window must overlap with spot's available window
4. Creates `spot_matches` records (skipping existing/rejected ones)
5. Database triggers auto-create notifications for both parties
6. Returns count of matches created

### 4. Bidirectional Confirmation
1. Both users receive in-app notification (with sound) that a match was found
2. Users open "My Matches" to see pending matches
3. Each user sees: spot address, schedule, other driver's name + vehicle type
4. Status badges show "You: Pending/Confirmed" and "Them: Pending/Confirmed"
5. **Confirm action**:
   - Owner confirms → `pending` → `confirmed_by_owner`
   - Seeker confirms → `pending` → `confirmed_by_seeker`
   - If owner confirms first and seeker confirms → `confirmed`
   - If seeker confirms first and owner confirms → `confirmed`
6. On `confirmed` → spot status set to 'taken', `claimed_by` set to seeker
7. Both parties get notified: "Match confirmed! Chat to coordinate."
8. **Reject action** → match set to 'rejected', other party notified
9. Users can tap "Chat & Coordinate" to open ephemeral chat

### 5. Ephemeral Chat
- Opens temporary chat between matched users
- Messages stored in `ephemeral_messages` table
- Chat auto-expires after 30 minutes
- Both users can send messages to coordinate handoff time/location

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/spots` | List active parking spots |
| POST | `/api/spots` | Create a spot listing (triggers matching engine) |
| POST | `/api/spots/[id]/claim` | Claim a spot (legacy, now via match confirmation) |
| POST | `/api/spots/[id]/cancel` | Cancel a spot listing |
| POST | `/api/spots/[id]/tip` | Send a tip |
| GET | `/api/matches` | List matches for current user (filter by status) |
| POST | `/api/matches/find` | Run matching engine for a spot |
| POST | `/api/matches/[id]` | Confirm or reject a match |
| GET | `/api/parking-spots/get` | Get user's saved spots |
| POST | `/api/parking-spots/save` | Save a parking spot location |
| DELETE | `/api/parking-spots/delete` | Delete a saved spot |
| GET | `/api/auth` | Get authenticated user |
| POST | `/api/auth/phone-request` | Request phone verification code |
| POST | `/api/auth/phone-verify` | Verify phone code |
| POST | `/api/flags/add` | Flag an inappropriate spot |
| POST | `/api/ratings/add` | Rate a handoff (1-5 stars) |
| POST | `/api/tos/accept` | Accept Terms of Service |
| GET | `/api/stats` | Get user statistics |
| GET | `/api/courses` | List courses |
| GET | `/api/courses/[id]` | Get course |
| POST | `/api/courses/[id]/submit` | Submit quiz answers |
| GET | `/api/street-sweeping/get` | Get street sweeping schedule |
| POST | `/api/location/permission` | Save location permission |
| * | `/api/ads/[id]/*` | Ad impression/click tracking |
| * | `/api/agents/*` | 5 AI agent endpoints |

---

## Map Implementation

- **Library**: MapLibre GL via react-map-gl
- **Tile Source**: OpenFreeMap (free, no API key) — `https://tiles.openfreemap.org/styles/liberty`
- **Satellite**: ArcGIS World Imagery (hardcoded raster URL)
- **Default Center**: Long Beach, CA (33.7701, -118.1937), zoom 13
- **Search**: Nominatim OpenStreetMap geocoding (forward + reverse)
- **Features**:
  - Navigation controls (zoom, compass)
  - Geolocation with accuracy ring indicator
  - Satellite/Street view toggle
  - Search bar with autocomplete
  - Real-time spot markers with countdown timers
  - User location marker with ±accuracy label
  - Vehicle-type badges on markers

---

## Key Component Behaviors

### ParkingMap.tsx (~1200 lines)
The central orchestrator managing:
- Auth session + profile loading
- Location permission flow (3-step: overlay → GPS → TOS → safety → phone)
- Real-time spot subscription + periodic cleanup every 30s
- Spot request + departure ping fetching
- Street sweeping data per location
- Gating checks (pilot area, rating, flag count, courses)
- Match count polling via `/api/matches?status=pending`
- Notification handling with audio feedback + badge counts
- All modals: spot details, post form, matches, auth, chat, stats, phone verification, safety, TOS, pilot warning

### MatchList.tsx
- Fetches all matches for current user
- Groups into "Pending" and "Confirmed" sections
- Shows: spot address, schedule, other party's name + vehicle type
- Status badges for each party's confirmation state
- Confirm/Decline buttons with loading states
- "Chat & Coordinate" button for confirmed matches
- Auto-refresh after actions

### PostSpotForm.tsx
- 3-step flow: Request GPS → Location denied (browser-specific help) → Form
- GPS watchPosition with 10s timeout, 50m accuracy target
- Reverse geocodes coordinates to street address via Nominatim
- Datetime-local inputs for departure (future-only) and return (after departure)
- Vehicle type selector (any/compact/sedan/SUV/truck/van/motorcycle)
- Info box explaining matching process
- Error handling with inline messages

---

## Security & Gating

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row Level Security on all tables
- **API Auth**: Bearer token from Supabase session, validated via `getAuthenticatedUser()`
- **Rate Limiting**: In-memory rate limiter (10 spots/60s per IP)
- **Phone Verification**: Required before posting spots
- **Safety Acknowledgment**: Modal about not circling/waiting
- **Pilot Areas**: Geographic boundary checking
- **Flag System**: Spots with 5+ flags trigger moderation
- **Rating System**: Low-rated users (<3.0) blocked from posting
- **TOS Gating**: Must accept latest TOS before posting

---

## State Management

- **No external state library** — pure React `useState` + `useEffect`
- **Supabase Realtime** for live data (parking_spots, spot_requests, notifications)
- **Local state**: ~40 useState variables in ParkingMap for UI state
- **Auth state**: Supabase `onAuthStateChange` listener
- **Notification state**: Custom `useNotifications` hook with WebSocket subscription

---

## Migration: ParkingShare → SpotMatch

**Files renamed/referenced (23+ files):**
- All app metadata, manifest, SW cache name, headers, branding text
- FAQ and privacy policy rewritten for matching focus

**Schema changes:**
- `parking_spots.leaving_at` → `parking_spots.departure_time`
- Added `parking_spots.return_time` (nullable)
- New `spot_matches` table with status lifecycle + notification triggers

**New code:**
- Matching engine API (`/api/matches/find`)
- Bidirectional confirmation API (`/api/matches/[id]`)
- Match list API (`/api/matches`)
- MatchList UI component
- Updated PostSpotForm (datetime pickers instead of quick-select minutes)

**Removed concepts:**
- 15-minute maximum lead time (replaced by flexible scheduled times)
- "Leaving Soon" / "Looking for a Spot" as primary flow (replaced by scheduled matching)
- Bronze tier daily limit (replaced by max 3 active listings)

---

## Edge Cases & Constraints

- **Schedule overlap**: Spot must be available (departure→return) overlapping with seeker's desired window
- **Location matching**: Haversine distance ≤ 200m from spot to seeker's request location
- **Vehicle matching**: Both null/any, or exact string match
- **Match deduplication**: Existing non-rejected matches prevent duplicates
- **Spot deduplication**: Max 3 active listings per user
- **Match state machine**: pending → (confirmed_by_owner | confirmed_by_seeker) → confirmed (only when both have confirmed)
- **Expiration**: Spots expire at return_time (or departure_time + 2h if no return time)
