# Parking Meeters Recovery Decision Record

Status: Approved for staged implementation
Date: 2026-09-19

## Product Direction

Parking Meeters is moving from the legacy spot-based prototype to privacy-conscious neutral potential matching.

The new model connects an arriving participant and a departing participant when vehicle preferences, approximate areas, meaningful schedule windows, opt-in, eligibility, privacy, and block checks all pass. A potential match is not a reservation, guarantee, sale, transfer, or claim to a public parking space.

## Legacy Protection

The following remain preserved and are not destructively changed:

- `parking_spots`
- `spot_requests`
- `spot_matches`
- Legacy Messenger data
- Historical notifications
- Historical audit records
- Existing migrations

Legacy spot-based matching is deprecated for new neutral flows. Legacy records remain available for historical compatibility during migration.

## Neutral Matching Defaults

```ts
DEFAULT_MATCH_RADIUS_FEET = 300;
DEFAULT_MATCH_RADIUS_METERS = 91.44;
MINIMUM_TIME_OVERLAP_MINUTES = 5;
MATCH_EXPIRY_MINUTES = 20;
```

Defaults are centralized and will later support network, pilot, neighborhood, and admin overrides.

## Messenger Rule

Neutral Messenger conversations open only after both participants accept the same potential match. Direct spot-to-chat creation is not available to new neutral matches.

## Scheduler Rule

Matching will be event-driven after relevant profile, vehicle, area, schedule, opt-in, and block changes, with a short reconciliation process limited to active, opted-in, unexpired schedule windows. The undocumented external scheduler is not the neutral matching source of truth.

## Rollback

The neutral system is isolated behind `neutral_matching_v1`. Disabling the flag stops new neutral matching without deleting neutral or legacy data. Legacy tables and records remain intact.

## Current Limitations

- The legacy matcher remains active until the neutral system passes synthetic-user QA.
- Production deployments must be tied to a Git SHA before the neutral system is enabled for real users.
- Privacy, authorization, concurrency, expiration, and Messenger tests are required before pilot activation.
