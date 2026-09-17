# SpotMatch B2B Coordination Platform

## A technical paper on private parking coordination for local businesses

**Version:** 1.0  
**Date:** August 2026  
**Audience:** Engineering teams, pilot partners, operators, and technical reviewers  
**Repository:** `parkingapp`

---

## Abstract

SpotMatch is operational software for businesses that want to improve the arrival experience around a busy commercial district. It coordinates imminent parking departures inside a private or shared business network. A driver who is already leaving a space can signal the departure; the system then offers the opening to one eligible nearby driver at a time.

SpotMatch does not sell, rent, reserve, or assign ownership of public parking spaces. The software coordinates communication between drivers who are already departing and drivers who need to arrive. Street rules, time limits, and sweeping restrictions remain in force.

This paper describes the B2B operating model, multi-tenant data model, exclusive matching protocol, security boundaries, dashboard architecture, operational metrics, and pilot deployment model. It focuses on restaurants, bars, and operators in high-pressure areas such as Belmont Shore and 2nd Street in Long Beach, California.

---

## 1. Problem Definition

### 1.1 Business impact

Parking pressure is not only a transportation problem. For a local business it can produce:

- customers who circle for 10–15 minutes and leave;
- negative reviews that attribute a poor visit to parking;
- late arrivals and missed reservations;
- staff and regulars competing for the same nearby spaces; and
- unnecessary vehicle circulation on already-congested blocks.

The most useful parking event is often not a static map state. It is the near-term departure of a driver who already occupies a space. That event has a short useful lifetime and must be coordinated quickly without creating a public claim race.

### 1.2 Product objective

The B2B product gives a business a controlled coordination layer for its team, customers, regulars, or neighboring businesses. Its objective is to reduce arrival friction while preserving the following constraints:

1. The product coordinates people, not parking inventory.
2. A spot is offered to exactly one driver at a time.
3. Business-owned coordination remains inside the authorized network.
4. The business can observe activity without receiving unnecessary personal location history.
5. The workflow must be lightweight enough to operate without a valet.

### 1.3 Non-objectives

SpotMatch is not:

- a public parking marketplace;
- a reservation or advance-hold system;
- a valet dispatch service;
- a guarantee that a public street space will remain available;
- a replacement for municipal parking rules or enforcement; or
- a public map of every business network departure.

---

## 2. B2B Operating Model

### 2.1 Tenant hierarchy

The platform uses four related concepts:

| Concept | Responsibility |
|---|---|
| Business | The subscribing organization, such as a restaurant, bar, or operator |
| Network | The scope in which matching is allowed |
| Member | A user affiliated with a business and granted a role |
| Handoff | A time-sensitive coordination event between a departing and arriving driver |

A business may operate a **private** network for its own team or participate in a **shared** network with neighboring businesses. A representative shared network is a group of 2nd Street businesses coordinating around the same commercial block.

### 2.2 Roles

Business membership has three application roles:

- **Admin:** manages business settings, members, network participation, and branding.
- **Staff:** participates in the network and performs permitted operational actions.
- **Member:** participates in network coordination without administrative privileges.

The database stores membership status separately from role. Inactive memberships do not qualify a user for network-scoped matching.

### 2.3 Commercial model

The intended commercial model is business subscription software:

- a 30-day pilot establishes the operating area and member workflow;
- monthly plans scale by network size, seats, and operational features;
- founding 2nd Street partners may receive early-partner terms; and
- white-label options can expose a business or district identity to its members.

The current repository contains business plan and status fields and the business operating workflow. Subscription billing, plan enforcement, and production customer provisioning should be treated as deployment and commercial integration work unless explicitly enabled in the target environment.

---

## 3. System Architecture

### 3.1 Technology stack

The current implementation is built on:

| Layer | Technology |
|---|---|
| Web application | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS, Geist, Lucide icons |
| Identity and data | Supabase Auth and PostgreSQL |
| Authorization | Supabase Row Level Security and server-side role checks |
| Realtime behavior | Supabase Realtime and client subscriptions |
| API | Next.js route handlers under `/api/businesses*` and `/api/spots` |
| Deployment target | Vercel-compatible serverless deployment |

The public homepage is a server-rendered B2B marketing surface. Authenticated business workflows remain client-interactive because they load sessions, dashboard data, and realtime operational state in the browser.

### 3.2 Logical architecture

```text
Business owner / staff / member
              |
              | HTTPS + authenticated session
              v
      Next.js application
  public site | business UI | API routes
              |
    middleware + handler authorization
              |
              v
       Supabase PostgreSQL
 businesses | memberships | networks
 spots | matches | activity statistics
              |
              +--> Supabase Realtime notifications
              +--> scheduled expiry / cleanup
```

The business dashboard is intentionally not a map-first consumer experience. Its primary views are current activity, members, matches, recent spots, and the action required to post a departure.

### 3.3 Trust boundaries

There are three important data-access boundaries:

1. **Public marketing surface:** contains product messaging and pilot conversion only. It does not expose member, spot, or location data.
2. **Authenticated browser surface:** uses a user session and accesses records allowed by RLS and application authorization.
3. **Server route surface:** validates authorization, role, payloads, and matching state before privileged writes or dashboard aggregation.

The service-role database client must remain server-side. It bypasses RLS and therefore requires explicit handler-level authorization and input validation.

---

## 4. Multi-Tenant Data Model

### 4.1 Core tables

The B2B schema introduced in migration `00039_businesses.sql` includes:

```text
businesses
  id, name, slug, plan, status, seats_limit
  operating_lat, operating_lng, operating_radius_meters
  primary_network_id
  app_name, logo_url, primary_color, accent_color

networks
  id, name, network_type (private/shared)

network_businesses
  network_id, business_id

business_members
  business_id, user_id, role, status

parking_spots
  business_id, network_id, status, departure_time, location

spot_matches
  business_id, network_id, status, offer timestamps
```

The `business_id` and `network_id` fields on spots and matches provide both authorization context and dashboard attribution. A null context represents the legacy/open consumer flow; a B2B spot must carry the business network context through its lifecycle.

### 4.2 Tenant invariants

The following invariants define the B2B data boundary:

- a user can qualify for a private network only through an active business membership;
- a business can participate in a shared network only through `network_businesses`;
- a business member can read the business records allowed by the relevant membership policy;
- a business admin can manage members and business configuration;
- a business spot is attributed to its posting business and network; and
- a B2B match cannot be reassigned into an unrelated network by client input.

Database functions such as `current_user_business_role` and `user_is_network_member` centralize membership decisions for RLS policies. The RPCs in `00040_business_membership_rpc.sql` provide controlled business creation, joining, member management, and removal operations.

### 4.3 White-label configuration

Branding is tenant configuration, not a separate application deployment. The business may store:

- display application name;
- logo URL;
- primary color; and
- accent color.

The dashboard exposes branding controls to admins. Production deployments should validate external logo URLs, restrict color values to safe formats, and apply a content-security policy suitable for tenant assets.

---

## 5. Exclusive Coordination Protocol

### 5.1 Protocol goal

The central product rule is **one driver at a time**. A B2B departure is not published as a broadcast marker that many drivers can race to claim. The matching service creates a private offer for one eligible network member.

### 5.2 State machine

```text
departure posted
       |
       v
eligible network members evaluated
       |
       v
one exclusive offer created
       |
  +----+----------------+
  |                     |
  v                     v
accepted            declined / expired
  |                     |
  v                     v
handoff active     next eligible member
                        |
                        v
                 retry until policy limit
```

For a B2B spot, exhaustion ends the private coordination attempt. It must not silently expose the spot to an unrelated public audience. This is a product and privacy boundary: a business network decides who may receive its coordination events.

### 5.3 Eligibility

Candidate selection should apply hard filters before ranking:

- active membership in the spot's network;
- valid account and standing;
- geographic proximity to the operating area;
- compatible vehicle or access requirements where configured; and
- relevant departure or arrival timing.

Ranking can then consider distance, reliability, prior successful handoffs, and business-defined priority such as staff or regular-member status. Ranking is a routing decision, not a sale of the space.

### 5.4 Concurrency and idempotency

The matching service must protect the following race:

```text
two workers attempt to create an offer for one active spot
```

The write path must verify that no active offer already exists and should use a database transaction or equivalent conditional write. Repeated client requests must not create duplicate handoffs. Expiry workers must be safe to run repeatedly; processing an already expired or completed offer should be a no-op.

### 5.5 Timing

The offer window should be short enough to preserve the imminent nature of the event and long enough for a nearby driver to respond. The existing platform uses timed offer and expiry behavior. Pilot operators should measure response time, acceptance rate, and no-show rate before changing the window.

---

## 6. Business Product Surfaces

### 6.1 Public site

The public homepage is designed for a business decision-maker. It emphasizes:

- fewer lost customers;
- less circling and a better arrival experience;
- private coordination rather than consumer parking discovery;
- the one-driver rule;
- no valet requirement; and
- a 30-day pilot conversation.

Consumer signup, credits, gamification, and a public map are intentionally not the primary homepage actions.

### 6.2 Business workspace

The business routes are:

- `/business` for businesses associated with the authenticated user;
- `/business/[id]` for a business dashboard; and
- `/api/businesses*` for authenticated business operations.

The dashboard currently provides:

- active spots and active members;
- matches today and total matches;
- recent spot and match activity;
- network-scoped spot posting;
- member visibility; and
- admin-only branding controls.

### 6.3 API surface

The business API includes operations for:

| Route | Purpose |
|---|---|
| `GET /api/businesses` | List businesses available to the authenticated user |
| `POST /api/businesses` | Create a business and its initial membership/network relationship |
| `GET /api/businesses/[id]` | Read business configuration |
| `PATCH /api/businesses/[id]` | Update authorized business configuration |
| `GET /api/businesses/[id]/dashboard` | Load scoped stats, recent activity, and members |
| `POST /api/businesses/[id]/join` | Join an eligible business |
| `/api/businesses/[id]/members` | Manage business membership |
| `/api/spots` | Post a spot, including B2B business and network context |

Every route must derive authorization from the authenticated user and server-side business membership. Client-provided business IDs are selectors, not proof of access.

---

## 7. Privacy, Safety, and Legal Position

### 7.1 Coordination, not commerce in spaces

SpotMatch must consistently state that it never sells or rents parking spaces. The service coordinates a near-term communication event between drivers who are already leaving and drivers who need to arrive. No record should imply that a business owns a public street space or can grant exclusive legal possession of it.

### 7.2 Public-street constraints

The software does not override:

- posted time limits;
- street sweeping restrictions;
- permit requirements;
- loading, fire, accessibility, or red-curb restrictions; or
- municipal enforcement.

The user remains responsible for observing applicable signs and laws. Pilot onboarding should include a local operating-area review rather than treating the radius field as a permission boundary.

### 7.3 Location minimization

The B2B model needs enough location information to select a nearby eligible member and support an active handoff. It does not require a permanent history of every member's movements. Recommended controls include:

- collect precise location only for an active operational need;
- restrict location visibility to the relevant handoff participants;
- expire active handoff location data after the operational window;
- retain aggregated business metrics separately from raw movement data; and
- provide clear member disclosure and consent language.

### 7.4 Safety controls

The platform should support reporting, account standing, and no-show/reliability signals. A business network should have an admin escalation path for removing a member without exposing private member details to other businesses in a shared network.

---

## 8. Security Model

### 8.1 Authorization layers

Authorization is defense in depth:

1. Supabase Auth establishes identity.
2. Middleware rejects unauthenticated protected API requests.
3. Route handlers verify the token and requested operation.
4. Business role checks distinguish admin, staff, and member behavior.
5. RLS constrains direct database access.
6. Matching logic applies network membership at selection time.

No single UI check is a security control.

### 8.2 Threats and mitigations

| Threat | Mitigation |
|---|---|
| Cross-business data access | Business/network-scoped RLS and server role checks |
| Unauthorized member promotion | Admin-only membership RPC and update path |
| Duplicate offers | Conditional offer creation and idempotent expiry |
| Spoofed business context | Derive or validate business/network relationship server-side |
| Location overexposure | Network-scoped visibility and short retention windows |
| Automated posting or abuse | Authentication, rate limits, validation, and standing checks |
| Tenant branding injection | Validate URLs/colors and sanitize rendered values |

### 8.3 Operational secrets

Service-role database keys, auth secrets, notification credentials, and any payment or model-provider keys must remain in server-side environment configuration. They must never be serialized into the public homepage or browser bundle.

---

## 9. Metrics and Pilot Evaluation

The platform should evaluate business outcomes rather than consumer vanity metrics.

### 9.1 Core operational metrics

- departures posted per active member;
- percentage of departures receiving an eligible offer;
- offer acceptance rate;
- median time from departure signal to acceptance;
- successful handoff rate;
- no-show and cancellation rate;
- repeat participation by staff, regulars, and customers; and
- private-network leakage incidents, which should be zero.

### 9.2 Business outcome metrics

Pilot partners can compare:

- parking-related complaints before and during the pilot;
- customer reports of circling or late arrival;
- parking-related review mentions;
- missed or delayed reservations where measurable; and
- staff time spent informally coordinating arrivals.

These metrics should be reported in aggregate. The system should not claim that every customer would otherwise have left or that every handoff represents a guaranteed parking outcome.

### 9.3 Pilot design

A practical 30-day pilot can follow four phases:

1. **Baseline:** document the block, business hours, parking complaints, and current informal practices.
2. **Configuration:** create the business, choose private or shared network scope, set the operating radius, and invite members.
3. **Live operation:** run the workflow during selected high-pressure periods and monitor acceptance/no-show behavior.
4. **Review:** compare operational metrics, collect staff feedback, and decide whether to expand membership or add neighboring businesses.

The first pilot should optimize for reliable behavior and clear member expectations, not maximum network size.

---

## 10. Reliability and Operations

### 10.1 Expiry and cleanup

Departure coordination is time-sensitive. Expiry processing must handle abandoned offers, stale departures, and completed handoffs. A scheduled cleanup process provides a backstop for clients that disconnect or fail to deliver a final state transition.

### 10.2 Failure behavior

If notifications fail, the dashboard should remain the source of truth for current state. If a candidate declines, the service may try the next eligible candidate according to configured policy. If no candidate accepts, the private event ends without representing the spot as sold, reserved, or guaranteed.

### 10.3 Observability

At minimum, operators should be able to correlate:

- business and network ID;
- spot and match ID;
- offer attempt number;
- creation, acceptance, expiry, and completion timestamps; and
- authorization or validation failure reason.

Logs must avoid raw precise location and unnecessary member personal information. Operational dashboards should aggregate by business and network.

---

## 11. Implementation Status and Roadmap

### 11.1 Implemented in the current repository

- B2B business, network, and membership schema;
- membership and role RPCs;
- RLS policies for business-scoped records;
- business listing and creation workflow;
- business dashboard with activity statistics;
- network-scoped spot posting;
- business and network attribution on spots and matches;
- member management endpoints;
- optional business branding fields and admin controls; and
- B2B public homepage and pilot-oriented navigation.

### 11.2 Pilot hardening priorities

Before onboarding external businesses, the following should be verified in the deployment environment:

1. end-to-end RLS tests for cross-business and cross-network access;
2. atomic duplicate-offer tests under concurrent workers;
3. retention jobs for precise location and expired handoff data;
4. invite and member-removal flows with audit history;
5. production notification delivery and fallback behavior;
6. plan, seat, and subscription enforcement; and
7. accessibility and mobile testing with real pilot users.

### 11.3 Future extensions

Potential extensions include customer invite links, business-defined priority cohorts, district-level analytics, configurable operating hours, integrations with reservation systems, and tenant-specific audit exports. Each extension should preserve the one-driver rule and the no-sale/no-rental boundary.

---

## 12. White-Label Growth Kit

The white-label layer extends the business workspace from an operational dashboard into a customer acquisition and retention tool. White-labeling is implemented as tenant configuration inside one shared application. Each business can present its own identity without receiving a separate deployment or bypassing platform security.

### 12.1 Business onboarding

An authenticated owner can create a business by providing a name, stable slug, description, phone, address or neighborhood label, and optional operating coordinates. The platform creates the business, a private network, the business-to-network relationship, and an active admin membership in one controlled operation. The onboarding timestamp makes an empty workspace state explicit and gives the dashboard a reliable first-run state.

The owner is redirected to `/business/[id]`, where the workspace presents clear calls to action for branding, sharing the join link, posting a departure, and reviewing activity. The contact email is the authenticated owner identity rather than a second business-specific account system.

### 12.2 Tenant branding and content

Business admins can configure:

- display or app name;
- logo URL with safe URL and length validation;
- primary and accent colors restricted to hexadecimal values;
- welcome message;
- house notes such as street-sweeping reminders;
- plain-text promotional or ad content; and
- an external menu, website, or information link.

These fields are rendered as text and validated server-side. Arbitrary scripts, unsafe URLs, and unrestricted style values are not accepted. Staff and members can view the resulting business experience but cannot change tenant configuration.

### 12.3 Join link and QR acquisition

Every business has a stable join URL:

```text
/join/[business-slug]?source=qr
```

The dashboard displays the link, provides a copy action, and renders a downloadable QR image. Visits and completed joins are recorded in `business_join_events` with business ID, source, event type, optional authenticated user ID, and timestamp. The event model supports aggregate attribution without creating a separate customer identity database.

The QR and link experience uses careful language: customers join a private business network to receive arrival heads-ups when someone is leaving nearby. The experience never claims that a space is reserved, held, owned, or guaranteed.

### 12.4 Customer join and PWA flow

The public page at `/join/[slug]` loads only the selected business's public branding and content. It does not expose member rosters, private activity, or precise location data. A visitor can read the business explanation, house notes, and optional promotion before joining.

When the visitor selects **Join this network**, the application:

1. checks for an authenticated session;
2. redirects unauthenticated visitors to login with a safe return path;
3. calls the server-side business join operation;
4. attaches the user as an active member of that business network; and
5. redirects the member into the business-scoped app experience.

The existing service-worker and manifest support provides the PWA installation surface. Browsers that expose `beforeinstallprompt` receive an install banner. The banner uses the business display name after a successful join. iOS users receive the platform-specific instruction to use **Share** and **Add to Home Screen**. Where native installation telemetry is unavailable, active join completion is reported as an installation approximation rather than a confirmed device install.

### 12.5 Print-ready growth materials

Admins can open two print routes:

- `/business/[id]/print/table-tent` for a compact table sign;
- `/business/[id]/print/flyer` for a letter-sized handout or card.

Both templates include the business name or logo, QR join code, and non-guarantee fine print. The flyer also presents the customer sequence: **Scan -> Join -> Install app -> Receive heads-ups when someone is leaving nearby**. The browser print stylesheet removes controls and formats the pages for print or Save as PDF. Print routes verify the authenticated business role and reject non-admin access.

### 12.6 Business metrics

The dashboard aggregates activity by business ID and displays:

- total and active members;
- new members over 7 and 30 days;
- departures today, over 7 days, and over 30 days;
- offers sent and accepted;
- offer acceptance rate;
- declined, expired, and no-show outcomes;
- successful handoffs;
- QR visits, QR joins, and link joins; and
- approximate PWA installs based on active join completions when confirmed install events are unavailable.

Median response time is represented as unavailable until reliable response timestamps are present. This is preferable to presenting a fabricated performance value. All queries are filtered by the requested business ID after server-side membership authorization.

### 12.7 Growth-kit API surface

The white-label functions are exposed through the following routes:

| Route | Function |
|---|---|
| `POST /api/businesses` | Create a business, private network, and owner admin membership |
| `GET /api/businesses/[id]/dashboard` | Load tenant-scoped configuration, metrics, activity, and join URL |
| `PATCH /api/businesses/[id]` | Admin-only branding, content, and business configuration updates |
| `GET /api/join/[slug]` | Load public branded join information and record a visit |
| `POST /api/join/[slug]` | Authenticate and attach a customer to the selected business |
| `POST /api/businesses/[id]/join` | Existing ID-based authenticated join endpoint with attribution |
| `/business/[id]/print/[template]` | Admin-only print preview and browser print output |

The server uses the service-role client only after route-level authentication and role checks. Public join reads are deliberately limited to safe presentation fields. Join events are aggregate operational telemetry, not a parking reservation ledger.

## 13. Conclusion

SpotMatch's B2B model turns parking coordination into a small, controlled operational capability for local businesses. Its white-label growth kit adds a practical path from business onboarding to branded customer membership: an owner configures the tenant, publishes a QR code, prints simple materials, and welcomes customers into the correct private network.

Its value is not a promise to manufacture public parking supply. Its value is reducing the friction around a real departure event, communicating it to one appropriate person, and giving a business a measurable way to improve arrivals. The product remains a coordination service, not a reservation marketplace.

The key engineering property is the network-scoped exclusive offer: one departure, one authorized driver at a time, with explicit expiry and no implicit public fallback for business coordination. Combined with tenant-aware authorization, limited location exposure, and business-level activity reporting, this creates a foundation for pilots on dense commercial blocks such as Belmont Shore and 2nd Street without turning the product into a parking marketplace.
