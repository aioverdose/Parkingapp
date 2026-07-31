# SpotMatch — Parking App Summary

## Overview
SpotMatch is a mobile-first progressive web app for sharing real-time parking spot departures. Built with Next.js 16, Supabase (PostgreSQL + realtime), and MapLibre GL (OpenFreeMap tiles). Designed for Long Beach, CA. It's an "imminent departure alert" system — not a reservation platform.

## How It Works
1. **Post a spot**: User taps "LEAVING SOON", selects a 5/10/15-min lead time, and their spot appears as a blue pin on the map with a live countdown.
2. **Claim a spot**: Another user taps a pin, sees details (owner rank, lead time), starts an ephemeral chat, or claims it. Atomic claim — first come, first served.
3. **Auto-expiration**: Spots expire after the lead time elapses. All alerts are ephemeral by design (prevents neighborhood disruption).
4. **Real-time**: Supabase Realtime channels push live spot updates, notifications, and chat messages.

## Key Features
- **Map-centric UI** — Full-screen MapLibre GL map with spot markers, user location, spot-request markers, departure pings, satellite/street toggle
- **Ranking & Trust System** — 5 educational courses with quizzes (street parking law, safety, privacy, street sweeping). Rank tiers: Bronze (1 post/day), Silver (unlimited), Gold (priority), Community Partner (mod potential). Points from courses (+100), handoffs (+10), flags (-20). Trust score starts at 5.0
- **Safety-first** — Max 15-min lead time, phone verification, safety acknowledgment modal, TOS gate, flag system for bad spots, rate limiting (10 spots/60s per IP), pilot area gating
- **Social** — Ephemeral chat between poster/claimer (auto-closes after handoff or 30min), departure pings broadcast to nearby users, peer-to-peer tips ($1/$2/$5)
- **Street Sweeping** — Long Beach street sweeping schedule integrated with alerts
- **Saved Spots** — Save parking locations with GPS accuracy check
- **Ad Platform** — Geo-targeted ads with impression/click tracking and admin management

## Admin Dashboard
Role-based (admin/moderator) panel accessible from the profile page with full sidebar navigation:

- **Dashboard** — Aggregated metrics: total users, active spots, active ads, active chats. Agent metrics (18 cards) covering active users, alerts, retention, congestion, ad impressions/clicks, predictions, and invites. Top 5 neighborhoods bar chart. Ad performance table with CTR.
- **Control Tower** — Full-screen real-time GPS map showing active matches with owner/seeker locations (color-coded markers), spot locations, dashed route lines, and ETA. Sidebar with Matches/Users tabs. Live via Supabase Realtime + 10s polling. Rate-limited (30 req/60s).
- **Ad Campaigns** — Full CRUD for ads. Fields: title, business name, tagline, image URL, link URL, end date, active toggle. List view with impression/click/CTR metrics. Impression and click tracking API routes. AI-powered ad insights agent generates weekly performance reports.
- **Users** — Search by name/email. View all users with avatar, vehicle type, role. Toggle admin/moderator roles inline.
- **Flags** — Moderate spot flags (wrong location, fake spot, rude user, dangerous, other). Searchable by type/address/comment/flagger. Resolve flags or delete flagged spots. Tracks resolved_by and resolved_at.
- **Pilot Areas** — CRUD for geographic beta zones defined by bounding box coordinates. Used to gate app access by location.
- **Street Sweeping** — CRUD for street sweeping schedules. Fields: street name, city, day of week, time range, zone. Searchable.

RLS policies enforce role-based access. Service-role Supabase client used for admin API routes. `is_admin()` SECURITY DEFINER function at the database level.

## Test Suite
Two tiers of testing:

### Automated Tests (Vitest)
- **Framework**: Vitest 4.1.9 with global test APIs, Node environment, `@` path alias to `src/`
- **Commands**: `npm test` (single run), `npm run test:watch`
- **Test files**: 2 files, 8 test cases total
  - `src/lib/__tests__/utils.test.ts` — Tests the `cn()` classname utility (4 tests)
  - `src/lib/__tests__/rate-limit.test.ts` — Tests `checkRateLimit()` — allows within limit, blocks exceeding, resets after expiry, tracks remaining (4 tests)
- **No component tests, E2E tests, or integration tests exist yet**

### Manual Testing Tools (In-App Admin Test Suite)
Accessed via `/admin/testing`. Contains 8 interactive panels with a device selector (4 simulated test devices), "TEST MODE" banner, and real-time Supabase integration:

1. **GPS Simulator** — Manual coordinate entry, preset locations dropdown, speed slider (0-60 mph), heading compass, accuracy slider, GPS noise toggle (±50m), underground mode toggle (simulated GPS loss), broadcast controls, click-to-set-position map
2. **Route Playback** — 3 preset test routes (Downtown Loop, Garage Entry, Multi-Stop Errand), GPX XML paste-and-parse, Play/Pause/Stop/Step controls, 1x-10x speed multiplier, progress bar with waypoint markers
3. **Parking Tester** — Speed slider, "Simulate Parking (30s)" / "Simulate Driving (25 mph)" buttons, GPS noise/underground toggles, real-time speed monitoring, detection window logic (30s below threshold = parked), event log
4. **Tracking Monitor** — Live map showing all 4 test devices with color-coded status markers (driving=blue, parked=red, idle=gray, offline=light gray), device list with broadcast counts, speed, heading, accuracy. Live via Supabase Realtime on `driver_locations`
5. **ETA Tester** — Tests ETA calculations via OSRM routing API with fallback straight-line estimation. Single/batch destination modes. Rush hour (+30%) and off-peak (-10%) multipliers. Sortable results table
6. **Geofence Tester** — Draw geofence polygons on map (click vertices, 3+ to close), multiple fences with different colors, Simulate Entry/Exit buttons, event log
7. **Scenario Runner** — Build multi-step test scenarios with step types: set_location, start_route, set_speed, wait, check_parking, check_geofence, log. Runs across 2 simulated devices simultaneously. Pass/Fail results panel, export to JSON
8. **Match Scenario** — End-to-end parking handoff simulation: owner posts spot, seeker navigates, match created/confirmed, owner departs, seeker arrives. Voice navigation via Web Speech API. Dual phone view showing both users' device UIs side-by-side

**Testing infrastructure modules**: `SimulatedDevice` class (GPS sim, route playback, noise/underground modes), `testRoutes.ts` (route data), `presetLocations.ts` (7 GPS presets), `gpxParser.ts` (GPX XML parser), `osrmClient.ts` (ETA calc with haversine fallback), `constants.ts` (test user IDs, thresholds), `types.ts` (TypeScript interfaces). Seed script at `scripts/create-test-users.js` creates 4 test auth accounts.

## Monetization Options

### Already partially built:
1. **Freemium Gold subscription** ($4.99/mo) — Ranking system exists; gate Gold tier behind payment for unlimited posts, priority visibility, extended lead time, analytics
2. **Tip platform fee** — Tips table exists; add a $0.50 platform fee on top of tips
3. **In-app advertising** — Ads table + admin panel + geo-targeting exist; render as sponsored map pins

### Need Stripe integration:
4. **Match fee** — $0.50 per successful handoff or 5% of tips
5. **Priority matching** — Premium radius expansion (200m → 500m), early access, SMS alerts

### Longer term:
6. **Business subscriptions** — $29/mo per location for apt complexes/event venues
7. **Street sweeping data licensing** — Sell anonymized data to delivery co's, city planners
8. **Surge pricing during events** — $1-2 extra per match near venues
9. **White-label SaaS** — License to other cities ($500-2000/mo)

### Revenue estimate at small scale: ~$1,750/mo
### At 10k users: ~$8k-12k/mo

## Tech Stack
- **Frontend**: Next.js 16, React 19, Turbopack, Tailwind CSS, lucide-react
- **Map**: MapLibre GL (react-map-gl), OpenFreeMap tiles, Nominatim geocoding
- **Backend**: Supabase (PostgreSQL, RLS, Realtime, Auth)
- **Auth**: Supabase Auth (email/password + phone)
- **Testing**: Vitest 4
- **Deploy**: Vercel

## Database
15 SQL migrations. Key tables: users, parking_spots, tips, notifications, ephemeral_chats, spot_flags, user_ratings, departure_pings, spot_requests, ads, pilot_areas, street_sweeping, contribution_stats, courses, user_course_progress, user_ranking, driver_locations, active_sessions.

## Build Status
42 routes (17 pages + 25 API routes). Clean build — zero TS errors, zero lint errors.
