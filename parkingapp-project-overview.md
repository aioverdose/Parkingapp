# ParkingApp: A Community Parking-Sharing Progressive Web App

## Project Overview

ParkingApp is a mobile-first progressive web application built with Next.js 16, Supabase, and MapLibre GL that enables users to share real-time parking spot departures in their neighborhood. The app is designed for Long Beach, California, and focuses on safety, education, and community trust. It is not a reservation system — it is an "imminent departure alert" system where users announce they are leaving a spot within 5-15 minutes.

## Technology Stack

**Frontend**: Next.js 16.2.9 (React 19, Turbopack for development), Tailwind CSS, lucide-react icons  
**Map**: MapLibre GL via react-map-gl, OpenFreeMap tile server, Nominatim for geocoding  
**Backend/Database**: Supabase (PostgreSQL, realtime subscriptions, row-level security, auth)  
**Auth**: Supabase Auth with email/password and phone verification  
**Deployment**: Vercel (configured, not yet deployed)

## Architecture

The app follows Next.js 14+ App Router patterns with a mix of server and client components. The main interaction surface is a full-screen map (`ParkingMap.tsx`, ~1,100 lines) that handles state management, user authentication, location tracking, and modal orchestration. Data flows through three channels:

1. **Supabase JS client** — direct database queries from client components for profile data, stats, saved spots
2. **API routes** — Next.js route handlers (`/api/spots`, `/api/spots/[id]/claim`, etc.) for operations requiring server-side validation, rate limiting, or admin access
3. **Postgres realtime** — Supabase channels for live spot updates, notifications, and chat

### Directory Structure
```
src/
  app/           — Next.js App Router pages and API routes
  components/    — React components (map, modals, UI elements)
  hooks/         — Custom React hooks (realtime spots, timers, notifications)
  lib/           — Utilities (database client, API client, types, geocoding)
  actions/       — Server actions (rankings, social features)
  scripts/       — Utility scripts (seeding, TTL cleanup)
supabase/
  migrations/    — 15 SQL migration files (00001–00015)
```

## Database Schema (Supabase)

15 migrations have been created. Key tables:

### Core Tables
- **users** — User profiles, auth, vehicle type, TOS acceptance, phone verification, ratings, flag count
- **parking_spots** — Spot alerts with location, lead time, expiration, status (active/taken/expired), flag count
- **tips** — Monetary tips between users (peer-to-peer)
- **notifications** — In-app notification queue

### Social & Safety
- **ephemeral_chats** / **ephemeral_messages** — Temporary chat between spot poster and claimer
- **spot_flags** — User-submitted flags (wrong location, fake spot, misleading, dangerous behavior, rude user)
- **user_ratings** — Post-claim ratings (1-5 stars)
- **departure_pings** — Proximity-based departure announcements
- **spot_requests** — Users announcing they are looking for a spot

### Admin & Operations
- **ads** — Geo-targeted advertisements
- **pilot_areas** — Geographic boundaries for beta testing
- **street_sweeping** — Long Beach street sweeping schedule
- **contribution_stats** — Aggregated user contribution metrics (spots posted, claimed, hours saved, streaks)

### Education & Ranking (new, migration 00015)
- **courses** — 5 educational courses with reading content and quiz questions (JSONB)
- **user_course_progress** — Per-user course completion tracking (not_started, in_progress, passed, failed)
- **user_ranking** — Ranking data (tier, points, trust score, handoffs, flags)

### Database Triggers
- Auto-update contribution stats on spot insert/claim
- Auto-recalculate user ratings on new rating
- Auto-set spot expiration on insert
- Auto-update flag count for spot owners
- Auto-update user ranking on course pass, handoff, or flag
- Initialize default ranking on user signup
- TTL cleanup for expired spots, chats, departure pings

## Key Features

### 1. Main Map Experience
The heart of the app is a full-screen MapLibre GL map displaying:
- Active spot markers (blue pins with countdown and vehicle type)
- Current user location with accuracy indicator
- Spot request markers (users looking for spots nearby)
- Departure ping markers (users about to leave)
- Search bar (Nominatim geocoding) for address lookup
- Satellite/street view toggle
- Navigation controls and geolocation

### 2. Posting a Departure Alert
Users can post departure alerts with a 5-15 minute lead time (15 minute absolute maximum). The flow:
1. User taps "LEAVING SOON" button
2. Authentication check → phone verification → safety acknowledgment → pilot area check → TOS check → course completion check
3. PostSpotForm opens with time selector (5/10/15 min) and safety disclaimer
4. Server validates lead time ≤ 15 min, computes expires_at
5. Spot appears on map with live countdown
6. Auto-expires after lead time expires

### 3. Claiming a Spot
Other users can claim active spots:
1. Tap marker → SpotDetails panel opens
2. View owner info, rank badge, lead time, flag status
3. Get directions, start ephemeral chat, or claim the spot
4. Atomic claim operation: only succeeds if spot is still "active"
5. Spot owner receives notification
6. Claimer is prompted to rate the owner

### 4. Ranking & Trust System
A course-based education system with 5 courses:
1. Street Parking Law & City Rules (required)
2. Community Safety & Neighbors (required)
3. App Risks & Best Practices
4. Privacy & Location
5. Street Sweeping & Legal Parking

Each course has reading material and a 3-4 question quiz (80% to pass). Passing earns points.

**Rank Tiers:**
- Bronze (0-1 courses) — 1 alert per day limit
- Silver (2-3 courses) — unlimited posting
- Gold (4-5 courses) — unlimited posting, priority visibility
- Community Partner (4-5 courses, trust ≥ 4.0, flags ≤ 1) — featured, moderator potential

**Point System:**
- +100 per course passed
- +10 per successful handoff (spot claimed)
- -20 per confirmed flag
- Trust score: starts at 5.0, -0.5 per flag, +0.1 per handoff

### 5. Safety Features
- Lead time max 15 minutes (prevents early-arrival behavior, neighborhood disruption)
- Auto-expiration of all alerts
- Anti-creep copy in forms and safety warnings
- Flag system for misleading/dangerous spots
- Rate limiting (10 spots/60s per IP)
- Pilot area gating (beta zones only)
- Phone verification required to post
- Safety acknowledgment modal
- TOS acceptance flow

### 6. Additional Features
- Save parking spot location (GPS accuracy check)
- Street sweeping alerts (Long Beach schedule)
- Peer-to-peer tipping ($1/$2/$5)
- Ephemeral chat between poster and claimer
- Community leaderboards by neighborhood
- Notification system (real-time)
- Ad platform (geo-targeted, impression/click tracking)

## UI Design

The app uses a dark/cyan theme with:
- Dark zinc backgrounds (bg-zinc-950, bg-zinc-900 for cards)
- Blue-600/cyan-500 gradient accents (buttons, headers)
- Rounded-2xl cards with subtle borders
- Bottom navigation bar (Home/Courses/Profile/Settings)
- Gradient action buttons with shadow
- Mobile-first responsive layout (max-w-lg containers)

### Navigation
- Bottom nav bar replaces the old top-right icon cluster
- 4 tabs: Home (map), Courses, Profile, Settings
- Active state highlighting with blue-600

## Development Status

**Build**: Passes clean — 42/42 pages, zero TypeScript errors, zero lint errors  
**Git**: Not initialized (no commits yet)  
**Environment**: `.env.local` exists but missing Supabase credentials — app shows map without spots until configured  
**Deployment**: Vercel project linked but not deployed

### 42 Routes (42 pages built)
- 17 static pages (map, courses, profile, admin, etc.)
- 25 dynamic API routes (spots, auth, flags, ratings, courses, etc.)

### Queue for Vercel Deploy
To deploy, you need to:
1. Initialize git: `git init && git add . && git commit -m "initial"`
2. Push to GitHub
3. Add Supabase environment variables in Vercel project settings
4. Run all 15 SQL migrations in Supabase Studio
5. Deploy via `git push` or `npx vercel --prod`

## Recent Major Changes

### UI Redesign
- Replaced cluttered top-right icon cluster with clean bottom navigation bar
- Replaced old action buttons with gradient "LEAVING SOON" and outlined "Looking for a Spot"
- Added full profile dashboard with rank, stats, saved spots, and quick actions
- Created RankBadge component displayed on spot details

### Course-Based Education System
- 5 educational courses with reading and quizzes
- Database triggers for automatic ranking updates
- Bronze daily posting limit enforced server-side
- Required course onboarding flow

### Safety Updates
- Lead time limits (10 min default, 15 min absolute max)
- "Leaving Soon" UX with 5/10/15 min options
- Auto-expiration with countdown timers
- Anti-creep safety copy
- Flag misleading alerts support

## File Count Summary
- 15 SQL migration files
- ~20 page components (app router)
- ~30 React components
- 4 custom hooks
- 12+ library/utility modules
- 25 API route handlers
- 2 utility scripts (seed, TTL cleanup)
