# SpotMatch Local Parking Intelligence

## A B2B platform for departure coordination and neighborhood parking pattern learning

**Version:** 1.0
**Date:** August 2026
**Repository:** `parkingapp`
**Audience:** Founders, pilot partners, engineers, and technical reviewers

---

## Abstract

SpotMatch helps local businesses reduce arrival friction in parking-constrained commercial areas. It does this in two layers:

1. **Coordination:** when a network member is already leaving, the system gives exactly one eligible nearby member a short-lived heads-up.
2. **Intelligence foundation:** anonymized departure and handoff events accumulate into block-level history that can support future local pattern analysis.

SpotMatch does not sell, rent, reserve, or guarantee public parking spaces. Street parking remains uncontrolled public infrastructure. The product’s value is earlier information, cleaner coordination, and eventual local pattern awareness, not manufactured supply.

The coordination layer is the pilot wedge. This release adds only the minimum event-capture foundation needed to preserve anonymized business/network outcomes. Prediction models, arrival recommendations, and intelligence dashboards are explicitly deferred until staging verification and real pilot volume exist.

---

## 1. The Permanent Constraint

### 1.1 What the product cannot do

No application can guarantee a free street parking space. A notified driver may still lose the space to a passerby, timing variance, congestion, blocked access, street sweeping, permits, or enforcement.

Any product that implies certainty will eventually be blamed for normal public-street behavior.

### 1.2 What the product can do

SpotMatch can:

- turn a real departure into a timely one-to-one heads-up;
- reduce blind circling for members of a business network;
- give businesses operational visibility into departure and offer activity;
- measure response, acceptance, expiry, decline, and no-show behavior; and
- preserve anonymized event history for later local pattern analysis.

The correct promise is **information advantage**, not inventory control.

---

## 2. Product Pivot

### 2.1 From marketplace to local intelligence

SpotMatch is local parking coordination software for businesses. It starts by coordinating real departures inside a private or shared network. It can later learn when supply tends to appear around that business, but it does not make predictions during the initial pilot.

The handoff is the wedge. The pattern layer is a future value layer, not a reason to retain personal movement history.

### 2.2 Ideal customer

Primary buyers are:

- restaurants and bars on constrained commercial corridors;
- multi-location local operators;
- property managers supporting several storefronts; and
- neighborhood business groups seeking shared block-level insight.

Secondary users are staff, regulars, and invited customers inside the business network.

### 2.3 Explicit non-objectives

SpotMatch is not:

- a public parking marketplace;
- a reservation or advance-hold system;
- a valet dispatch product;
- a guarantee of curb availability;
- a citywide consumer discovery map; or
- a system for selling or renting public parking.

“Exclusive” describes notification audience and coordination attempt. It does not describe ownership of a public space.

---

## 3. Value Proposition by Time Horizon

| Horizon | What the business gets | Honest outcome |
|---|---|---|
| Day 1 | One-to-one departure heads-ups | Less chaotic arrival coordination |
| First 30 days | Offers, accepts, expiries, declines, and no-shows | Visibility into real parking friction |
| Days 30–90 | Sufficient anonymized event history | Possible block/time pattern summaries |
| After sufficient history | Future arrival-window analysis | Probabilistic decision support |

The current release stops at event capture. It does not convert event history into predictions or recommendations.

---

## 4. Core Product Surfaces

### 4.1 Coordination layer

When a network member posts an imminent departure:

1. Active network members are filtered for eligibility.
2. Exactly one candidate receives a short-lived offer.
3. The candidate accepts, declines, or times out.
4. On decline or timeout, the system may offer the next eligible member.
5. If no candidate remains, private coordination ends.
6. The event is never converted into a public claim marker.

The default offer window is approximately 90 seconds and is configurable.

### 4.2 Business dashboard

The current dashboard emphasizes operations:

- active departures and offers;
- acceptance, expiry, decline, and no-show status;
- basic match totals;
- member and recent activity lists; and
- business/network administration.

Pattern cards, forecasts, and recommendation panels are not part of this release.

### 4.3 Intelligence foundation

The current foundation records only anonymized business/network events already produced by the coordination flow:

- departure recorded;
- offer created;
- accepted;
- expired;
- declined;
- no-show; and
- completed.

Each event stores business, network, timestamp, local daypart, outcome, and optional internal spot/match references for deduplication and auditability. It does not store user IDs, precise coordinates, or movement trails.

---

## 5. Data Philosophy

### 5.1 Two data layers

SpotMatch separates operational data from future intelligence data.

| Layer | Contents | Retention | Purpose |
|---|---|---|---|
| Operational | Precise live location during an active handoff | Short-lived | Support the current offer and handoff |
| Intelligence foundation | Anonymized business/network events by place context and time | Longer-term, subject to policy | Enable future local pattern analysis |

Precise movement trails are not a product asset. Aggregated coordination events are.

### 5.2 Minimization rules

- Collect precise location only while operationally necessary.
- Delete precise coordinates after the handoff operational window.
- Retain event history without user identifiers.
- Do not build cross-business individual movement profiles.
- Prefer business/network and daypart aggregates over person-level histories.
- Do not add block-level coordinates until the pilot defines a safe, non-identifying geofence representation.

### 5.3 Prediction honesty

Future suggestions must be presented as historical tendencies, likelihood bands, or comparative windows. They must never be presented as guaranteed openings, reserved spaces, or assigned public inventory.

No prediction or recommendation engine is implemented in this release.

---

## 6. Legal and Commercial Positioning

### 6.1 Coordination, not commerce in curb space

SpotMatch coordinates communication about departures that are already occurring. It does not create a marketplace for public parking rights.

Recommended public language:

> SpotMatch never sells or rents parking spaces. It helps a business coordinate real departures and learn local parking patterns. Street rules, posted limits, permits, and sweeping restrictions still apply. A heads-up is not a reservation.

### 6.2 Why the B2B frame remains essential

Selling to businesses rather than the general public:

- narrows the network and expectations;
- makes subscription pricing natural;
- reduces marketplace optics; and
- supports a credible path from coordination to local intelligence.

The buyer purchases operational software and future insight, not access to public property.

### 6.3 Commercial model

| Package | Includes | Role |
|---|---|---|
| Pilot | Coordination and basic dashboard | Prove workflow |
| Standard | Coordination, member tools, and core metrics | Daily operations |
| Insights | Future pattern summaries by daypart/block | Management value |
| Guidance | Future arrival-window suggestions | Premium decision support |

Billing may begin manually. Seat limits and business status remain enforced.

---

## 7. System Architecture

```text
Business admin / staff / member
              |
              | authenticated session
              v
       Next.js application
  marketing | dashboard | member flows | APIs
              |
     authorization + validation
              |
              v
        Supabase PostgreSQL
 businesses | networks | members
 spots | matches | event capture | audit
              |
     +--------+---------+
     |                  |
 Realtime updates    Scheduled jobs
                     offer expiry
                     retention cleanup
                     optional future rollups
```

### 7.1 Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 App Router |
| UI runtime | React 19.2.4, TypeScript 5 |
| Styling | Tailwind CSS 3.4, Geist, Lucide |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth, email/password and recovery |
| Authorization | Route checks, role checks, RLS, database triggers |
| Realtime | Supabase Realtime |
| Notifications | Web Push with VAPID and in-app notifications |
| Deployment | Vercel |
| Tests | Vitest |

### 7.2 Data-access boundaries

The browser uses the Supabase anon key and is constrained by RLS. Server routes use a service-role client for matching, dashboards, cleanup, and administrative actions.

Because the service-role client bypasses RLS, every server route must explicitly validate authenticated identity, membership, role, business/network relationship, payload, and state transition.

---

## 8. Tenant and Coordination Model

### 8.1 Core entities

```text
businesses
  subscriber account, status, plan, seat limit, operating area

networks
  private or shared coordination scope

network_businesses
  business participation in a network

business_members
  user membership, role, and status

parking_spots
  imminent departure with business/network attribution

spot_matches
  offer and handoff lifecycle with business/network attribution

business_handoff_events
  anonymized business/network outcome events
```

### 8.2 Roles and statuses

Business roles are `admin`, `staff`, and `member`. Only active memberships qualify for matching. Business operation is allowed for `trialing` and `active` statuses. Suspended and canceled businesses cannot accept new members or perform new B2B operational actions.

### 8.3 Shared networks

A shared network permits multiple businesses to coordinate within a defined neighborhood group. Shared participation does not grant access to another business’s dashboard, roster, branding, or private administrative data.

---

## 9. Exclusive Matching Protocol

### 9.1 Invariant

For one active spot, at most one live offer or confirmed handoff may exist.

Migration `00042_exclusive_offer_guard.sql` adds a partial unique PostgreSQL index across live match statuses. The application performs an early query, but PostgreSQL is the final concurrency authority.

### 9.2 Lifecycle

```text
departure posted
      |
      v
active network members filtered
      |
      v
one exclusive offer created
      |
 +----+------------------+
 |                       |
 v                       v
accepted              declined/expired
 |                       |
 v                       v
handoff flow        next eligible member
                           |
                           v
                    retry within policy
```

### 9.3 B2B no-public-fallback rule

If a network spot has no eligible candidate or exhausts exclusive attempts, it remains private and coordination ends. It does not become an open public map marker.

### 9.4 Event capture points

Database triggers capture existing coordination transitions without changing matching behavior:

| Source transition | Captured outcome |
|---|---|
| Business spot inserted | `departure` |
| Match inserted as offered | `offered` |
| Offer accepted | `accepted` |
| Offer declined | `declined` |
| Offer timeout | `expired` |
| Active session no-show | `no_show` |
| Match completed | `completed` |

Each event uses a deterministic key and `ON CONFLICT DO NOTHING`, making repeated triggers or migration-safe retries idempotent.

---

## 10. Anonymized Event-Capture Foundation

Migration `00048_business_event_capture.sql` adds `business_handoff_events` with:

- `business_id`;
- `network_id`;
- `occurred_at`;
- `daypart`;
- `outcome`;
- nullable internal `spot_id` and `match_id` references; and
- a unique `event_key` for deduplication.

The table does not store:

- user IDs;
- email addresses;
- latitude or longitude;
- route traces;
- device identifiers; or
- prediction output.

RLS allows business members to read events for their business and does not provide a client insert policy. Trigger functions are server-side and use `SECURITY DEFINER` with a fixed search path.

This table is intentionally a raw anonymized event foundation, not an intelligence product. No rollups, models, recommendations, or new dashboard surface consume it yet.

---

## 11. Retention and Scheduled Jobs

### 11.1 Protected API job

`POST /api/cron/expire-offers` runs every minute through an external authenticated HTTP scheduler. It expires offers, attempts reassignment, ends private attempts when necessary, and invokes API-side retention cleanup.

Required headers:

```text
Authorization: Bearer <CRON_SECRET>
x-cron-secret: <CRON_SECRET>
```

### 11.2 Supabase retention job

Migration `00047_pilot_retention_schedule.sql` creates `cleanup_pilot_data()` and schedules it every five minutes when `pg_cron` is available. It closes stale spots, marks completed spots taken, purges precise driver/car locations, and cleans ephemeral chats.

Offer reassignment remains in the application job because candidate selection and notification delivery are application responsibilities.

### 11.3 Location policy

Operational precise locations are deleted after the handoff window. The anonymized event table retains only business/network event metadata and does not create a long-term personal movement history.

---

## 12. Application and Admin Surfaces

### 12.1 Routes

| Route | Purpose |
|---|---|
| `/` | B2B homepage |
| `/auth/login` | Shared login; routes platform admins to `/admin` and business users to `/business` |
| `/business` | Business list and creation |
| `/business/[id]` | Business operations dashboard |
| `/admin` | Platform administration |
| `/admin/testing` | Simulation and device-test monitoring |
| `/test/behavior` | Real phone behavior test |

### 12.2 Device testing

The admin Device Tests panel monitors real phone sessions. The Launch device test action opens `/test/behavior`. A tester logs in on the same phone/browser, grants GPS/motion permission, starts the test, drives, parks, walks away, returns, drives away, and ends the test.

The admin view displays device label, duration, state transitions, events, GPS fixes, motion samples, and the recorded summary.

### 12.3 Mobile navigation

The public homepage and admin dashboard expose dedicated mobile menus. The public menu contains How it works, For businesses, Pricing, and Contact. The admin menu provides access to dashboard, testing, control tower, users, pilot areas, and other internal tools.

---

## 13. Pilot Phasing

### Phase 1: coordination wedge

Ship now:

- private/shared business networks;
- one-driver exclusive offers;
- member and role controls;
- basic dashboard activity;
- offer expiry and retention jobs; and
- anonymized event capture.

### Phase 2: staging verification

Before intelligence features:

- verify migrations through `00048`;
- test RLS with separate businesses;
- test concurrent offers against real PostgreSQL;
- verify seat/status triggers;
- verify cron execution; and
- validate precise-location deletion.

### Phase 3: real pilot

Run a controlled 30-day pilot with a small known member set. Measure event volume and data quality before deciding whether pattern analysis is meaningful.

### Deferred phase

Do not build until sufficient real event volume exists:

- prediction models;
- arrival-window recommendations;
- demand forecasting;
- large intelligence dashboards; or
- long-term personal movement analytics.

---

## 14. Deployment and Verification

Required production environment variables include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

The Supabase URL must be a URL such as `https://project-ref.supabase.co`, not a Vercel project ID.

For an existing database through migration `00047`, apply:

```text
00048_business_event_capture.sql
```

For a new database, apply all migrations from `00001` through `00048` in order.

Current repository checks include 67 passing tests, successful TypeScript validation, and a successful production build. Live staging verification remains required for RLS, triggers, concurrent writes, `pg_cron`, retention, and event deduplication.

---

## Conclusion

SpotMatch’s durable B2B value begins with coordination and may grow into local parking intelligence. The coordination layer gives businesses a concrete day-one outcome: a real departure is communicated to one eligible member without turning public parking into a marketplace.

This release preserves only the minimum anonymized event history needed to evaluate whether a future pattern layer is justified. It does not make predictions, recommend arrival windows, redesign the dashboard around analytics, or retain personal movement trails.

The correct sequence is deliberate: verify the deployed system, run a real pilot, collect enough anonymized coordination events, and only then decide whether local parking patterns are statistically and operationally meaningful.
