# Belmont Shore Pilot Launch

This checklist is for a controlled pilot of SpotMatch. It assumes the product
coordinates imminent departures inside a private business network. It does not
reserve, sell, rent, or guarantee public street parking.

## 1. Configure Supabase

1. Create or select the production Supabase project.
2. Enable Email Auth and configure the redirect URL for the production domain.
3. Enable Realtime for the tables used by notifications, spots, matches, and chat.
4. Apply migrations `00001` through `00052` in order. The repository contains
   duplicate filenames for migrations `00019` and `00020`; use the canonical
   migration history or apply the consolidated SQL only to a fresh database.
5. Enable `pg_cron` when available and confirm the pilot retention job exists.
6. Create one platform-admin account only after the base user record exists.

## 2. Configure Vercel

Required variables:

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

Optional variables:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
OLLAMA_BASE_URL
OLLAMA_MODEL
```

For a first internal pilot, set `PHONE_VERIFICATION_ENABLED=false` unless
Twilio SMS delivery has been tested. Set it to `true` before opening posting to
the public unless the pilot operator has approved the lower-friction flow.

## 3. Deploy and verify

Run locally first:

```powershell
npm install
npm test
npx tsc --noEmit
npm run build
```

Deploy:

```powershell
npx vercel --prod --yes
```

Verify in production with two test accounts:

1. Create a business and confirm its private network exists.
2. Join the network from the second account using its join link.
3. Create an active spot request from the second account.
4. Post a departure from the first account.
5. Confirm exactly one offer is created for the network.
6. Accept, decline, and allow an offer to expire.
7. Confirm a declined or expired offer can be reassigned.
8. Confirm a network spot never appears in the public feed.
9. Confirm the dashboard counts the departure and handoff.
10. Confirm no-show and completed states are recorded correctly.

## 4. Schedule operations

Call the protected endpoint every minute:

```text
POST https://YOUR_DOMAIN/api/cron/expire-offers
Authorization: Bearer YOUR_CRON_SECRET
x-cron-secret: YOUR_CRON_SECRET
```

Confirm the scheduler receives HTTP 200 and inspect the response counts. Do not
use the Supabase service-role key as the scheduler secret.

## 5. Start the pilot narrowly

1. Recruit two to five Belmont Shore businesses or one business with trusted
   staff and regulars.
2. Define the operating radius and high-pressure operating periods.
3. Add street-sweeping, permit, loading-zone, red-curb, and time-limit notes.
4. Print the business QR join materials.
5. Train members on posting only when they are actually leaving.
6. Review the dashboard daily for offers, acceptance, no-shows, and failures.
7. Collect baseline complaints and arrival-delay reports before comparing pilot
   results.

## 6. Do not expand until verified

Before adding a larger public audience, verify cross-business RLS isolation,
concurrent offer creation, member removal during an active offer, notification
failure behavior, retention cleanup, and mobile accessibility on real devices.
