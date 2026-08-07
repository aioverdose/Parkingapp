import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  getOfferWindowMs,
  getMatchRadiusMeters,
  haversineDistance,
  isScheduleCompatible,
  findBestSeeker,
  createExclusiveOffer,
  attemptNextOffer,
  type ExclusiveSpot,
} from "../matching/exclusive-matcher";
import { createAdminClient } from "@/lib/supabaseAdmin";

vi.mock("@/lib/supabaseAdmin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/push", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

const DEFAULT_OFFER_WINDOW_MS = 90_000;
const DEFAULT_RADIUS = 200;

function makeSpot(overrides: Partial<ExclusiveSpot> = {}): ExclusiveSpot {
  return {
    id: "spot-1",
    user_id: "owner-1",
    latitude: 33.7637,
    longitude: -118.1679,
    departure_time: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    return_time: null,
    address: "123 Main St",
    vehicle_type: "car",
    relay_mode: "imminent",
    visibility: "exclusive",
    exclusive_attempts: 0,
    max_exclusive_attempts: 5,
    business_id: null,
    network_id: null,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<{ user_id: string; vehicle_type: string | null; created_at: string }> = {}) {
  return {
    id: "req-1",
    user_id: "seeker-1",
    latitude: 33.7642,
    longitude: -118.1682,
    vehicle_type: "car",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.MATCH_OFFER_WINDOW_MS;
  delete process.env.MATCH_RADIUS_METERS;
});

describe("getOfferWindowMs", () => {
  it("defaults to 90 seconds", () => {
    expect(getOfferWindowMs()).toBe(DEFAULT_OFFER_WINDOW_MS);
  });

  it("uses the configured window", () => {
    process.env.MATCH_OFFER_WINDOW_MS = "45000";
    expect(getOfferWindowMs()).toBe(45_000);
  });

  it("ignores invalid configuration", () => {
    process.env.MATCH_OFFER_WINDOW_MS = "not-a-number";
    expect(getOfferWindowMs()).toBe(DEFAULT_OFFER_WINDOW_MS);
  });
});

describe("getMatchRadiusMeters", () => {
  it("defaults to 200 meters", () => {
    expect(getMatchRadiusMeters()).toBe(DEFAULT_RADIUS);
  });

  it("uses the configured radius", () => {
    process.env.MATCH_RADIUS_METERS = "500";
    expect(getMatchRadiusMeters()).toBe(500);
  });
});

describe("haversineDistance", () => {
  it("is ~0 for identical coordinates", () => {
    expect(haversineDistance(33.7637, -118.1679, 33.7637, -118.1679)).toBeLessThan(1);
  });

  it("computes ~1 degree of latitude as ~111km", () => {
    const d = haversineDistance(33, -118, 34, -118);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const a = haversineDistance(33.76, -118.16, 33.77, -118.17);
    const b = haversineDistance(33.77, -118.17, 33.76, -118.16);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("isScheduleCompatible", () => {
  it("matches an imminent spot against an active seeker request", () => {
    const spot = makeSpot();
    const req = makeRequest();
    expect(isScheduleCompatible(spot, req)).toBe(true);
  });

  it("rejects an imminent spot that departs beyond the 2h seeker window", () => {
    const spot = makeSpot({
      departure_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    });
    const req = makeRequest();
    expect(isScheduleCompatible(spot, req)).toBe(false);
  });

  it("matches a scheduled relay when the request overlaps the availability window", () => {
    const departure = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const spot = makeSpot({
      relay_mode: "scheduled",
      departure_time: departure,
      return_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    });
    const req = makeRequest();
    expect(isScheduleCompatible(spot, req)).toBe(true);
  });
});

type TablesData = Record<string, unknown[]>;

function makeFakeClient(tables: TablesData) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gt: () => chain,
        lt: () => chain,
        in: () => chain,
        or: () => chain,
        order: () => chain,
        single: () => chain,
        maybeSingle: () => chain,
        insert: () => chain,
        update: () => chain,
        then: (resolve: (v: { data: unknown; error: null }) => void) => {
          resolve({ data: tables[table] ?? [], error: null });
        },
      };
      return chain;
    },
  };
}

function makeNearbyRequest(userId: string) {
  return {
    id: `req-${userId}`,
    user_id: userId,
    latitude: 33.7642,
    longitude: -118.1682,
    vehicle_type: "car",
    created_at: new Date().toISOString(),
  };
}

describe("findBestSeeker network scoping", () => {
  it("only considers active members of the spot's network", async () => {
    const spot = makeSpot({
      business_id: "biz-1",
      network_id: "net-1",
    });

    vi.mocked(createAdminClient).mockReturnValue(
      makeFakeClient({
        network_businesses: [{ business_id: "biz-1" }],
        business_members: [{ user_id: "seeker-1" }, { user_id: "member-2" }],
        spot_requests: [
          makeNearbyRequest("seeker-1"),
          makeNearbyRequest("outsider-9"),
          makeNearbyRequest("owner-1"),
        ],
        user_ranking: [],
        users: [],
        user_blocks: [],
      }) as never,
    );

    const best = await findBestSeeker(spot);

    expect(best).not.toBeNull();
    expect(best!.user_id).toBe("seeker-1");
  });

  it("returns null when the network has no participating businesses", async () => {
    const spot = makeSpot({ network_id: "net-empty" });

    vi.mocked(createAdminClient).mockReturnValue(
      makeFakeClient({
        network_businesses: [],
        spot_requests: [makeNearbyRequest("seeker-1")],
      }) as never,
    );

    const best = await findBestSeeker(spot);

    expect(best).toBeNull();
  });

  it("returns null when no network member has an active request", async () => {
    const spot = makeSpot({ network_id: "net-1" });

    vi.mocked(createAdminClient).mockReturnValue(
      makeFakeClient({
        network_businesses: [{ business_id: "biz-1" }],
        business_members: [{ user_id: "seeker-1" }],
        spot_requests: [makeNearbyRequest("outsider-9")],
        user_ranking: [],
        users: [],
        user_blocks: [],
      }) as never,
    );

    const best = await findBestSeeker(spot);

    expect(best).toBeNull();
  });
});

describe("createExclusiveOffer concurrency", () => {
  it("accepts only one live offer when workers race", async () => {
    const liveOffers: Array<Record<string, unknown>> = [];
    let insertedOffers = 0;

    function client() {
      return {
        from(table: string) {
          let operation: "read" | "insert" | "update" = "read";
          let values: Record<string, unknown> = {};
          const chain: Record<string, unknown> = {
            select: () => chain,
            eq: () => chain,
            in: () => chain,
            maybeSingle: async () => ({
              data: table === "spot_matches" && operation === "read" ? liveOffers[0] ?? null : null,
              error: null,
            }),
            insert: (insertValues: Record<string, unknown>) => {
              operation = "insert";
              values = insertValues;
              return chain;
            },
            update: (updateValues: Record<string, unknown>) => {
              operation = "update";
              values = updateValues;
              return chain;
            },
            single: async () => {
              if (table === "spot_matches" && operation === "insert") {
                if (liveOffers.length > 0) {
                  return { data: null, error: { code: "23505", message: "unique live offer" } };
                }
                const offer = { id: `offer-${++insertedOffers}`, ...values };
                liveOffers.push(offer);
                return { data: { id: offer.id }, error: null };
              }
              return { data: null, error: null };
            },
            then: (resolve: (value: { data: unknown; error: null }) => void) => {
              resolve({ data: table === "users" ? { name: "Owner" } : [], error: null });
            },
          };
          return chain;
        },
      };
    }

    vi.mocked(createAdminClient).mockImplementation(() => client() as never);

    const spot = makeSpot({ business_id: "business-a", network_id: "network-a" });
    const results = await Promise.all([
      createExclusiveOffer(spot, "seeker-1"),
      createExclusiveOffer(spot, "seeker-2"),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(liveOffers).toHaveLength(1);
  });
});

describe("attemptNextOffer public fallback", () => {
  function makeSpotClient(spot: ExclusiveSpot, tables: Record<string, unknown[]>) {
    const publicFallbackCalls: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          gt: () => chain,
          in: () => chain,
          insert: () => chain,
          single: () => chain,
          maybeSingle: () => chain,
          update: (values: Record<string, unknown>) => {
            if (table === "parking_spots" && values.visibility === "public") {
              publicFallbackCalls.push(values);
            }
            return chain;
          },
          then: (resolve: (v: { data: unknown; error: null }) => void) => {
            if (table === "parking_spots") resolve({ data: spot, error: null });
            else resolve({ data: tables[table] ?? [], error: null });
          },
        };
        return chain;
      },
    };
    return { client, publicFallbackCalls };
  }

  it("never falls back to the public map for network spots", async () => {
    const spot = makeSpot({
      business_id: "biz-1",
      network_id: "net-1",
      exclusive_attempts: 5,
      max_exclusive_attempts: 5,
    });

    const { client, publicFallbackCalls } = makeSpotClient(spot, {
      spot_matches: [],
      network_businesses: [],
      notifications: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const result = await attemptNextOffer("spot-1");

    expect(result).toEqual({ reassigned: false, fallback: false });
    expect(publicFallbackCalls).toHaveLength(0);
  });

  it("still falls back to the public map for consumer spots", async () => {
    const spot = makeSpot({
      business_id: null,
      network_id: null,
      exclusive_attempts: 5,
      max_exclusive_attempts: 5,
    });

    const { client, publicFallbackCalls } = makeSpotClient(spot, {
      spot_matches: [],
      spot_requests: [],
      user_ranking: [],
      users: [],
      user_blocks: [],
      notifications: [],
    });

    vi.mocked(createAdminClient).mockReturnValue(client as never);

    const result = await attemptNextOffer("spot-1");

    expect(result).toEqual({ reassigned: false, fallback: true });
    expect(publicFallbackCalls).toHaveLength(1);
  });
});
