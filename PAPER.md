# SpotMatch (ParkingMeeters) — System Overview

## 1. Introduction

SpotMatch (public name: ParkingMeeters) is a real-time, mobile-first parking handoff platform built on Next.js 16, Supabase, and Maplibre GL. It connects drivers who are about to leave a parking spot with drivers who need one, turning the zero-sum game of urban parking into a cooperative network.

The app operates under California Vehicle Code § 22651.9 (street sweeping law) and is explicitly non-commercial: no money changes hands for spots. The monetization model is a **pay-per-match credit system** ($5.99 per confirmed handoff) combined with geofenced local advertising.

---

## 2. How It Works

### 2.1 User Flow

```
Sign Up → Phone Verify → Accept Community Agreement → Complete Courses → Post / Find Spots
```

**Authentication**: Supabase Auth with email/password or magic link. No social login.

**Gating chain** (enforced before every action):
1. Logged in?
2. Phone verified? (Twilio OTP, required to post)
3. Inside a pilot area? (geofence check)
4. Account in good standing? (< 5 flags, rating >= 3.0)
5. Accepted TOS + Safety Agreement?
6. Completed at least 1 educational course?

### 2.2 Posting a Spot

A user taps **"List My Spot"** and goes through:

1. **Location acquisition** — Browser Geolocation API with `watchPosition`, waits up to 10 seconds for ≤ 50 m accuracy, then reverse-geocodes via Nominatim (OpenStreetMap).

2. **Relay mode** — Two types:
   - **Imminent** — Leaving right now. Spot appears live on the map for immediate takers.
   - **Scheduled** — Pre-committing a departure time. Used for forward planning.

3. **Details** — Departure time, return time, optional vehicle-type filter, optional tip message.

4. **Submission** — Validated server-side (future times, max 3 active spots, rate-limited to 10/60s). Fire-and-forget triggers: match-finder runs, SpotQuest XP awarded, demand-match agent notifies nearby seekers.

### 2.3 Finding & Claiming a Spot

The map shows:

| Marker | Meaning |
|--------|---------|
| Blue pin | Active parking spot (with countdown) |
| Orange search icon | Someone looking for a spot (`spot_request`) |
| Purple bell | Someone leaving soon (`departure_ping`) |
| Clusters | Grouped spots at low zoom |

Clicking a spot opens a detail sheet with:
- Address, owner name, rank badge, rating stars
- Countdown timer to departure
- Vehicle compatibility indicator
- Flag count (if any)
- Owner's tip message
- **Actions**: Get Directions, Chat (ephemeral, 30-min expiry), Claim Spot, Report, Send Tip ($1/$2/$5)

**Claim flow**: Atomic `UPDATE ... WHERE status='active'` → handles race conditions (409 if already taken) → notifies owner → awards XP/badges/quests → prompts rater.

### 2.4 Matching System

Two paths to a handoff:

**Direct claim** — User sees a spot on the map and clicks "Take Spot". Immediate, no negotiation.

**Formal match** (for scheduled relays) — When a spot is posted, the match-finder checks for active `spot_requests` within 200 m. If compatible (distance, vehicle type, schedule overlap, not blocked), a `spot_match` is created and the seeker gets a push notification with "Accept & Navigate" / "Decline" actions. Match confirmation is two-phase (both parties must confirm). On confirmation, both users **spend 1 match credit** ($5.99 value each), and live location tracking begins.

### 2.5 Communication & Trust

- **Ephemeral Chats** — Per-match, auto-expire after 30 minutes. Max 500 chars per message.
- **Live Tracking** — Both parties share GPS location during the handoff window, visible on a shared map with ETA.
- **Flag System** — Users can report spots for 6 reasons (wrong location, fake, misleading, rude, dangerous, other). ≥ 5 flags → account gated.
- **Rating System** — 1–5 stars after each claim. < 3.0 average rating → account gated.
- **Block User** — Permanently prevents matching, chatting, or profile visibility between two users.
- **Safety Agreement** — 7 rules (15-min max lead, don't circle blocks, don't follow people, keep handoffs brief, etc.) that must be accepted before first use.

---

## 3. Gamification: SpotQuest

SpotQuest layers XP, levels, badges, and quests onto the core loop to drive engagement and reward positive behavior.

**Levels**: Rookie Parker → Cruiser → Road Warrior → Street Pro → Spot Master → Parking Legend.

**XP Sources**:

| Action | XP |
|--------|-----|
| Complete handoff (post + claim) | 50 + bonuses |
| Perfect Park mini-game | 5–25 |
| Quest completion | Varies |
| Badge earning | Varies |

**Bonuses**:
- **Speed bonus** — Claim within 5 min (+30 XP) or 10 min (+15 XP)
- **Streak bonus** — Up to +50 XP for consecutive handoff days
- **Reliability bonus** — +20 XP if average rating ≥ 4.5

**Badges**: 6 categories (handoff, streak, community, special, quest, perfect_park) at 4 tiers (bronze → silver → gold → legendary). Awarded automatically on milestone.

**Quests**: Daily and weekly goals (e.g., "Complete 3 handoffs", "Rate 2 users") with XP rewards. Tracked by RPCs that fire on spot creation, claiming, and match confirmation.

---

## 4. Monetization

### 4.1 Match Credits (Primary Revenue)

**Model**: Pay-per-match. Each confirmed handoff costs **1 credit** per participant.

**Pricing**: **$5.99 per credit**, sold in packs of 1 or 5 via Stripe Checkout.

**Flow**:
1. User purchases credits → redirected to Stripe hosted checkout
2. Stripe sends `checkout.session.completed` webhook
3. Webhook validates signature, credits the user's `match_credits` balance
4. On match confirmation, balance is decremented by 1 (RPC: `deduct_match_credit`)
5. Insufficient credits → match reverts to pending with 402 error

**First 5 are free** — New users receive 5 complimentary credits to onboard without friction.

### 4.2 Tips (Voluntary)

Users can send $1, $2, or $5 "thank you" tips to spot owners after a successful handoff. Recorded in the `tips` table. This is kept deliberately small to avoid creating a commercial marketplace (which would violate CA Vehicle Code 22651.9).

### 4.3 Local Advertising

Geofenced ad placements inside the Spot Details panel:

- Businesses target ads by lat/lng + radius
- Impressions and clicks tracked via dedicated API endpoints (`/api/ads/[id]/impression`, `/api/ads/[id]/click`)
- Analytics recorded in `ad_analytics` table
- Admin manages campaigns via `/admin/ads`

An **AI Ad Insights Agent** (Ollama-powered) generates weekly performance reports for each advertiser.

### 4.4 Revenue Summary

| Stream | Mechanism | Est. Unit Value |
|--------|-----------|----------------|
| Match Credits | Pay-per-handoff (both parties) | $11.98 per confirmed match |
| Tips | Voluntary thank-you payments | Variable |
| Ads | Geofenced local business ads | Per-impression / per-click |

---

## 5. AI Agents

All agents run locally via **Ollama** (default model: `llama3`) and are triggered by realtime events or cron:

| Agent | Trigger | Function |
|-------|---------|----------|
| **Demand-Match** | New spot created | Finds nearby `spot_requests` and sends push notifications |
| **User Growth** | New spot created | Scans for unregistered phones nearby, records invites |
| **Spot Prediction** | Cron | Analyzes 7-day history to predict when/where spots open |
| **Congestion Alert** | Cron | Flags neighborhoods with ≥ 10 alerts in 10 minutes |
| **Ad Insights** | Weekly | Generates performance reports for advertisers |

---

## 6. Admin Tools

Protected by role check (`admin` / `moderator`):

| Page | Purpose |
|------|---------|
| Dashboard | Aggregate metrics (users, spots, ads, agent KPIs, top neighborhoods) |
| Control Tower | Live map of active matches with real-time GPS tracking |
| Users | Searchable list, promote/demote admins |
| Flags | View/resolve reports, delete flagged spots |
| Ad Campaigns | CRUD for geofenced ads with analytics |
| Pilot Areas | Manage active geographic zones |
| Street Sweeping | CRUD street cleaning schedules |
| Broadcast | Send push notifications to all/specific users |
| Test Suite | AI test campaign runner and simulation engine |

---

## 7. Technical Architecture

```
┌──────────────────────┐
│   Next.js 16 App     │
│  (React, TS, TW)     │
├──────────────────────┤
│ API Routes (server)  │ ← Stripe Webhook
│ Server Actions       │ ← Ollama (local LLM)
│ Admin Client (key)   │ ← Supabase (service_role)
│ Browser Client (key) │ ← Supabase (anon)
├──────────────────────┤
│ Supabase             │
│  • PostgreSQL (30+   │
│    tables)           │
│  • Auth (email/pw)   │
│  • Realtime (changes)│
│  • RPCs (10+)        │
├──────────────────────┤
│ External             │
│  • Stripe (payments) │
│  • Twilio (SMS/OTP)  │
│  • Maplibre (maps)   │
│  • OpenFreeMap (tiles)│
│  • Ollama (AI)       │
│  • Web Push (VAPID)  │
└──────────────────────┘
```

**Key properties**:
- Map style configurable via `NEXT_PUBLIC_MAP_STYLE_URL` (default: OpenFreeMap Liberty)
- PWA with service worker, Web Push notifications, standalone manifest
- All API routes use Supabase admin client (service_role) — RLS not enforced server-side
- Realtime subscriptions for live spot updates, chat, tracking, and control tower
- Rate limiting on spot creation, claiming, and messaging

---

## 8. Database Overview (30+ Tables)

| Category | Tables |
|----------|--------|
| Core | `users`, `parking_spots`, `spot_matches`, `notifications` |
| Social | `ephemeral_chats`, `ephemeral_messages`, `user_blocks` |
| Discovery | `spot_requests`, `departure_pings` |
| Safety | `flags`, `ratings`, `user_ratings` |
| Monetization | `credit_purchases`, `tips`, `ads`, `ad_analytics` |
| Gamification | `user_game_profile`, `game_transactions`, `badges`, `user_badges`, `quests`, `user_quests` |
| Admin | `pilot_areas`, `street_sweeping`, `congestion_alerts`, `spot_predictions` |
| Growth | `invite_conversions` |
| Tracking | `driver_locations`, `active_sessions`, `car_locations` |
| Education | `courses`, `user_course_progress`, `user_ranking` |

---

## 9. Regulatory & Safety Compliance

- **CA Vehicle Code § 22651.9**: App explicitly informs users that street sweeping parking restrictions still apply. No liability for tickets.
- **No commercial parking**: Community agreement explicitly prohibits selling spots. Handoffs are voluntary. The credit model pays for *matching*, not for the spot itself — a deliberate legal distinction.
- **Privacy**: Location data shared only during active matches. Ephemeral chats auto-delete. No selling of user data.
- **Anti-fraud**: Flag system, rating system, phone verification, rate limiting, max active spots per user.
