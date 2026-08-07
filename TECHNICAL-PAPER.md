# Parking Meeters (SpotMatch) — Technical Paper

A deep-dive on the architecture, behavior, and capabilities of a real-time, peer-to-peer parking spot handoff platform.

**Author:** Engineering team
**Version:** 2.1 — corresponds to the `main` branch as of August 2026
**Audience:** Technical reviewers, AI analysis (e.g., Grok), investors, legal counsel, engineers onboarding to the codebase

---

## 1. Executive Summary

Parking Meeters (repository name: SpotMatch / parkingapp) is a **mobile-first Progressive Web App** that connects drivers about to leave a parking spot with drivers who need one, in real time. Instead of letting parking remain a zero-sum scramble, the app turns spot departures into a cooperative, trust-scored network.

The system is built on:

- **Next.js 16** (React 19, App Router, TypeScript) served on **Vercel**
- **Supabase** (PostgreSQL + Row Level Security + Realtime + Auth) as the state store and event bus
- **MapLibre GL** (via `react-map-gl`) with **OpenFreeMap** tiles and **Nominatim** geocoding
- **Stripe** for pay-per-match credit purchases, **Twilio** for SMS/OTP verification, **Web Push (VAPID)** for notifications
- A **configurable LLM layer** (local Ollama or OpenAI-compatible endpoints) powering a family of AI agents

The product deliberately positions itself as an **"imminent departure alert" system**, not a reservation marketplace: spots are never sold or rented. Since 2.1 the primary revenue model is **B2B subscriptions**: businesses (restaurants, bars, parking operators) subscribe to coordinate parking for their team and neighborhood network, optionally white-labeled under the business's own branding. Consumer-facing monetization remains as secondary, optional flows — voluntary tips, geofenced local advertising, and pay-per-handoff match credits.

Version 2.1 reflects the B2B / white-label expansion on top of the 2.0 engineering changes:

1. **Exclusive single-driver matching** replaced broadcast matching. A posted spot is now offered to exactly one best-compatible seeker at a time (90-second window), is invisible to everyone else, and only falls back to a public map alert after a configurable number of declined/expired offers. This eliminates claim races and leaky inventories. **Network (B2B) spots never receive the public fallback** — coordination stays inside the business network, so exhausted network spots simply stop matching instead of appearing on the public map.
2. **Production hardening across five axes** — distributed rate limiting (Postgres-backed, shared across serverless instances), structured logging + error tracking, Stripe webhook idempotency and atomic credit grant, configurable LLM providers with strong fallbacks, and tightened geo/telemetry input validation with documented ephemeral-data retention.
3. **Business networks and white-labeling** — a SQL-level tenant model (`businesses`, `networks`, `network_businesses`, `business_members`), exclusive matching scoped per network, business-owned spots, an admin dashboard per business, and per-subscriber branding (name, logo, accent colors). See §2.5 and §2.6.

---

## 2. Product Concept and Regulatory Framing

### 2.1 The Problem

In dense neighborhoods (the initial launch area is Belmont Shore, Long Beach, CA), parking supply is highly time-varying. A spot that opens at 8:15 AM is almost immediately re-taken, and drivers circling for a spot create congestion and emissions. The single largest source of supply information is the *departing driver*, whose timing is unpredictable to everyone else.

### 2.2 The Solution

Parking Meeters asks departing drivers to **announce their departure in advance** (5–15 minutes), so an arriving driver can time their approach. Value flows both ways:

- **Owners** get gratitude, reputation, XP, and tips — and the knowledge that the spot they leave goes to a trusted neighbor rather than a random driver.
- **Seekers** get a warm handoff: a guaranteed-warm spot, directions, live tracking, and a human owner at the other end.

### 2.3 Legal Framing (California)

The app operates under **California Vehicle Code § 22651.9** (street sweeping law): it explicitly informs users that street sweeping restrictions still apply and takes no liability for tickets.

To stay outside the definition of a commercial parking marketplace (which would trigger different regulatory treatment — public-lot operator rules, valet rules, or street-vending considerations), the codebase enforces these distinctions:

- The **Community Agreement** and all product copy prohibit selling or renting spots.
- The $5.99 match credit is framed and implemented as a fee for the **matching/coordination service**, not for the spot.
- Tips are capped at small amounts ($1/$2/$5) and framed as "thank-you" gestures, recorded in the `tips` table.
- **No spot inventory, no reservations.** A spot is never committed to a future time slot; it is announced as an imminent departure and immediately handed off. The "exclusive offer" window (§6) is a coordination mechanism, not a reservation: it never holds a physical public street space.

### 2.5 B2B / white-label model

Since 2.1, the platform is sold **to businesses** as parking-coordination software, not to consumers as a marketplace:

- A **business** (restaurant, bar, parking operator) subscribes on a plan (`trial` / `standard` / `pro` / `enterprise`) with a seat cap (`seats_limit`).
- A **network** is the coordination scope: `private` (a single business and its team) or `shared` (a neighborhood group of businesses, e.g., the 2nd Street / Belmont Shore strip). A business links to a network via `network_businesses`.
- **Members** join businesses (`business_members` with roles `admin` / `staff` / `member`) and, through them, participate in that network's exclusive matching.
- **White-labeling:** a subscriber can brand its slice of the app (`app_name`, `logo_url`, `primary_color`, `accent_color`), which the business dashboard and future branded entry points render.
- Spots and matches posted by a business are stamped `business_id` + `network_id`; exclusive offers are only ever made to active members of that network. Business-posted spots are exempt from the consumer 3-active-spot cap.

### 2.6 Business-facing API and dashboard

- REST surface under `/api/businesses*` (create/list, read/update, join, member management, dashboard stats), all behind the same Bearer auth enforced by `src/proxy.ts`.
- Per-business dashboard at `/business/[id]`: active spots, members, match totals, recent spots/matches, a network-scoped "post a spot" form, and an admin-only branding panel.
- Revenue focus is subscriptions; the consumer credit flow (`§10`) remains but is treated as optional.

### 2.4 Legal / compliance considerations for scale

| Area | Current posture |
|------|----------------|
| **Street parking / municipal rules** | Display street-sweeping schedules; user assumes liability for tickets (disclaimed in TOS + app copy) |
| **Payments** | Stripe-hosted checkout — no card data in the app; transparent "service fee" framing; full refund path via Stripe dashboard |
| **Privacy / location** | Location shared only during an active match; ephemeral chat auto-deletes; versioned TOS; data-retention policy documented in `docs/DATA_RETENTION.md` |
| **Liability for handoffs** | Safety/Community Agreement allocates risk to users; education courses required before first use; no-tolerance rules for dangerous behavior (flag system, §8) |
| **Advertising** | Geofenced local ads disclosed as ads; impression/click tracking; ad quality review before publication |
| **Accessibility & minors** | 18+ requirement; phone-verified accounts; moderation tooling for flagged accounts |

---

## 3. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.2.9 (App Router), React 19.2.4 | Turbopack dev; route handlers + middleware (`src/proxy.ts`) |
| Language | TypeScript 5 | strict; `@/` path alias to `src/` |
| Styling | Tailwind CSS 3.4, lucide-react icons | zinc/blue design system, mobile-first |
| Database | Supabase (PostgreSQL) | 41 SQL migrations, RLS, tables/views/RPCs |
| Realtime | Supabase Realtime (Postgres changes channels) | spots, chat, tracking, control tower |
| Auth | Supabase Auth (email/password, magic link) + Twilio OTP | no social login |
| Maps | MapLibre GL 5.x via react-map-gl 8.x | OpenFreeMap tile style (configurable), Nominatim reverse-geocode |
| Routing | OSRM (public instance) with haversine fallback | ETA + turn-by-turn navigation |
| Payments | Stripe Checkout + webhooks | idempotent credit grants (see §10) |
| Push | Web Push API (VAPID keys) | PWA push notifications |
| AI | Configurable: OpenAI-compatible (`gpt-4o-mini` default) **or** local Ollama (`llama3` default) | ordered fallback chain; every agent degrades to a deterministic template |
| Rate limiting | **Distributed** Postgres-backed (`rate_limits` + RPC) | shared across all Vercel instances; in-memory fallback only in tests/dev |
| Logging | Structured JSON logger → `app_logs` table | 30-day retention; error tracking |
| Testing | Vitest 4 (unit) + in-app manual/integration harness | 57 automated tests across 10 suites; extensive simulation tooling |
| Deployment | Vercel (GitHub integration) | `.env.local` / `.env.production` Vercel-managed env |

---

## 4. System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Clients (mobile-first PWA)                │
│   Map SPA │ Post/Claim flows │ Chat │ Tracking │ SpotQuest    │
└──────────────────────────┬────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼────────────────────────────────────┐
│                    Next.js 16 App (Vercel)                    │
│  ┌──────────────────────────────┐   ┌──────────────────────┐  │
│  │  Page components (React)     │   │  Route handlers       │  │
│  │  Hooks (realtime, timers)    │   │  (~69 API routes)     │  │
│  └──────────────────────────────┘   │  Server Actions       │  │
│       proxy.ts middleware (authz)   │  Admin service client │  │
│  ┌──────────────────────────────┐   └──────────────────────┘  │
│  │  Agents (LLM + behavior)     │                              │
│  │  Matching engine (exclusive) │                              │
│  └──────────────────────────────┘                              │
└──────────────────────────┬────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
   ┌────────▼────────┐  ┌──▼───────────┐  ┌▼─────────────────┐
   │   Supabase      │  │   Stripe     │  │  External         │
   │  • PostgreSQL   │  │  Checkout    │  │  • Twilio (SMS)  │
   │  • Realtime     │  │  Webhooks    │  │  • MapLibre tiles│
   │  • Auth (anon)  │  │  (signature) │  │  • Nominatim     │
   │  • RLS policies │  └──────────────┘  │  • OSRM          │
   │  • pg_cron/TTL  │                    │  • LLM (Ollama/  │
   └────────────────┘                    │    OpenAI)       │
                                          │  • Web Push/VAPID│
                                          └──────────────────┘
```

### 4.1 Data-access model

Three distinct client surfaces exist for the database:

1. **Browser client** (`src/lib/supabaseClient.ts`) — anon key, used for authenticated reads/writes that RLS governs (profiles, game state, chat, own records). This is the *only* path where Row Level Security is the enforcement point.
2. **API route handler** (`src/lib/supabaseAdmin.ts`) — service-role key, used for operations requiring server-side validation: matching, claim races, credits, rate limiting, admin/moderation, webhooks. RLS is bypassed here; the middleware + handler-level role checks are the enforcement point.
3. **Realtime subscriptions** — long-lived WebSocket channels on specific tables/filters for live map, chat, tracking, and the control tower.

### 4.2 Middleware (`src/proxy.ts`)

A Next.js middleware intercepts `/api/*` and enforces:

- **Agent routes** (`/api/agents/*`, except the admin chat route) require an `x-agent-secret` header equal to `AGENT_SECRET_KEY` (used by cron/scheduled agent invocation).
- All other non-public, non-`/api/admin` routes require a `Bearer` access token (structural check; handlers re-verify).
- Security headers are stamped on every API response (`nosniff`, frame-deny, XSS-protection, referrer policy, `Cache-Control: no-store`).

---

## 5. Core Domain and User Flows

### 5.1 Identity and Gating Chain

Authentication is email/password or magic link. Before *every* privileged action the app evaluates a gating chain:

1. Authenticated (Supabase session)
2. Phone verified (Twilio OTP; required to post)
3. Inside an active pilot area (geofence via `pilot_areas` bounding boxes)
4. Account in good standing (`flags < 5`, average rating ≥ 3.0)
5. Accepted current TOS + Safety/Community Agreement (versioned)
6. Completed at least the required educational courses

### 5.2 Posting a Spot (`/api/spots`)

- **Location acquisition** — Browser Geolocation `watchPosition` (high accuracy, ≤50 m tolerance, 10 s cap) → reverse geocoded via Nominatim.
- **Relay modes** (`relay_mode`):
  - `imminent` — leaving now; enters the exclusive matching queue immediately.
  - `scheduled` — pre-committed future departure for forward planning.
- **Details** — departure time, return time, vehicle-type filter, optional tip message.
- **Server validation** — valid coordinate ranges (new `geo-validation` lib), future times enforced, max 3 active spots per user, rate limit 10 posts/60 s per IP, pilot-area gating, phone verification, standing checks.
- **Fire-and-forget side effects** — the exclusive match-finder runs, SpotQuest XP awarded, and the demand-match agent notifies nearby seekers.

### 5.3 The Exclusive Offer Flow

Version 2.0 replaces broadcast claimable markers with a sequenced, invisible matching flow:

```
owner posts spot (visibility=exclusive)
        │
        ▼
matching engine picks THE best seeker            (findBestSeeker)
        │  distance · vehicle type · schedule overlap
        │  trust/tier · reliability · block exclusion
        ▼
exclusive offer (spot_matches.status='offered')  (createExclusiveOffer)
  90s acceptance window · push + in-app notification
   only the offered seeker is aware of the spot
        │
   ┌────┴────────────┐
   ▼ accept          ▼ decline / expire (90s)
offered → confirmed_by_seeker
        │            attemptNextOffer → next-best seeker
        ▼            after max_exclusive_attempts (default 5)
  ...two-phase confirmations...
        ▼            → visibility='public' fallback alert
```

Key mechanics:

- **One offer at a time.** The engine never reveals the spot to more than one seeker, eliminating claim races entirely. `createExclusiveOffer` refuses to run if the spot already has an active `offered` match.
- **Scoring** (`findBestSeeker`): `trust*10` + ranking-tier bonus (bronze 0, silver 2, gold 4, community partner 6) + `successful_handoffs*0.5` − flag/reliability penalties − distance/1000; blocks are excluded in both directions; vehicle type and schedule-overlap checks are hard filters.
- **Reassignment.** A decline triggers `reassignOffer` (next-best seeker); a no-show releases the spot and runs `attemptNextOffer` excluding the no-showing seeker.
- **Public fallback.** After `max_exclusive_attempts` (1–10, per-spot configurable, default 5) the spot becomes a public claimable alert on the map.
- **Reliability tracking.** Declines and no-shows increment `users.decline_count` / `no_show_count`, lowering future offer priority.
- **Self-healing.** A cron endpoint (`/api/cron/expire-offers`, every minute) plus opportunistic sweeps on each match-find expire stale offers and sweep exclusive spots whose attempts are exhausted.

### 5.4 Claiming a Public Spot

- **Atomicity** — Claim is a single conditional `UPDATE parking_spots SET status='taken' WHERE id=$1 AND status='active'`; a `409` surfaces the race when two drivers claim simultaneously.
- **Post-claim side effects** — owner notified, claimer XP/badges/quests awarded, rating prompt queued, contribution stats trigger fires, chat auto-created.

### 5.5 The Handoff Lifecycle (`spot_matches`, `active_sessions`, `driver_locations`)

A formal handoff progresses through a lifecycle that the control tower and mobile clients both render:

```
offered → confirmed_by_seeker → confirmed_by_owner → confirmed
       → en_route → arrived → departed → completed
       → (offer_declined | offer_expired | rejected | expired | no_show)
```

- **Two-phase confirmation** — both parties must confirm.
- **Credit deduction** — on final confirmation each party spends 1 match credit (`deduct_match_credit` RPC).
- **Live tracking** — both parties' GPS streams into `driver_locations`; `active_sessions` tracks ETA, grace period, arrival/departure timestamps; grace-period logic handles no-shows.
- **ETA** — computed from OSRM route time with rush-hour (+30%) / off-peak (−10%) multipliers and a straight-line haversine fallback.

### 5.6 Discovery Aids

- `spot_requests` — orange marker for "someone is looking for a spot".
- `departure_pings` — purple marker broadcast "leaving in ~10 min" to nearby users.
- `spot_waitlist` — scheduled-relay waitlist for future departures.

---

## 6. Matching Engine (exclusive single-driver model)

The matching engine (`src/lib/matching/exclusive-matcher.ts`) is the heart of version 2.0:

- **`findBestSeeker(spot)`** — scores every compatible active seeker within `MATCH_RADIUS_METERS` (default 200 m) and returns exactly one winner (see scoring in §5.3).
- **`createExclusiveOffer(spot, seekerId)`** — creates a single `offered` match with an acceptance window (`MATCH_OFFER_WINDOW_MS`, default 90 s), increments `exclusive_attempts`, and notifies only the seeker.
- **`reassignOffer` / `attemptNextOffer`** — chain to the next-best seeker on decline/expiry/no-show.
- **`expireStaleOffers` / `sweepExclusiveSpots`** — TTL enforcement + public fallback after attempts run out.
- **`incrementReliabilityCounter`** — records declines/no-shows.

**Privacy property:** because spots default to `visibility='exclusive'`, the map feed (`GET /api/spots`), the realtime channel, and every other consumer only see exclusive spots owned by the viewer. An exclusive spot is effectively invisible until it falls back to public (consumer spots only). Network-stamped spots are additionally excluded from the open feed unless the viewer is a network member, and they never fall back to public. RLS enforces this at the database level, so no client path can leak an in-flight offer.

Anti-abuse properties: distributed rate limiting, atomic claims, per-user active-spot caps, phone verification, block-list exclusion, and geodata validation.

---

## 7. Real-Time Infrastructure

Supabase Realtime channels power every "live" surface:

| Channel | Table(s) | Purpose |
|---------|----------|---------|
| Map spots | `parking_spots` | live marker add/expire |
| Chat | `ephemeral_messages` (filtered by `chat_id`) | 30-min ephemeral handoff chat |
| Tracking | `driver_locations` | live positions during matches |
| Control tower | `driver_locations`, `active_sessions`, `spot_matches` | admin live map + sidebar |
| Notifications | `notifications` | in-app notification feed |

Polling is used as a complement where push is insufficient (control tower refetches every 10 s; rate-limited 30 req/60 s).

Ephemerality is engineered in and documented: chats auto-close after 30 minutes or on claim completion; spots auto-expire by lead time; `pg_cron`/scripted TTL jobs sweep expired rows (`cleanup_ephemeral_chats`, `cleanup_departure_pings`, `maintain_streaks`, `cleanup_old_driver_locations`, `cleanup_expired_rate_limits`, `cleanup_expired_app_logs`). The full retention catalog lives in **`docs/DATA_RETENTION.md`**.

---

## 8. Trust, Safety, and Reputation

- **Flag system** — 5 reasons (`wrong_location`, `fake_spot`, `rude_user`, `dangerous_behavior`, `other`). ≥5 flags gates the account; admin can resolve or delete.
- **Ratings** — 1–5 stars post-claim; a database trigger recomputes the owner's average; <3.0 gates the account.
- **Block list** — permanent mutual exclusion from matching, chat, and profile visibility.
- **Education gate** — required courses before first use.
- **Rate limiting** — **distributed** (Postgres `rate_limits` table via `check_rate_limit` RPC), enforced consistently across all serverless instances. Fallback in-memory store only activates when Supabase is unconfigured.
- **Phone verification** — Twilio OTP before posting.
- **Pilot-area gating** — the app only operates inside configured bounding boxes.
- **Safety agreement** — 7 rules (15-min max lead, don't circle blocks, don't follow people, brief handoffs, etc.).

---

## 9. Gamification — SpotQuest

A full XP/level/badge/quest layer drives retention and rewards positive behavior:

- **Levels:** Rookie Parker → Cruiser → Road Warrior → Street Pro → Spot Master → Parking Legend.
- **XP sources:** handoffs (+50 + bonuses), Perfect Park mini-game (5–25), quests, badges.
- **Bonuses:** speed bonus (claim ≤5 min +30, ≤10 min +15), streak bonus (up to +50), reliability bonus (+20 at ≥4.5 rating).
- **Badges:** 6 categories × 4 tiers (bronze → legendary), auto-awarded on milestones.
- **Quests:** daily/weekly/milestone objectives tracked by RPCs fired on spots, claims, and match confirmations.
- **Leaderboards:** neighborhood leaderboard view (Belmont Shore).

### 9.1 Education & Rankings

Five courses (street parking law, community safety, app risks, privacy, street sweeping) with quizzes (80% to pass). Ranking tiers (Bronze/Silver/Gold/Community Partner) gate posting limits, visibility, **and exclusive-offer priority**. Points: +100/course, +10/handoff, −20/flag; trust score starts at 5.0. DB triggers initialize profiles and update rankings on course pass, handoff, and flag events.

---

## 10. Monetization

| Stream | Mechanism | Status |
|--------|-----------|--------|
| **Business subscriptions** | Primary revenue: businesses subscribe (trial/standard/pro/enterprise) to coordinate parking across their network; white-label branding included | Live |
| **Match credits** | $5.99/credit via Stripe Checkout; each confirmed handoff costs each party 1 credit; **first 5 free** (default balance) | Live (optional) |
| **Tips** | Voluntary $1/$2/$5 thank-you payments | Live |
| **Geofenced ads** | Geo-targeted placements in the Spot Details panel; impression/click tracking API; AI weekly reports | Live |
| Data licensing | Documented in `MONETIZATION-OPTIONS.md` | Planned |

**Credit flow (hardened):** user purchases → Stripe hosted checkout → `checkout.session.completed` webhook (signature-verified) → **idempotency checks**:

1. Event replays are short-circuited via the `webhook_events` table.
2. The grant itself is atomic and idempotent: `complete_credit_purchase` RPC only completes a `pending` `credit_purchases` row and increments `match_credits` in one transaction, returning 0 credits for an already-completed session — so retried deliveries can never double-grant.
3. Livemode is checked against the environment, and session metadata (userId/quantity) is strictly validated.

`deduct_match_credit` RPC spends a credit on match confirmation → 402 if insufficient.

---

## 11. AI Systems

### 11.1 Configurable LLM layer

`src/lib/llm.ts` abstracts the model provider behind a single `chatCompletion(messages)` function. Providers are resolved from env:

- `LLM_PROVIDER=openai` → OpenAI-compatible endpoint (`OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`, `OPENAI_MODEL` defaults to `gpt-4o-mini`, key in `OPENAI_API_KEY`).
- `LLM_PROVIDER=ollama` → local Ollama (`OLLAMA_BASE_URL`, `OLLAMA_MODEL` default `llama3`).
- **Default:** OpenAI if configured, otherwise Ollama.

The provider chain is **ordered and self-falling**: each provider is tried in sequence and the first non-empty reply wins; if all fail, `chatCompletion` returns `""` and every caller falls back to a deterministic template — the system never breaks when a model is down. `src/lib/ollama.ts` remains as a compatibility shim so all existing agents benefit automatically.

### 11.2 Background LLM Agents

| Agent | Trigger | Function |
|-------|---------|----------|
| **Demand-Match** | New spot | Offers the spot exclusively to the single best-compatible seeker, scoped to the spot's business network if posted by a business |
| **User Growth** | New spot | Scans unregistered phones nearby, records SMS invites |
| **Spot Prediction** | Cron | Analyzes 7-day history to predict when/where spots open; notifies users |
| **Congestion Alert** | Cron | Flags neighborhoods with ≥10 alerts in 10 min; writes alerts + notifies |
| **Ad Insights** | Weekly | Generates per-advertiser performance reports |

### 11.3 App Agent (Admin Chat) — detailed

`/admin/agent` provides an admin-facing chat UI backed by `POST /api/agents/chat` (implementation: `src/lib/agents/app-agent.ts`).

**Request path:**
1. Middleware requires a Bearer token (chat is exempted from the agent-secret rule); the handler re-checks the caller is `admin` or `moderator` in the database.
2. The agent fetches a **live app snapshot** in one parallel batch (`getAppSnapshot`): total users, subscribing businesses, networks, active spots, active matches, active ads, active chats, plus today's congestion alerts, alerts, predictions, invites, and the top 5 neighborhoods by spot volume.
3. The snapshot is rendered into the **system prompt**, which also describes the exclusive matching model verbatim (so the agent answers accurately about how matching works).
4. The conversation (user/assistant turns, bounded to the last 20 messages) is sent through `chatCompletion` → the configured LLM provider.
5. On LLM failure, a deterministic `templateReply()` answers metrics questions ("how many users…", "active spots…", "congestion…", etc.) from the same snapshot.
6. The response reports which `engine` produced it (`openai` / `ollama` / `template`) and returns the snapshot, so the admin UI can show data provenance.

### 11.4 On-Device Behavior Agent (rule-based inference)

A client-side sensor-fusion agent infers driver/vehicle state from GPS + DeviceMotion without any network dependency:

- **Sensors** (`src/lib/behavior/sensors.ts`): `GpsSensor` (high-accuracy watchPosition) and `MotionFeatureExtractor` (step detection via peak counting, vibration energy, step cadence from `devicemotion`).
- **State machine** (`src/lib/behavior/agent.ts`) — 9 states:
  `unknown → driving → parking_in_progress → parked → walking_away → away → returning → near_car → vehicle_moved`.
- **Events** — `PARK_CONFIRMED`, `WALKING_AWAY_CONFIRMED`, `RETURNING_CONFIRMED`, `NEAR_CAR_CONFIRMED`, `CAR_MOVED_CONFIRMED`, each with a confidence score.
- **Automation** — `PARK_CONFIRMED` can auto-save the car's location; departure events can auto-post the spot or push match status; preferences live in `behavior_agent_config`, and every fired decision is audit-logged to `agent_events`.
- **Validation** — unit-tested state transitions; real-hardware runs recorded in `behavior_device_tests` / `behavior_test_events` and reviewable in the admin.

### 11.5 Virtual Environment (multi-agent simulation)

`VirtualEnvironment` (`src/lib/virtual-environment/engine.ts`) simulates an entire street grid of **autonomous agents** (owner/seeker/bystander roles) that move along waypoint routes at configurable time speed, GPS noise, and traffic density, and broadcast positions into `driver_locations` exactly like real phones. This is the substrate for load-testing the matching pipeline, control tower, and behavior detection without human involvement.

---

## 12. Admin & Operations Console

All admin pages live under `/admin` (role-gated to `admin`/`moderator`, enforced client-side *and* server-side on API routes).

| Page | Capabilities |
|------|--------------|
| **Dashboard** | Aggregate KPIs: users, spots, ads, active chats; 19 agent-metric cards; top-5 neighborhoods; ad performance table with CTR |
| **App Agent** | Chat with the AI assistant (see §11.3) |
| **Control Tower** | Full-screen live map of matches with owner/seeker markers, dashed route lines, ETA, status badges; sidebar with Matches/Users tabs; realtime + 10 s polling |
| **Users** | Search, view vehicle/role, promote/demote to admin/moderator, online indicator, remote sign-out |
| **Flags** | Search/filter, resolve, delete flagged spots; audit trail (`resolved_by`, `resolved_at`) |
| **Ad Campaigns** | CRUD for geofenced ads; impression/click/CTR analytics |
| **Pilot Areas** | CRUD of bounding-box beta zones that gate access |
| **Street Sweeping** | CRUD of street sweeping schedules; drives user alerts |
| **Potential Matches** | Review queued/compatible match candidates |
| **Broadcast** | Push notifications to all or specific users (Web Push) |
| **Test Suite** | GPS simulator, route playback, parking tester, tracking monitor, ETA tester, geofence tester, scenario runner, match scenario, virtual environment (§13) |

**Operations posture:**
- Every admin route re-verifies `role` from the database (never trusts the client).
- The control tower and dashboard stream live data via Realtime with polling fallback, rate-limited by the **distributed** limiter.
- Moderation actions are audit-logged (who resolved what, when).

---

## 13. Testing & QA Infrastructure

### 13.1 Automated tests (Vitest)

`npm test` → Vitest 4 (Node environment, `@` alias). **54 tests across 10 suites**, covering: exclusive matcher helpers (offer window, radius, haversine, schedule compatibility), distributed rate-limiter fallback, structured logger (JSON output, error sanitization, non-throwing persistence), Stripe metadata validation, LLM provider ordering + fallback chain (stubbed env + mocked fetch), geo/telemetry validation, `cn()`, vehicle types, map helpers, and behavior-agent state transitions.

### 13.2 In-app Admin Test Suite (`/admin/testing`)

Nine interactive panels operate real simulated devices (4 seeded test accounts) against the live stack:

1. **GPS Simulator** — coordinates, presets, speed/heading/accuracy, GPS noise (±50 m), underground (signal-loss) mode, click-to-set-position map.
2. **Route Playback** — preset routes + GPX paste/parse, play/pause/step, 1×–10× speed, waypoint markers.
3. **Parking Tester** — "Simulate Parking (30 s)" / "Simulate Driving", detection-window logic, event log.
4. **Tracking Monitor** — live map of all test devices with color-coded status (driving/parked/idle/offline) via realtime.
5. **ETA Tester** — OSRM ETA with multipliers and haversine fallback; sortable results.
6. **Geofence Tester** — polygon drawing + entry/exit simulation with event log.
7. **Scenario Runner** — multi-step scripts across 2 devices with pass/fail export.
8. **Match Scenario** — end-to-end simulated handoff with a dual-phone side-by-side UI and voice navigation.
9. **Virtual Environment** — full multi-agent street simulation (see §11.5).

### 13.3 AI Test Campaign Engine

`AiTestRunner` (`src/lib/testing/ai-test-engine.ts`) automates test campaigns: N iterations × M routes × speed multipliers × noise/underground toggles, asserting parking-detection and match/handoff success rates, producing a structured report with detection time, match success, handoff success, and error counts.

### 13.4 Real-Device Behavior Harness

The mobile app can record a hardware test run (GPS + DeviceMotion) into `behavior_device_tests`/`behavior_test_events`, letting engineers validate the behavior agent against real sensors and review results in the admin.

---

## 14. Database Schema (40 migrations, ~60 objects)

| Domain | Tables |
|--------|--------|
| **Core** | `users`, `parking_spots`, `spot_matches`, `notifications`, `contribution_stats` |
| **Discovery** | `spot_requests`, `departure_pings`, `spot_waitlist`, `user_parking_spots`, `recurring_schedules` |
| **Social** | `ephemeral_chats`, `ephemeral_messages`, `user_blocks` |
| **Safety** | `spot_flags`, `user_ratings`, `phone_otps` |
| **Monetization** | `credit_purchases`, `tips`, `ads`, `ad_analytics`, `street_sweeping`, `street_sweeping_alerts` |
| **Gamification** | `user_game_profile`, `game_transactions`, `badges`, `user_badges`, `quests`, `user_quests` |
| **Education** | `courses`, `user_course_progress`, `user_ranking` |
| **Tracking** | `driver_locations`, `active_sessions`, `car_locations` |
| **Matching (v2)** | `parking_spots.visibility/exclusive_attempts/max_exclusive_attempts`, `spot_matches` offered-state columns, `users.decline_count/no_show_count` |
| **Growth** | `invite_conversions` |
| **Push/Devices** | `device_push_subscriptions`, `notification_preferences`, `device_id` tracking |
| **Admin** | `pilot_areas`, `congestion_alerts`, `spot_predictions` |
| **Hardening (v2)** | `rate_limits` (distributed throttling), `app_logs` (structured logging, 30-day TTL), `webhook_events` (Stripe replay protection) |
| **AI/Behavior** | `behavior_agent_config`, `agent_events`, `behavior_device_tests`, `behavior_test_events` |

Notable database behavior implemented as triggers/RPCs: contribution-stats auto-update, rating recomputation, spot auto-expiry, flag-count propagation, ranking updates, default profile/game-profile initialization on signup, `deduct_match_credit`, `complete_credit_purchase` (idempotent credit grant), `check_rate_limit` (atomic window counter), `insert_webhook_event`, `insert_app_log`, `ensure_user_exists`, `maintain_streaks`, `is_user_blocked`, and the TTL cleanup jobs.

---

## 15. Security & Privacy

- **RLS** on user-owned tables (own-row read/write policies) *and* on the exclusive-spot visibility rule; service-role used only server-side.
- **Server-side authz** — every admin/moderation route re-verifies role from the DB; middleware provides a structural token check; agent cron endpoints additionally require `x-agent-secret`.
- **Webhook integrity** — Stripe webhooks signature-verified, livemode-checked, replay-safe, and grant-idempotent.
- **Distributed rate limiting** — Postgres-backed window counters shared across all instances, with strict per-endpoint limits (e.g., 30 match-status/60 s, 12 car-location/60 s, 3 ai-test/60 s).
- **Structured logging** — JSON logs with sanitized contexts; never logs secrets; 30-day retention.
- **Input validation** — shared `geo-validation` module enforces coordinate ranges (±90/±180) and telemetry ranges (speed ≤200 km/h, accuracy ≤5000 m, heading ≤360°) on every location-accepting route.
- **Privacy by design** — exclusive spots are invisible until public fallback; location shared only during active matches; ephemeral chats auto-delete; versioned TOS; no data selling; retention documented in `docs/DATA_RETENTION.md`.
- **Headers** — security headers + `Cache-Control: no-store` stamped on all API responses by middleware.
- **Payments** — no card data touches the app; Stripe hosted checkout only.

---

## 16. API Surface (highlights, ~69 route handlers)

- **Spots:** `POST /api/spots`, `GET /api/spots`, `GET/POST /api/parking-spots/*`, `POST /api/spots/[id]/claim`, `/cancel`, `/tip`
- **Matches (exclusive):** `POST /api/matches/find` (single offer), `POST /api/matches/[id]` (accept/decline → reassignment), `POST /api/matches/[id]/status` (arrival/departure/no-show → reliability + re-offer), `POST /api/matches/schedule`, `/location` (+ `/start`/`/stop`)
- **Cron:** `POST /api/cron/expire-offers` (offer TTL + public fallback; `x-cron-secret` guarded)
- **Tracking:** `POST /api/location/update`, `POST /api/user/location`, `/api/driver-locations`, `POST /api/car-locations`, `/api/car-locations/[id]`
- **Auth:** `/api/auth/*`, `/api/auth/phone-request`, `/api/auth/phone-verify`
- **Payments:** `/api/purchase/checkout`, `/api/purchase/credits`, `/api/purchase/webhook`, `/api/payments/history`
- **Push:** `/api/push/subscribe`, `/unsubscribe`, `/send-match`
- **Ads:** `/api/ads/[id]/impression`, `/api/ads/[id]/click`
- **Agents:** `/api/agents/{ad-insights,congestion,demand-match,grow-users,predict-spots}`, `/api/agents/chat`
- **Admin:** `/api/admin/dashboard`, `/control-tower`, `/users/*`, `/broadcast`, `/behavior-tests`, `/potential-matches`, `/promote`, `/run-migration`
- **Misc:** ratings, flags, tips, courses, quests/XP/badges, street sweeping, notifications preferences, waitlist, TOS acceptance.

---

## 17. Deployment & Operations

- **GitHub → Vercel** continuous deployment on `main`.
- **Environment config:**
  - Core: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Verification: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `PHONE_VERIFICATION_ENABLED`
  - Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
  - Maps: `NEXT_PUBLIC_MAP_DEFAULT_LAT/LNG/STYLE_URL`
  - **Matching (v2):** `MATCH_OFFER_WINDOW_MS` (default 90000), `MATCH_RADIUS_METERS` (default 200), `CRON_SECRET` (falls back to `AGENT_SECRET_KEY`)
  - **Agents (v2):** `AGENT_SECRET_KEY`, `LLM_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- **Scheduled jobs:**
  - `POST /api/cron/expire-offers` every minute — expires stale exclusive offers, sweeps exhausted spots to public fallback (`Authorization: Bearer <any>` + `x-cron-secret`).
  - `scripts/ttl-cleanup.ts` every 5 minutes — ephemeral chat/ping/location cleanup, streak maintenance, expired rate-limit windows, app-log retention.
  - Agent crons hit `/api/agents/*` with `x-agent-secret`.
- **Build health:** `npm run build` clean; `npx tsc --noEmit` passes; `npm test` green (54 tests). `npm run lint` reports only pre-existing warnings/errors in legacy files.

---

## 18. Current State, Limitations, and Roadmap

### Current state
- Feature-complete core loop (post → exclusive offer → track → complete), monetization live, full admin console, extensive simulation/testing harness, and a multi-tier AI layer.
- Production hardening shipped: distributed rate limiting, structured logging, idempotent payments, configurable LLM providers, validated inputs, documented retention.

### Known limitations
- **Single-city geofence** — pilot-area gating currently targets the launch neighborhood.
- **LLM latency/cost in serverless** — external provider calls happen inline; the template fallback covers outages but long-running agents (spot prediction, ad insights) may want queued/background execution.
- **No native mobile app** — relies on PWA capabilities (DeviceMotion requires HTTPS and user gesture; motion permission availability varies by platform/browser).
- **Moderation is reactive** — flag/rating gating is effective but not preventive; planned escalation tooling (human review queue) remains a roadmap item.

### Roadmap signals (from `MONETIZATION-OPTIONS.md`)
Freemium Gold subscriptions, Stripe Connect payouts, business/operator subscriptions, surge pricing during events, street-sweeping data licensing, and white-labeling to other cities.

---

## 19. Conclusion

Parking Meeters is a complete, deployable, and unusually well-instrumented system: a real-time marketplace where the "inventory" is ephemeral by law and design, enforced by exclusive invisible matching, atomic claims, hard expiry, trust/reputation scoring, and regulatory framing. Its engineering differentiators are the **exclusive single-driver matching engine**, the **behavior-inference agent running on the device**, the **virtual environment + AI test campaign harness**, a **configurable LLM stack that degrades gracefully**, and a **serverless-safe hardening layer** (distributed rate limiting, structured observability, idempotent payments). The architecture (Next.js + Supabase Realtime + event-driven agents) is portable to other cities and other time-sensitive resource-sharing domains.

---

*End of paper.*
