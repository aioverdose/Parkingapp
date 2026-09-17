# Parking Meeters App Summary

## Overview

Parking Meeters is a social parking coordination application for people whose daily schedules overlap. It helps one driver connect with another driver who is arriving near the time the first driver is leaving. The app does not sell, rent, reserve, or guarantee parking spaces. It only helps members coordinate a possible parking handoff safely.

The active production application is built in `D:\parkingapp` and is deployed at:

https://www.parkingmeeters.com

## Core User Problem

Drivers often know when they will arrive and leave an area, but they do not know who may be arriving as they leave. Parking Meeters turns those schedule details into potential connections based on:

- Vehicle compatibility
- Approximate location
- Arrival and departure times
- Recurring days and schedules
- User trust and safety controls

## Main User Flow

1. A user creates an account or logs in with email/password or phone verification.
2. The user accepts the Terms of Service and community safety agreement.
3. The user completes a profile with vehicle type, approximate parking area, arrival time, departure time, and recurring schedule information.
4. The application scans for compatible users approximately every 10 seconds while the user is signed in.
5. When a compatible match is found, both users receive an in-app notification. Push notifications are also supported when Web Push credentials are configured.
6. A match banner sends the user to the Messages area.
7. Each participant accepts the match.
8. Once both participants accept, the match becomes confirmed.
9. A private messenger conversation is opened for the two matched participants.
10. The participants coordinate the exchange through moderated messages.

## Matching Logic

The schedule matcher is implemented in:

`src/app/api/matches/schedule/route.ts`

The matcher evaluates:

- Whether the users have compatible vehicle types
- Whether recurring schedule days overlap
- Whether one user's departure time is within the configured matching window of another user's arrival time
- Whether the users' scheduled parking locations are within the matching radius
- Whether the schedules are currently inside their configured date windows
- Whether either user has blocked the other
- Whether the pair already has an active or historical match

The default matching window is approximately 30 minutes and the default location radius is approximately 400 meters, subject to application configuration.

Schedule calculations use the application timezone:

`America/Los_Angeles`

This prevents Vercel's UTC server timezone from incorrectly moving local afternoon schedules to the next calendar day.

## Match Notifications

Match notifications are stored in the Supabase `notifications` table and linked to the related `spot_matches` record. The application supports:

- In-app match banners
- Notification center entries
- Supabase Realtime notification updates
- Optional browser push notifications through VAPID/Web Push
- Polling fallback every 10 seconds so matching does not depend exclusively on Realtime

## Messaging

The primary messaging interface is:

`src/app/messages/page.tsx`

Messaging features include:

- Private conversations between match participants
- Participant-only access controls
- Realtime message updates through Supabase Realtime
- Message length validation
- Basic safety and threat-content moderation
- Conversation reporting
- Conversation expiration and close behavior

The older map-based ephemeral chat interface still exists in the codebase for legacy flows, but the preferred beta path is match confirmation followed by the Messages page.

## Authentication and Authorization

Authentication is handled by Supabase Auth. Server-side API routes validate the caller's bearer token before accessing protected data.

Important authorization rules include:

- Only authenticated users can create requests, post spots, or access matches.
- Only match participants can view or update their match.
- Only match participants can read or send messages.
- Admin routes require an administrator or moderator role.
- Admin and server-only database functions use restricted execution permissions.
- User location data is coarse unless a confirmed location-sharing flow is active.

## Database

The main production data is stored in Supabase PostgreSQL. Important tables include:

- `users`
- `parking_spots`
- `spot_requests`
- `spot_matches`
- `notifications`
- `ephemeral_chats`
- `ephemeral_messages`
- `recurring_schedules`
- `schedule_date_entries`
- `user_vehicles`
- `user_blocks`
- `driver_locations`

Database migrations are stored under:

`supabase/migrations/`

Recent reliability and security improvements include:

- Atomic match acceptance to prevent simultaneous accepts from overwriting each other
- Protection against claiming expired parking alerts
- Protected privileged RPC functions
- Hardened PostgreSQL function search paths
- Realtime publication for notifications and messages
- Presence tracking independent of geolocation permission

## Admin Tools

The admin area provides operational visibility and test controls, including:

- User management
- Potential match review
- Match and notification cleanup
- Online presence monitoring
- Business coordination tools
- Community moderation
- Parking research and OpenStreetMap import workflows
- Synthetic test users
- Behavior and device testing tools

## Deployment

The application is deployed with Vercel and uses Supabase for:

- Authentication
- PostgreSQL database
- Row Level Security
- Realtime updates
- Storage and server-side data access

The production application is:

https://www.parkingmeeters.com

## Required Environment Configuration

Production requires correctly configured values for:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Twilio variables if phone verification is enabled
- VAPID variables if push notifications are enabled
- Stripe variables if match credits or payments are enabled
- Cron and agent secrets for scheduled/admin operations

The public Supabase URL and publishable key may be exposed to the browser. Service-role keys, database passwords, API tokens, and other secret credentials must remain server-side and must never be committed to source control.

## Current Beta Status

The active application currently has:

- Working authentication
- Profile and schedule setup
- Automatic schedule-based matching
- Match notification banners
- Match acceptance
- Private participant messaging
- Realtime message delivery
- Timezone-correct schedule calculations
- Production deployment and protected API routes

The recommended beta test should use two separate accounts in two browsers or devices. Test profile completion, matching, simultaneous acceptance, message delivery, expired matches, blocked users, and notification behavior.

## Recommended Beta Test

Create two users with:

- The same or compatible vehicle type
- Nearby schedule locations
- The same recurring day
- One user's departure time within 30 minutes of the other user's arrival time

Then verify:

1. Both profiles save correctly.
2. A match appears within approximately 10 seconds.
3. Both users see the match banner or notification.
4. Both users can accept the match.
5. The status changes to confirmed.
6. The Messages page opens for the match.
7. Messages appear live in both browsers.
8. Non-participants cannot access the match or messages.

## Product Positioning

Parking Meeters is not a parking reservation marketplace. It is a coordination network based on timing, proximity, and trust. Its value comes from helping drivers recognize useful schedule overlaps and communicate safely before attempting an exchange.
