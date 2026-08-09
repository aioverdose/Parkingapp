# SpotMatch — Current Technical Paper

## B2B parking coordination platform for controlled neighborhood pilots

**Version:** 3.0
**Date:** August 2026
**Repository:** `parkingapp`
**Production:** `https://parkingapp-pi.vercel.app`

---

## Abstract

SpotMatch is operational software for restaurants, bars, and local operators that want to improve customer arrivals in parking-constrained commercial areas. It coordinates an imminent departure with exactly one eligible member of a private or shared business network.

SpotMatch is not a public parking marketplace. It does not sell, rent, reserve, or assign ownership of public parking spaces. It coordinates drivers who are already leaving and drivers who need to arrive. Posted street rules, permits, time limits, and street-sweeping restrictions continue to apply.

The application is built with Next.js 16, React 19, TypeScript, Supabase PostgreSQL/Auth/Realtime, Tailwind CSS, and Vercel. This paper describes the current B2B architecture, data model, matching protocol, security boundaries, retention jobs, business dashboard, device testing workflow, deployment requirements, and remaining pilot risks.

---

## 1. Product Model

### 1.1 Business problem

In dense areas such as Belmont Shore and 2nd Street, customers can circle for 10–15 minutes, arrive late, or leave before entering a business. Parking can also produce negative reviews and force staff and regulars to compete for the same spaces.

SpotMatch gives a business a lightweight coordination layer without requiring a valet. A member signals that they are leaving. The service selects one nearby eligible participant and gives that person a short-lived offer.

### 1.2 Product boundaries

SpotMatch is:

- a private/shared network coordination service;
- an imminent departure notification system;
- business-scoped operational software;
- a dashboard for members, spots, matches, and basic activity; and
- optionally branded business software.

SpotMatch is not:

- a reservation system;
- a public claim marketplace for B2B spots;
- a valet service;
- a guarantee of a public street space;
- a mechanism for selling or renting parking; or
- a replacement for municipal parking enforcement.

### 1.3 Pilot success criteria

The first 30-day pilots should measure:

- successful handoff rate;
- median offer response time;
- decline, expiry, cancellation, and no-show rates;
- repeat participation by members;
- parking-related customer complaints; and
- staff time spent coordinating arrivals.

Metrics should be aggregated at business or network level. Raw movement history should not become a long-term product asset.

---

## 2. System Architecture

```text
Business admin / staff / member / device tester
                         |
                         | HTTPS + Supabase session
                         v
                  Next.js 16 application
       public homepage | business UI | admin UI | APIs
                         |
              route authorization + validation
                         |
                         v
                  Supabase PostgreSQL
 business | network | members | spots | matches
 sessions | locations | audit | notifications
                         |
          +--------------+----------------+
          |                               |
    Supabase Realtime                Scheduled jobs
          |                 protected API + optional pg_cron
          v                               v
     live UI updates             expiry, cleanup, retention
```

### 2.1 Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 App Router |
| UI runtime | React 19.2.4, TypeScript 5 |
| Styling | Tailwind CSS 3.4, Geist, Lucide |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth, email/password and recovery flow |
| Authorization | Route checks, role checks, RLS, database triggers |
| Realtime | Supabase Realtime |
| Notifications | Web Push with VAPID, in-app notifications |
| Deployment | Vercel |
| Tests | Vitest |

### 2.2 Data-access boundaries

The application has browser and server database paths. The browser uses the Supabase anon key and is constrained by RLS. Server routes use a service-role client for operations such as matching, dashboards, cleanup, and administrative actions.

Because the service-role client bypasses RLS, every server route must explicitly validate:

1. authenticated identity;
2. business membership;
3. role where required;
4. business/network relationship; and
5. payload and state-transition validity.

The service-role key must never be exposed to client code or scheduler requests.

---

## 3. B2B Tenant Model

### 3.1 Entities

```text
businesses
  subscriber account, status, plan, seat limit, operating area

networks
  private or shared coordination scope

network_businesses
  business participation in a shared or private network

business_members
  user membership, role, and status

parking_spots
  imminent departure with business/network attribution

spot_matches
  offer and handoff lifecycle with business/network attribution

business_member_audit
  removal actor, target, business, action, and timestamp
```

### 3.2 Roles and statuses

Business roles are:

- `admin`: manages members, business settings, and branding;
- `staff`: participates operationally; and
- `member`: participates without administrative access.

Only active memberships qualify for network matching. Business operation is allowed for `trialing` and `active` statuses. Suspended and canceled businesses cannot accept new members or perform new B2B operational actions.

Plans currently include `trial`, `standard`, `pro`, and `enterprise`. Billing can remain manual during pilots, but status and seat limits are enforced in the application and database.

### 3.3 Shared networks

A shared network lets multiple businesses coordinate within a defined neighborhood group. Shared access does not grant access to every business dashboard, roster, or branding record. A user qualifies for a shared network only through an active membership in a business linked to that network.

---

## 4. Exclusive Matching Protocol

### 4.1 Invariant

For one active spot, at most one live offer or confirmed handoff may exist.

Migration `00042_exclusive_offer_guard.sql` adds a PostgreSQL partial unique index across live match statuses:

```sql
CREATE UNIQUE INDEX spot_matches_one_live_per_spot
ON public.spot_matches (spot_id)
WHERE status IN (
  'pending', 'offered', 'confirmed_by_owner',
  'confirmed_by_seeker', 'confirmed'
);
```

The application performs an early active-match query, but PostgreSQL is the final concurrency authority. If two workers race, only one insert can succeed.

### 4.2 Lifecycle

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

An offer has a short acceptance window. The default is 90 seconds and can be configured through `MATCH_OFFER_WINDOW_MS`.

### 4.3 Candidate selection

The matcher applies hard filters for:

- active network membership;
- active seeker request;
- geographic radius;
- vehicle compatibility;
- schedule compatibility; and
- block or self-exclusion.

Ranking then considers trust, prior successful handoffs, reliability, flags, and proximity.

### 4.4 Reassignment and idempotency

Decline and expiry use a conditional transition from `offered` to `offer_declined` or `offer_expired`. Only the worker that wins the transition performs associated side effects.

Repeated cron calls are safe. A previously closed offer cannot be closed again or cause repeated decline accounting. The unique index prevents reassignment races from creating duplicate live offers.

### 4.5 B2B no-public-fallback rule

If a network spot has no eligible candidate or exhausts its exclusive attempts, it remains private and coordination ends. It does not become an open public map marker.

---

## 5. Application Routes

### 5.1 Public and business routes

| Route | Purpose |
|---|---|
| `/` | B2B homepage and pilot CTA |
| `/auth/login` | Shared login for business and platform admins |
| `/auth/reset-password` | Password recovery completion |
| `/business` | User’s businesses and business creation |
| `/business/[id]` | Business dashboard |
| `/admin` | Platform admin dashboard |
| `/admin/testing` | Simulation and device-test monitoring |
| `/test/behavior` | Real phone behavior-agent test |

After login, platform users with `admin` or `moderator` roles go to `/admin`; other users go to `/business`. A `next` path is supported for protected workflows such as `/test/behavior`.

### 5.2 Business API

The current business API includes:

- `GET/POST /api/businesses`;
- `GET/PATCH /api/businesses/[id]`;
- `GET /api/businesses/[id]/dashboard`;
- `POST /api/businesses/[id]/join`;
- `GET/POST /api/businesses/[id]/members`;
- `PATCH/DELETE /api/businesses/[id]/members/[userId]`; and
- B2B-aware `/api/spots` and `/api/matches` operations.

Business dashboards expose active spots, members, match totals, recent activity, member roles, and lifecycle labels such as Offered, Accepted, Completed, No-show, Expired, and Declined.

---

## 6. Authorization and Privacy

### 6.1 Authorization guarantees

An active member of Business A cannot use business API routes to read Business B configuration, dashboard, roster, or branding. Staff and ordinary members cannot add/remove members or update business configuration.

Database helpers include `current_user_business_role` and `user_is_network_member`. The route layer adds explicit checks because many dashboard and matching queries use the admin client.

### 6.2 Member removal

An admin removal:

1. verifies admin role;
2. finds active offers addressed to the target;
3. removes the membership;
4. records an audit row;
5. expires and reassigns active offers; and
6. prevents future network eligibility.

The removal audit records only business ID, target user ID, actor user ID, action, and timestamp.

### 6.3 Location minimization

Precise driver locations exist only for an active operational handoff. They are deleted after the operational window. Car-location traces and ephemeral chats are also cleaned. Aggregate match and business statistics remain available without preserving raw movement history.

---

## 7. Scheduled Jobs and Retention

### 7.1 Protected API job

`POST /api/cron/expire-offers` is the application-level worker. It:

- expires stale offers;
- attempts next-candidate reassignment;
- stops privately when no network candidate remains;
- sweeps eligible exclusive spots; and
- invokes the retention RPC.

Required headers:

```text
Authorization: Bearer <CRON_SECRET>
x-cron-secret: <CRON_SECRET>
```

This endpoint should be called every minute by cron-job.org, Vercel Cron, or another authenticated HTTP scheduler.

### 7.2 Supabase retention job

Migration `00047_pilot_retention_schedule.sql` creates `cleanup_pilot_data()` and schedules it every five minutes when `pg_cron` is available:

```sql
SELECT cron.schedule(
  'spotmatch-pilot-retention',
  '*/5 * * * *',
  'SELECT public.cleanup_pilot_data();'
);
```

The SQL job does not expire offers first because offer reassignment requires application candidate selection and notification behavior. It cleans:

- completed spots by marking them `taken`;
- active spots past `expires_at` by marking them `expired`;
- precise driver locations;
- stale car locations;
- expired ephemeral chats; and
- old completed/expired chats.

The operations are idempotent. Migration `00043_pilot_retention.sql` provides the broader API-invoked retention function for environments without `pg_cron`.

### 7.3 Migration order

For an existing database already through migration `00041`, apply:

```text
00042_exclusive_offer_guard.sql
00043_pilot_retention.sql
00044_business_member_audit.sql
00045_business_pilot_guardrails.sql
00046_b2b_visibility_safety.sql
00047_pilot_retention_schedule.sql
```

For a new database, apply all migrations from `00001` through `00047` in order.

---

## 8. Business Guardrails

### 8.1 Seat limits

Migration `00045_business_pilot_guardrails.sql` installs a row-locked membership trigger. It locks the business row, checks status, counts active members, and rejects an active insert at `seats_limit`.

The application also performs an early seat/status check to return clear HTTP errors. The database trigger is authoritative during concurrent joins.

### 8.2 Network visibility

Migration `00046_b2b_visibility_safety.sql`:

- converts existing network-public spots to exclusive;
- rejects network spots configured as public;
- removes the broad legacy active-spot read policy; and
- prevents exclusive network spots from becoming public discovery records.

### 8.3 Notification failure

Push delivery distinguishes no registered device from delivery failure. If no subscription exists, the dashboard and in-app notification remain valid. If all registered subscriptions fail, the offer is closed and reassignment proceeds.

The persisted dashboard state is authoritative; push delivery is only a transport mechanism.

---

## 9. Admin and Device Testing

### 9.1 Simulated tests

`/admin/testing` contains simulated panels for GPS, routes, parking detection, tracking, ETA, geofencing, scenarios, match behavior, AI tests, and virtual environments.

### 9.2 Real device test

The **Device Tests** panel monitors test sessions recorded from phones. The **Launch device test** action opens `/test/behavior`.

On the phone:

1. Open the production URL over HTTPS.
2. Log in on the same browser.
3. Allow GPS and motion access.
4. Choose Default or Fast thresholds.
5. Tap Start Test.
6. Drive, park, remain still, walk away, return, get in, and drive away.
7. Tap End Test.

The admin Device Tests panel then displays the recorded session, device label, duration, state transitions, agent events, GPS fixes, motion samples, and summary.

If the phone is not authenticated, `/test/behavior` redirects to `/auth/login?next=/test/behavior` and returns there after login.

---

## 10. Deployment

### 10.1 Vercel

The production deployment is Vercel-compatible and currently builds successfully. Required server environment variables include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
```

Optional integrations include VAPID, Twilio, Stripe, and model-provider variables.

The Supabase URL must be a URL such as:

```text
https://project-ref.supabase.co
```

It must not be a Vercel project ID.

### 10.2 Production checklist

Before a live pilot:

1. Configure Vercel environment variables.
2. Apply migrations through `00047`.
3. Verify Supabase Auth redirect URLs.
4. Schedule `/api/cron/expire-offers` every minute.
5. Verify `pg_cron` retention scheduling if enabled.
6. Log in as a platform admin and confirm `/admin`.
7. Log in as a business user and confirm `/business`.
8. Create a business, add members, post a spot, and observe one offer.
9. Remove a member and confirm eligibility is revoked.
10. Run the device test from an HTTPS phone session.

---

## 11. Verification and Residual Risks

Current repository checks:

```text
npm test          67 tests passed
npx tsc --noEmit  passed
npm run build     passed during production deployment
```

Automated tests cover matching utilities, network scoping, no-public-fallback behavior, concurrent offer simulation, idempotent expiry, and B2B route authorization.

The following still require live staging verification:

- concurrent inserts against actual PostgreSQL;
- RLS behavior with JWTs from separate businesses;
- trigger behavior at the exact seat limit;
- migration execution in the target Supabase project;
- `pg_cron` job execution history;
- retention deletion against real location records; and
- end-to-end push failure and reassignment behavior.

The main residual architectural risk is use of the service-role client in server routes. Any future route that reads or writes tenant data must preserve explicit membership and role checks.

---

## Conclusion

SpotMatch is now structured as B2B coordination software rather than a consumer parking marketplace. Its core technical guarantee is exclusive, network-scoped handoff: one departure is offered to one eligible member at a time, with conditional state transitions, database uniqueness enforcement, and no public fallback for business spots.

The operational foundation includes tenant-aware business dashboards, member roles, audit-backed removal, seat/status guardrails, location retention, stale spot cleanup, protected offer expiry, and optional Supabase `pg_cron` retention scheduling. The application is deployable to Vercel, but a real pilot requires valid Supabase production configuration, ordered migrations, an external one-minute API scheduler, and live staging verification of RLS and concurrency behavior.
