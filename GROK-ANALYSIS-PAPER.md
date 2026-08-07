# SpotMatch B2B Pilot Readiness

## Technical analysis paper for Grok

**Version:** 1.0  
**Date:** August 2026  
**Repository:** `parkingapp`  
**Platform:** Next.js 16, React 19, TypeScript, Supabase PostgreSQL, Supabase Auth, Supabase Realtime

---

## Abstract

SpotMatch is being repositioned from a consumer parking application into private/shared business coordination software for restaurants, bars, and parking operators in dense commercial areas such as Belmont Shore and 2nd Street in Long Beach, California.

The B2B product coordinates imminent parking departures within an authorized business network. A driver who is already leaving can post a departure; the matching service selects exactly one eligible network member and creates a time-limited offer. The system never sells, rents, reserves, or assigns ownership of public parking spaces.

This paper describes the current implementation after pilot hardening work. It identifies the system’s invariants, concurrency controls, tenant isolation model, retention behavior, member lifecycle, plan guardrails, notification behavior, safety defaults, and residual risks. It is intended for independent analysis by Grok or another technical reviewer.

The most important conclusion is conditional: the application now contains the required controls for a controlled pilot, but production readiness still depends on applying Supabase migrations `00042` through `00047`, configuring the authenticated expiry job, verifying the optional Supabase `pg_cron` retention schedule, and validating the policies and triggers against a real staging database.

---

## 1. Product Boundary

### 1.1 What SpotMatch is

SpotMatch is a coordination layer for a business-controlled network. It helps a departing driver communicate a near-term opening to one eligible nearby driver. The business receives operational visibility and can coordinate staff, trusted regulars, customers, or neighboring businesses.

The product can operate in two network modes:

- **Private:** one business and its team or invited participants.
- **Shared:** multiple businesses connected to a neighborhood network.

### 1.2 What SpotMatch is not

SpotMatch is explicitly not:

- a public parking marketplace;
- a service that sells or rents street parking;
- an advance reservation or hold system;
- a valet dispatch system;
- a guarantee that a public space will remain available;
- a replacement for street signs, permits, time limits, or sweeping rules; or
- a public feed of every business-network departure.

The legal and operational framing is enforced in product copy, network visibility rules, matching behavior, and database triggers.

### 1.3 Pilot outcome

The first pilot should measure whether a business can reduce arrival friction without adding valet labor. Relevant outcomes include:

- fewer parking-related complaints;
- fewer reported instances of customers circling and leaving;
- lower staff coordination burden;
- successful handoff rate;
- offer response time; and
- no-show or cancellation behavior.

The product must not claim that a handoff created new parking supply or guaranteed a public curb space.

---

## 2. System Context

```text
Business admin / staff / member
             |
             | authenticated HTTPS requests
             v
       Next.js 16 application
  public site | business dashboard | APIs
             |
      middleware + route authorization
             |
             v
       Supabase PostgreSQL
 business | network | membership
 spots | matches | sessions | audit
             |
             +--> Supabase Realtime
             +--> push notifications
             +--> scheduled offer/retention cleanup
```

### 2.1 Main technical surfaces

| Surface | Current responsibility |
|---|---|
| `/` | B2B public homepage and pilot conversion |
| `/business` | Authenticated business list and creation |
| `/business/[id]` | Business dashboard, posting, members, branding, activity |
| `/api/businesses*` | Business configuration and membership operations |
| `/api/spots` | Spot creation and public/private spot queries |
| `/api/matches/find` | Find a candidate and create an exclusive offer |
| `/api/matches/[id]` | Accept, reject, or inspect a match |
| `/api/cron/expire-offers` | Expire offers, reassign candidates, sweep spots, run API-side retention cleanup |

### 2.2 Data access surfaces

The code uses an admin Supabase client for many server-side operations. That client bypasses RLS, so application authorization is mandatory before each privileged read or write. Browser-facing database access remains subject to RLS.

The security model is therefore layered:

1. Supabase Auth identifies the caller.
2. API middleware requires a bearer header for protected API routes.
3. Route handlers validate the authenticated user.
4. Business membership and role checks authorize the requested operation.
5. RLS constrains direct database access.
6. Matching filters candidates by active network membership.
7. Database triggers and indexes enforce critical invariants under concurrency.

---

## 3. Multi-Tenant Business Model

### 3.1 Core entities

The B2B schema is centered on:

```text
businesses
  subscriber identity, plan, status, seats_limit, operating area

networks
  private/shared coordination scope

network_businesses
  businesses participating in a network

business_members
  user membership, role, and status

parking_spots
  departure event with business_id and network_id attribution

spot_matches
  offer/handoff lifecycle with business_id and network_id attribution

business_member_audit
  actor, target, business, action, and timestamp for removals
```

### 3.2 Membership roles

- **Admin:** business configuration, branding, member management, and operational access.
- **Staff:** participates in the network but cannot perform admin-only actions.
- **Member:** participates in permitted coordination flows.

Membership status is separate from role. Only `active` memberships qualify a user for network matching. Removal deletes the membership through an admin-only RPC, and the removal trigger records an audit event.

### 3.3 Shared network semantics

A shared network is not an unrestricted cross-business data pool. A user qualifies for a network only when an active membership belongs to a business linked through `network_businesses`.

Business dashboards and rosters remain business-scoped. Network participation determines eligibility for coordination, not permission to read another business’s dashboard or member directory.

### 3.4 White-label fields

Businesses can store an application name, logo URL, primary color, and accent color. These fields support light tenant branding. They do not create separate deployments or separate authentication systems.

Production review should still validate external asset URLs, content security policy behavior, and safe color rendering before broad white-label use.

---

## 4. Exclusive Offer Protocol

### 4.1 Required invariant

For every active B2B departure:

> At most one live offer or confirmed handoff may exist for the spot at any time.

The application performs an early query to reject an obvious duplicate. The authoritative concurrency guarantee is the partial unique index introduced by migration `00042_exclusive_offer_guard.sql`:

```sql
CREATE UNIQUE INDEX spot_matches_one_live_per_spot
ON public.spot_matches (spot_id)
WHERE status IN (
  'pending',
  'offered',
  'confirmed_by_owner',
  'confirmed_by_seeker',
  'confirmed'
);
```

If two workers pass the application read at the same time, PostgreSQL accepts only one live insert. The losing insert returns a unique-constraint error and the application returns no offer.

### 4.2 Offer lifecycle

```text
spot posted as exclusive
          |
          v
active network members filtered
          |
          v
one candidate selected
          |
          v
offer created with expiry timestamp
       /              \
 accepted          declined / expired
     |                    |
     v                    v
handoff proceeds     next eligible candidate
                          |
                          v
                  retry until policy limit
```

For network spots, exhausting attempts ends private coordination. The system does not convert the B2B spot into a public map claim.

### 4.5 Expiry worker boundary

Offer expiry and reassignment remain in the protected Next.js job because candidate selection, network eligibility, push delivery, and retry policy are application responsibilities. The job:

1. selects offers whose acceptance window has passed;
2. conditionally changes `offered` to `offer_expired`;
3. attempts the next eligible network member; and
4. ends the private attempt when no candidate remains.

The SQL retention schedule intentionally does not mark offers expired first. This prevents a SQL-only cleanup run from removing the state that the application needs in order to perform reassignment.

### 4.3 Candidate eligibility

Candidate selection applies:

- active request state;
- active membership in the spot’s network;
- geographic radius;
- vehicle compatibility where configured;
- schedule compatibility;
- owner/block exclusions; and
- reliability/ranking signals.

Business status is checked before a B2B candidate search. Businesses with `active` or `trialing` status can operate. Suspended or canceled businesses do not create new operational matching activity.

### 4.4 Idempotent reassignment

Decline and expiry processing use a conditional state transition:

```text
UPDATE spot_matches
SET status = offer_declined or offer_expired
WHERE id = current_offer_id
  AND status = 'offered'
```

Only the worker that wins this transition owns decline side effects. Repeated cron executions, duplicate client requests, or concurrent expiry workers do not increment reliability counters repeatedly or create multiple live offers.

---

## 5. Tenant Isolation and Authorization

### 5.1 Business API rules

The API denies access when the authenticated user lacks an active membership in the requested business. This applies to:

- business configuration;
- dashboard data;
- member roster data;
- member additions and removals; and
- branding changes.

An earlier configuration-read path that returned a business record before membership validation has been corrected.

### 5.2 Admin-only controls

Only admins can:

- add or onboard members;
- remove members;
- change member roles or statuses; and
- update business configuration or branding.

Staff and ordinary members receive a `403` response for these actions.

### 5.3 Network spot visibility

Migration `00046_b2b_visibility_safety.sql` addresses a legacy permissive RLS policy and adds two controls:

1. A spot with `network_id` must remain `exclusive`.
2. Exclusive network spots are not readable as open public spots; direct active-spot visibility is limited to the owner, while the offer/match route provides the invited participant’s operational view.

Existing network spots accidentally marked public are converted to exclusive during migration.

### 5.4 Authorization test coverage

The repository contains route-level tests covering:

- Business A member attempting to read Business B configuration;
- Business A member attempting to read Business B dashboard data;
- Business A member attempting to read Business B roster data;
- staff attempting to add members;
- ordinary members attempting to add members; and
- staff attempting to update business configuration or branding.

These tests validate route authorization logic. A live Supabase staging test is still required to prove the exact deployed RLS policies with real JWT identities.

---

## 6. Member Lifecycle

### 6.1 Pilot onboarding

The minimum pilot onboarding path is direct admin onboarding:

1. Admin creates or opens a business.
2. Admin adds an existing authenticated user by user ID.
3. The member receives active membership in the business’s network.
4. The member can create a request and qualify for exclusive offers.

This is sufficient for a controlled pilot where the operator already knows the participant accounts. A polished invite-link experience is not required for the first pilot.

### 6.2 Removal behavior

Removal performs these actions:

1. Verifies the caller is a business admin.
2. Finds active offers addressed to the target user for that business.
3. Deletes the membership through the protected RPC.
4. Records the removal through the database audit trigger.
5. Expires and reassigns previously active offers.
6. Allows matching to continue only among remaining active network members.

The audit row contains business ID, target user ID, actor user ID, action, and timestamp. It does not copy the target user’s email or other unnecessary personal details.

### 6.3 Immediate eligibility revocation

The matcher obtains network candidates through active `business_members` rows. Once membership is deleted, the removed user is no longer eligible for new offers. Existing offers are explicitly closed by the removal route.

---

## 7. Plan and Seat Guardrails

### 7.1 Allowed operating statuses

Pilot operations are allowed only when a business has:

- `status = 'trialing'`; or
- `status = 'active'`.

Suspended and canceled businesses cannot accept new members, post B2B spots, or perform B2B match actions.

### 7.2 Seat enforcement

Migration `00045_business_pilot_guardrails.sql` installs a `BEFORE INSERT OR UPDATE` trigger on `business_members`.

The trigger:

1. Locks the business row with `FOR UPDATE`.
2. Reads the business status and seat limit.
3. Rejects inactive businesses.
4. Counts active members.
5. Rejects an active membership when `seats_limit` is reached.

The row lock makes simultaneous joins deterministic. Application checks provide earlier, clearer HTTP responses, but the trigger remains the final authority.

Stripe billing can remain manual for pilots. The business plan/status fields and seat limit are still real enforcement controls.

---

## 8. Retention and Cleanup

### 8.1 Scheduled endpoint

`POST /api/cron/expire-offers` performs:

- stale offer expiry;
- offer reassignment;
- exclusive spot sweeping;
- B2B no-public-fallback enforcement through matcher behavior; and
- the retention RPC `cleanup_pilot_retention`.

The route requires:

```text
Authorization: Bearer <cron-secret>
x-cron-secret: <cron-secret>
```

The bearer header satisfies middleware’s structural requirement. The `x-cron-secret` is checked by the route.

### 8.2 Retention function

Migration `00043_pilot_retention.sql` adds an idempotent `SECURITY DEFINER` function with these defaults:

| Data | Default behavior |
|---|---|
| Expired offered matches | Mark as `offer_expired` through the API worker, then reassign when possible |
| Stale active spots | Mark completed spots `taken` and expired spots `expired` |
| Precise driver locations | Delete after 1 hour or terminal match cleanup |
| Car locations | Delete after departure/operational staleness |
| Active expired chats | Mark `expired` |
| Old completed/expired chats | Delete after 7 days |
| Aggregate match rows | Preserve for business statistics |

The function is safe to invoke repeatedly. It does not require client-side deletion permissions.

### 8.3 Scheduling requirement

The endpoint is not automatically scheduled by the application. A production scheduler such as cron-job.org, Vercel Cron where available, or another authenticated HTTP scheduler must invoke it approximately every minute.

The scheduled API job is a deployment dependency, not an optional feature. Without it, opportunistic matching calls still provide some self-healing, but stale offers and network reassignment are not guaranteed to run on time.

### 8.4 Supabase retention schedule

Migration `00047_pilot_retention_schedule.sql` adds `cleanup_pilot_data()` and attempts to schedule it through Supabase `pg_cron`:

```sql
SELECT cron.schedule(
  'spotmatch-pilot-retention',
  '*/5 * * * *',
  'SELECT public.cleanup_pilot_data();'
);
```

The migration checks whether the `pg_cron` extension exists. If it is unavailable, the SQL function still exists and the protected API endpoint invokes the broader `cleanup_pilot_retention()` function. No cron-management UI is required.

---

## 9. Notification Failure Behavior

Push delivery returns counts for sent, pruned, and failed subscriptions.

The offer path distinguishes two cases:

- **No subscription exists:** leave the offer active because the in-app notification and dashboard remain valid sources of truth.
- **All registered subscriptions fail:** expire the offer and invoke normal reassignment so the spot is not stranded with an unreachable recipient.

The dashboard reads persisted database state rather than treating push delivery as the source of truth. A business can therefore see offers even when a member’s device is offline or push delivery is unavailable.

### 9.1 Lifecycle labels

The dashboard normalizes common states for operators:

- Offered
- Accepted
- Awaiting owner
- Completed
- No-show
- Expired
- Declined
- Rejected

Active-session status is preferred when it provides a more specific completed/no-show state.

---

## 10. Safety and Legal Controls

The system must preserve the following language and behavior:

> SpotMatch never sells or rents parking spaces. It coordinates drivers who are already leaving. Street rules, posted time limits, permits, and sweeping restrictions still apply.

Technical safety controls include:

- no public fallback for network spots;
- no public visibility for network-attributed spots;
- short configurable offer windows, defaulting to 90 seconds;
- active membership filtering;
- precise location retention limits;
- no direct public deletion path for cleanup data; and
- business dashboard notes warning that municipal rules still apply.

The product should not call an offer a reservation, guarantee, allocation, or purchase. “Exclusive” describes the notification audience and coordination attempt, not ownership of a public space.

---

## 11. Verification Status

### 11.1 Automated checks completed

Current repository validation:

```text
npm test          67 tests passed
npx tsc --noEmit  passed
npm run build     passed
```

The test suite includes exclusive matcher behavior, network candidate scoping, no-public-fallback behavior, and route-level B2B authorization tests.

### 11.2 What the tests prove

The tests prove application behavior under mocked service boundaries and unit-level concurrency simulation. They demonstrate that:

- only one simulated offer succeeds when the insert layer enforces a uniqueness conflict;
- network candidate selection filters to active network members;
- B2B spots do not take the consumer public fallback path; and
- unauthorized business API operations return forbidden responses.

### 11.3 What still needs staging verification

Before a real business pilot, run a staging Supabase verification for:

1. applying migrations `00042` through `00047` in order;
2. two real concurrent `createExclusiveOffer` calls against PostgreSQL;
3. RLS reads using JWTs from two separate businesses;
4. shared-network membership and non-member access;
5. concurrent joins at the exact seat limit;
6. member removal while an offer is active;
7. cron execution with the production scheduler headers; and
8. cleanup counts, stale spot closure, and location deletion after the retention window; and
9. `pg_cron` availability and the `spotmatch-pilot-retention` execution history.

These are deployment verification tasks, not reasons to reintroduce consumer marketplace behavior.

---

## 12. Residual Risks for Independent Review

Grok should specifically evaluate these risks:

### 12.1 Migration execution risk

The controls exist as SQL migrations. They do not protect production until the migrations have successfully run against the target Supabase database. Migration order and failure visibility matter.

### 12.2 Admin-client authorization risk

Many server routes use the service-role client. A missed membership check could bypass RLS. Review every route that reads or writes `business_id`, `network_id`, `spot_matches`, or `business_members`.

### 12.3 RLS policy composition

PostgreSQL permissive policies combine with OR semantics. Legacy policies must be removed or constrained when new tenant policies are introduced. Migration `00046` specifically removes the broad active-spot policy for this reason.

### 12.4 Retention timing risk

Retention is scheduler-dependent. A failed cron job can delay expiry and deletion. Operators need scheduler execution history and alerting, even if the first pilot does not require an in-app cron page.

### 12.5 Notification semantics

No push subscription is not the same as push failure. The dashboard must remain usable for members without push registration. Full delivery failure should not leave an offer live indefinitely.

### 12.6 Audit completeness

The current audit scope focuses on member removal, the highest-priority pilot action. Future administrative changes may require additional audit events, but expanding that scope is not required for the first controlled pilot.

### 12.7 Public API filtering

Review every query path that exposes active spots, especially legacy consumer routes. Network spots must remain excluded from public discovery regardless of client parameters.

---

## 13. Pilot Runbook

### 13.1 Before onboarding

1. Apply migrations `00042` through `00047`.
2. Confirm business status is `trialing` or `active`.
3. Set a conservative `seats_limit`.
4. Configure `CRON_SECRET` in the deployment environment.
5. Schedule the offer endpoint every minute.
6. If available, verify the `spotmatch-pilot-retention` `pg_cron` job runs every five minutes.
7. Test the endpoint manually and confirm an `ok: true` response.
8. Confirm push keys or explicitly train operators to use the dashboard.

### 13.2 Pilot operation

1. Admin adds a small, known set of members.
2. A member posts a departure inside the business network.
3. The matcher identifies one eligible member.
4. The selected member receives an offer or sees it in-app.
5. The admin watches dashboard status.
6. The admin removes a member when access should end.
7. The scheduler expires stale offers and removes old precise data.

### 13.3 Stop conditions

Pause the pilot if any of the following occurs:

- more than one member is shown the same exclusive offer;
- a removed member receives a new offer;
- Business A can read Business B’s dashboard or roster;
- a network spot appears in public discovery;
- precise location remains after the documented retention period; or
- cron failures leave stale offers active.

---

## 14. Questions for Grok

1. Does the partial unique index fully protect the intended live-match invariant across every status transition?
2. Are there any server routes using the admin client that can leak cross-business data?
3. Do the RLS policies compose safely after migrations `00039` and `00046`?
4. Can a removed member still receive an already-created notification or accept an old offer?
5. Is the seat trigger correct under concurrent inserts and `ON CONFLICT DO UPDATE` behavior?
6. Does the retention function remove enough precise data without destroying required business aggregates?
7. What staging tests should be added before expanding beyond a small known member set?
8. Are the legal/product terms consistently distinguishable from reservation or paid parking language?
9. What observability is minimally necessary to detect missed cron executions?
10. Which residual risks are acceptable for a 30-day controlled pilot, and which should block launch?

---

## Conclusion

SpotMatch’s hardened B2B architecture is centered on a narrow operational promise: coordinate an imminent departure to one eligible network member without selling, renting, reserving, or publicly exposing a business-controlled parking event.

The key controls now exist at multiple layers. PostgreSQL prevents concurrent duplicate live offers. Membership and role checks protect business APIs. Seat and status triggers protect onboarding under concurrency. Removal creates an audit event and closes active offers. Retention cleanup removes precise operational data. Network spots are prevented from becoming public markers. The dashboard remains the source of truth when push delivery fails.

The system is suitable for controlled pilots once the migrations, scheduler, secrets, and staging verification are complete. The correct next step is not feature expansion. It is proving the deployed Supabase policies, triggers, cleanup function, and scheduler behavior with two isolated test businesses before inviting real Belmont Shore or 2nd Street participants.
