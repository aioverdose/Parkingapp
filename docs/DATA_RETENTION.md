# Data Retention & Ephemeral Data

ParkingMeeters stores only what it needs, and most operational data is
ephemeral by design. This document catalogs every ephemeral dataset, its
retention window, the cleanup mechanism, and how cleanup is scheduled.

## How cleanup runs

Two mechanisms keep databases tidy:

1. **`scripts/ttl-cleanup.ts`** (`npm run ttl-cleanup`) — the primary runner,
   designed to be invoked by a cron scheduler every ~5 minutes. It calls each
   cleanup function listed below through the Supabase service role.
2. **Optional `pg_cron`** — several migrations ship commented-out
   `cron.schedule(...)` lines (e.g. cleanup of rate-limit windows, app logs,
   expired offers). These are equivalent and can be enabled instead.

Deploying `ttl-cleanup.ts` on Vercel requires `CRON_SECRET` (falls back to
`AGENT_SECRET_KEY`) and a Bearer header — see the `/api/cron` routes.

## Ephemeral datasets

### Ephemeral chats & messages — `ephemeral_chats`, `ephemeral_messages`
- **Purpose:** one-off conversations tied to a specific spot handoff.
- **Retention:** active chats expire at `expires_at`; chats in
  `completed`/`expired` state are hard-deleted 1 hour after `closed_at`.
- **Cleanup:** `cleanup_ephemeral_chats()` (migration `00005_ttl_cron.sql`).
- **Access:** RLS restricts reads to the two chat participants. Messages are
  cascade-deleted with their chat.

### Departure pings — `departure_pings`
- **Purpose:** short-lived "I'm leaving, spot opening" signals.
- **Retention:** deleted after `expires_at`. Pings are created with a default
  1-hour TTL (trigger in `00014_security_layer.sql`).
- **Cleanup:** `cleanup_departure_pings()` (`00005_ttl_cron.sql`).

### Live driver locations — `driver_locations`
- **Purpose:** real-time position during an active match/relay, and the
  control-tower presence map.
- **Retention:** hard-deleted after 1 hour (`recorded_at` older than 1 hour).
- **Cleanup:** `cleanup_old_driver_locations()` (`00019_live_location_sharing.sql`).
- **Access:** RLS only exposes locations to the other party of an active,
  confirmed match; sharing is auto-stopped when a match ends.

### Parking spots — `parking_spots`
- **Purpose:** active/expired/taken spot alerts.
- **Retention:** spots are marked `expired` once `expires_at` passes
  (imminent alerts default to departure + 2h or return time; scheduled relays
  expire at departure). Expired spots are excluded from the public feed but
  retained for history/reliability scoring.
- **Cleanup:** the `ttl-cleanup` script marks them expired. Hard-deletion is
  not performed automatically.

### Rate limit windows — `rate_limits` (added `00036_distributed_rate_limits.sql`)
- **Purpose:** distributed request throttling across serverless instances.
- **Retention:** rows become stale once `reset_at < now()` and are deleted by
  `cleanup_expired_rate_limits()`.

### Structured logs — `app_logs` (added `00037_structured_logs.sql`)
- **Purpose:** server-side error tracking and key event logs.
- **Retention:** 30 days, enforced by `cleanup_expired_app_logs(30)`.
- **Access:** write-only via the `insert_app_log` RPC; never readable by
  clients.

### Stripe webhook events — `webhook_events` (added `00038_webhook_idempotency.sql`)
- **Purpose:** replay protection for Stripe webhook deliveries.
- **Retention:** **indefinite by design.** Event IDs are tiny and must persist
  so a re-delivered webhook can never double-grant credits. The idempotent
  grant RPC (`complete_credit_purchase`) is the real guard; this table is a
  fast-path short-circuit.

### Exclusive offer windows — `spot_matches.offer_expires_at`
- **Purpose:** 90-second acceptance windows for exclusive matching offers.
- **Cleanup:** `expireStaleOffers()` in `src/lib/matching/exclusive-matcher.ts`,
  run by the `/api/cron/expire-offers` endpoint (schedule every minute) and
  opportunistically on each `/api/matches/find` call.

## Security notes

- All cleanup RPCs run `SECURITY DEFINER` (or use the service role) so clients
  can never delete data directly.
- Ephemeral tables have RLS enabled with no public write/delete paths.
- Logs never include secrets; the structured logger sanitizes `Error` objects
  and drops unserializable values.
