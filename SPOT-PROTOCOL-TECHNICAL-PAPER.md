# SpotMatch and the SPOT Protocol

## Technical Description of the Belmont Shore Parking Coordination Platform

**Product:** SpotMatch

**Protocol:** SPOT, meaning Safe Proximity Offer Transfer

**Pilot area:** Belmont Shore and 2nd Street, Long Beach, California

**Deployment:** Next.js application deployed on Vercel with Supabase backend services

**Audience:** Pilot businesses, technical reviewers, operators, and implementation partners

## Abstract

SpotMatch is a private parking coordination platform for businesses operating in
parking-constrained commercial areas. It coordinates a near-term departure between
one driver who is leaving and one eligible member who needs to arrive.

SpotMatch does not sell, rent, reserve, own, or guarantee public street parking.
It is a communication and coordination layer around parking turnover that is
already occurring.

The central workflow is the SPOT Protocol: Safe Proximity Offer Transfer. The
protocol keeps a departure private, offers it to one eligible member, supports a
hands-free approach, verifies proximity with permission-based location data, and
allows the departing driver to confirm the handoff while still parked.

The deployed product includes business networks, membership roles, QR onboarding,
business dashboards, exclusive matching, GPS handoff tracking, browser-based
Arrival Mode, voice navigation, retention jobs, and an administrative SPOT live
demonstration.

## 1. Problem Definition

Belmont Shore and 2nd Street contain a dense mix of restaurants, bars, shops,
services, and shoreline destinations. During busy periods, visitors may spend
significant time searching for parking.

Parking pressure can result in:

- customers circling and abandoning a visit;
- late arrivals for reservations and appointments;
- parking-related complaints and reviews;
- staff and regular customers competing for nearby spaces;
- additional traffic circulation; and
- informal parking coordination that is difficult to measure.

The most actionable parking event is often a driver who already occupies a space
and is preparing to leave. SpotMatch coordinates that short-lived event without
creating a public claim race.

## 2. Product Boundary

### 2.1 What SpotMatch does

SpotMatch can:

1. Create private business or shared neighborhood networks.
2. Enroll staff, customers, and trusted regulars as members.
3. Accept departure events from participating members.
4. Filter eligible arriving members by network membership and operational criteria.
5. Offer a departure to one member at a time.
6. Reassign declined or expired offers when appropriate.
7. Track proximity during an active handoff with consent.
8. Provide voice-guided navigation after a confirmed match.
9. Display business activity and handoff outcomes.
10. Provide QR-based customer acquisition and PWA installation support.

### 2.2 What SpotMatch does not do

SpotMatch does not:

- create new public parking supply;
- reserve or legally hold a public curb space;
- guarantee that a space remains available;
- replace parking signs, meters, permits, or enforcement;
- operate a valet service;
- publish every private departure to the public;
- prevent a non-member who physically sees a vehicle leave from taking the space; or
- continuously track a member after a browser PWA has been closed or suspended.

## 3. SPOT Protocol

SPOT stands for **Safe Proximity Offer Transfer**.

The protocol has five conceptual stages:

1. **Private offer:** A departure is offered to one eligible member.
2. **Safe acceptance:** The arriving member accepts before driving or while safely stopped.
3. **Hands-free approach:** The member follows voice and visual status without required phone interaction while moving.
4. **Nearby verification:** Permission-based GPS determines that the arriving member is near the handoff zone.
5. **Owner-ready handoff:** The departing member confirms readiness while parked, then leaves.

The protocol does not treat GPS proximity as legal ownership or reservation. GPS
provides an operational estimate; the departing member confirms the actual handoff.

## 4. System Architecture

### 4.1 Frontend

The frontend uses:

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS;
- MapLibre GL;
- OpenFreeMap map tiles;
- browser Geolocation API;
- Web Speech API for text-to-speech;
- browser Speech Recognition where supported;
- DeviceMotion APIs where supported; and
- Progressive Web App service-worker and manifest support.

### 4.2 Backend

The backend uses:

- Supabase Auth for identity;
- Supabase PostgreSQL for application data;
- Supabase Row Level Security for database access control;
- Supabase Realtime for notifications and operational updates;
- Next.js API route handlers for authenticated operations;
- scheduled offer expiry and retention cleanup; and
- Vercel serverless deployment.

### 4.3 Main data entities

The core data model includes:

- `users` for member profiles and trust information;
- `businesses` for business tenants and operating areas;
- `networks` for private or shared coordination scopes;
- `network_businesses` for shared network participation;
- `business_members` for roles and membership status;
- `parking_spots` for departure events;
- `spot_requests` for members seeking parking;
- `spot_matches` for exclusive offers and handoff lifecycle;
- `active_sessions` for confirmed handoff state;
- `driver_locations` for temporary live match location;
- `car_locations` for temporary vehicle-location behavior data;
- `business_handoff_events` for anonymized business outcomes;
- `business_join_events` for QR and link attribution;
- `business_known_departures` for recurring local patterns;
- `notifications` for in-app alerts;
- `ephemeral_chats` for temporary handoff communication; and
- retention functions and triggers for operational cleanup.

## 5. Business Onboarding

### Step 1: Owner authentication

The business owner creates an account or signs in through the deployed application.

### Step 2: Business creation

The owner opens the business workspace and creates a business profile with:

- business name;
- URL slug;
- description;
- address;
- phone number;
- operating coordinates; and
- operating radius.

The creation operation establishes the business, a private network, and the
owner's active administrator membership.

### Step 3: Business configuration

The owner can configure:

- logo;
- application name;
- primary and accent colors;
- welcome message;
- house notes;
- parking reminders;
- promotional text;
- website or menu link; and
- known departure times.

Known departure times can describe shift endings, closing periods, or recurring
local patterns. They are informational and do not reserve parking.

### Step 4: QR and link creation

The dashboard provides a stable business join URL in the form:

```text
/join/{business-slug}?source=qr
```

The dashboard can display the QR code, copy the join link, download a QR image,
and open printable table-tent and flyer templates.

### Step 5: Member recruitment

The business shares the QR code or link with staff, customers, and trusted
regulars. The join page presents the business's branding and explains that the
network provides arrival heads-ups rather than reservations.

## 6. User Membership and Assignment

### 6.1 Joining through a QR code

When a user scans a business QR code:

1. The application identifies the business from its slug.
2. The visit is recorded with source `qr`.
3. The user reviews the branded join page.
4. The user signs in or creates an account.
5. The user accepts the applicable terms and community agreement.
6. The user selects **Join this network**.
7. The backend creates an active membership for that business network.
8. The user is redirected to the business customer experience.

Normal QR/link joins receive the default role:

```text
role: member
status: active
```

### 6.2 Membership roles

The available roles are:

- **Admin:** manages business settings, branding, members, and operational configuration.
- **Staff:** participates in business coordination without full administrative control.
- **Member:** participates in permitted network handoffs.

Membership status is separate from role. A user must have an active membership to
qualify for private network matching.

### 6.3 Removal and disabling

An admin can disable or remove a member. Membership removal prevents new offers
from being sent to that user. Active offers assigned to a removed member can be
expired and reassigned to another eligible member.

## 7. Departure and Matching Flow

### Step 1: Departure creation

The departing member posts a departure with:

- GPS position;
- address or nearby street;
- expected departure time;
- optional return time;
- vehicle type; and
- business and network context when applicable.

The server validates the coordinates, timing, business membership, business
operational status, and rate limit.

### Step 2: Private network selection

For a business-network departure, the matching engine identifies active members
through the network's participating businesses. Inactive, blocked, or removed
users do not qualify.

### Step 3: Candidate filtering

Candidate filtering can consider:

- active network membership;
- distance;
- vehicle compatibility;
- timing overlap;
- trust and ranking;
- successful handoff history;
- decline count;
- no-show count; and
- user blocks.

### Step 4: Exclusive offer

The system creates one live offer for one candidate. A database-level partial
unique index prevents concurrent workers from creating multiple live offers for
the same departure.

The offer has a short expiry window, normally approximately 90 seconds unless
configured otherwise.

### Step 5: Decline or expiry

If the candidate declines or the offer expires, the system may select the next
eligible candidate. For business-network spots, exhausting candidates ends the
private coordination attempt. The spot does not become a public claimable marker.

### Step 6: Acceptance

The arriving driver accepts the offer before driving or while safely stopped.
After confirmation, the match page can activate voice navigation and optional
live GPS sharing.

## 8. SPOT Arrival Mode PWA

The deployed Arrival Mode is available at:

```text
https://www.parkingmeeters.com/arrival
```

### Step 1: Destination entry

The member enters a business or destination. The current browser implementation
uses geocoding to resolve the destination to coordinates.

### Step 2: Permission request

When Arrival Mode starts, the browser requests location permission. Motion sensor
permission is requested where supported and is optional.

The application explains that:

- location is required for Arrival Mode;
- motion data is optional;
- the phone should be mounted; and
- the driver should not interact while moving.

### Step 3: Foreground tracking

The PWA starts a high-accuracy browser GPS watch while the screen remains open.
It uses a soft Belmont Shore geofence with conservative uncertainty handling.

The PWA also requests a Screen Wake Lock where supported.

### Step 4: Destination routing

Once the current GPS position and destination coordinates are available:

1. The application calls the OSRM route service.
2. A driving route is returned with geometry and steps.
3. The route is drawn on the MapLibre map.
4. The first instruction is spoken.
5. GPS updates track the route.

### Step 5: Turn-by-turn guidance

During navigation, the application displays and speaks:

- current instruction;
- next maneuver;
- remaining distance;
- estimated remaining time;
- current position; and
- route status.

### Step 6: Off-route behavior

If the GPS position moves beyond the route threshold, the application announces
that the driver is off route and provides a **Recalculate route** action.

### Step 7: Arrival behavior

When the driver is within the navigation arrival threshold, the app announces
arrival and asks the driver to continue only when safely stopped. GPS proximity
does not by itself claim the exact curb space.

### Browser limitation

The PWA cannot reliably track location when the browser is closed, suspended, or
replaced by another navigation application. Native iOS and Android background
location would be required for always-on geofencing.

## 9. Live Handoff Tracking

During a confirmed match:

1. Both members can consent to live location sharing.
2. The arriving driver's location is sent periodically.
3. The departing member can see the partner approaching.
4. Location is restricted to the active match participants.
5. Sharing stops when the handoff ends, a member stops sharing, or the session expires.
6. Precise operational location records are removed by retention cleanup.

The departing member remains responsible for confirming that the space is ready.
The arriving driver should not need to interact with the phone while driving.

## 10. Accuracy Model

The current browser accuracy model uses:

- high-accuracy Geolocation API settings;
- reported GPS accuracy radius;
- accuracy bands;
- conservative geofence entry;
- larger exit hysteresis;
- route distance checks;
- speed and heading values when provided; and
- final human confirmation for the handoff.

Typical outdoor accuracy is approximately 5–40 meters, but urban buildings,
trees, indoor locations, and weak signals can produce 100 meters or more of
uncertainty.

The system should treat GPS as a proximity estimate, not an exact curb-space
identifier.

## 11. Privacy and Safety Controls

The application uses separate operational concepts for:

- account authentication;
- location while using the app;
- optional live match location;
- motion sensor permission;
- voice input;
- push notifications; and
- data retention.

The product should not use a single blanket Terms of Service sentence as a
substitute for granular permission requests.

The platform includes:

- private business-network visibility;
- one-driver offer enforcement;
- member status checks;
- rate limiting;
- user blocking;
- report and flag workflows;
- short offer windows;
- ephemeral chat;
- location retention cleanup;
- account deletion support; and
- role-based business authorization.

Members must continue to follow posted signs, meter rules, time limits, permits,
street-sweeping restrictions, loading restrictions, red curbs, fire lanes, and
accessibility requirements.

## 12. Administrative Demonstration

The admin testing route is:

```text
https://www.parkingmeeters.com/admin/testing
```

The **SPOT Live Demo** is a deterministic, database-free presentation mode. It
does not create real spots, matches, notifications, or production users.

The demonstration includes two simulated phone screens:

### Arriving driver phone

1. Shows the Arrival Mode entry screen.
2. Allows the operator to start Arrival Mode.
3. Speaks, “Welcome to 2nd Street. What is your destination?”
4. Supports browser speech recognition.
5. Supports typed and button fallback destinations.
6. Shows a street-shaped route.
7. Shows the start, departure, destination, and moving vehicle.
8. Displays hands-free status and voice prompts.

### Departing driver phone

1. Shows the selected business.
2. Shows a departure within one block.
3. Shows the configured vehicle type.
4. Shows parked, nearby, ready, departed, and completed states.
5. Confirms that the network remains private.

The demo supports slower playback speeds so a business owner can hear the voice
sequence and see the progression clearly.

## 13. Business Dashboard Metrics

The business dashboard aggregates:

- total and active members;
- departure counts;
- offers sent;
- accepted, declined, and expired offers;
- no-shows;
- successful handoffs;
- QR visits;
- QR joins;
- link joins;
- PWA installation approximations; and
- recent activity.

These are operational measurements. They should not be presented as proof that
every handoff prevented a lost customer.

## 14. Scheduled Operations

The production scheduler calls:

```text
POST https://parkingapp-pi.vercel.app/api/cron/expire-offers
```

It sends both:

```text
Authorization: Bearer CRON_SECRET
x-cron-secret: CRON_SECRET
```

The job processes:

- expired offers;
- offer reassignment;
- stale spots;
- expired chats;
- old driver locations; and
- old car locations.

The scheduler is a required production dependency for reliable handoff expiry
and privacy cleanup.

## 15. Production Requirements

The production application requires:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CRON_SECRET
AGENT_SECRET_KEY
PHONE_VERIFICATION_ENABLED
MATCH_RADIUS_METERS
MATCH_OFFER_WINDOW_MS
```

Recommended optional variables include:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

Stripe and AI provider variables are not required for core parking coordination.

## 16. Review and Business Intelligence Extensions

A future Parking Review Intelligence Agent can build a verified list of 2nd Street
businesses and analyze parking-related review patterns using approved sources.

The compliant approach is:

1. Build the business roster from the Belmont Shore Business Association directory.
2. Match businesses to approved review-provider identifiers.
3. Use official APIs or owner-authorized exports.
4. Detect parking-related themes.
5. Deduplicate by source review ID.
6. Store source URL and collection date.
7. Produce aggregate business reports.

The system should not scrape review sites or create an unauthorized searchable
database of third-party review content.

## 17. Current Limitations

The current deployment does not yet provide:

- guaranteed background geofencing from a closed PWA;
- native iOS or Android foreground services;
- complete automatic parking detection for every user;
- automatic private departure search directly from Arrival Mode without a backend
  matching event; or
- Google Maps-level traffic, lane, and map-matching intelligence.

The browser navigation engine is suitable for a controlled pilot, but the OSRM
public routing service should eventually be replaced with a managed or self-hosted
routing service before high-volume production use.

## 18. Pilot Operating Procedure

1. Select two to five Belmont Shore businesses or one trusted member group.
2. Create the business workspace and private network.
3. Set the operating area and local parking notes.
4. Configure branding and welcome content.
5. Generate and distribute QR join materials.
6. Enroll staff and trusted regulars.
7. Test account creation and active membership.
8. Test SPOT Arrival Mode on real iPhones and Android devices.
9. Test the cron expiry job.
10. Post a departure and verify private matching.
11. Test acceptance, decline, expiry, no-show, and completion.
12. Collect baseline parking complaints and arrival observations.
13. Run the pilot during selected high-pressure periods.
14. Review dashboard metrics and member feedback.
15. Decide whether the network should expand.

## 19. Conclusion

SpotMatch is a private coordination system for real parking turnover. Its primary
technical property is the one-driver offer: one departure is communicated to one
eligible member at a time.

The SPOT Protocol extends that coordination into a safety-oriented arrival flow.
The arriving member identifies a destination, uses permission-based location and
voice guidance, approaches hands-free, and reaches a proximity zone. The
departing member confirms readiness while parked. The system then closes the
handoff without presenting the public curb as property that was sold or reserved.

The deployed system is appropriate for a controlled Belmont Shore pilot. The most
important next validation is not additional feature volume. It is demonstrating
that a small, trusted network can use the workflow reliably, safely, and with
measurable improvement in arrival coordination.
