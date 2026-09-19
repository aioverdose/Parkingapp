import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: null as { user: { id: string }; role: "admin" | "moderator" } | null,
  previous: { name: "neutral_matching_v1", enabled: true, rollout: { mode: "open" }, description: "old" } as Record<string, unknown> | null,
  updated: null as Record<string, unknown> | null,
  where: null as string | null,
  audited: null as { action: string; targetId: string | null } | null,
}));

type MockQuery = {
  select: () => MockQuery;
  update: (value: Record<string, unknown>) => MockQuery;
  eq: (column: string) => MockQuery;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
  single: () => Promise<{ data: Record<string, unknown>; error: null }>;
};

vi.mock("@/lib/api/experience-auth", () => ({
  requireExperienceAuth: vi.fn(async () => mocks.auth ? { auth: mocks.auth } : { response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) }),
  audit: vi.fn(async (_auth: unknown, action: string, _type: string, targetId: string | null) => { mocks.audited = { action, targetId }; }),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  createAdminClient: vi.fn(() => ({
    from: () => {
      const query: MockQuery = {
        select: () => query,
        update: (value: Record<string, unknown>) => { mocks.updated = value; return query; },
        eq: (column: string) => { mocks.where = column; return query; },
        maybeSingle: async () => ({ data: mocks.previous, error: null }),
        single: async () => ({ data: { ...mocks.previous, ...mocks.updated }, error: null }),
      };
      return query;
    },
  })),
}));

import { PUT } from "./route";

const request = (body: Record<string, unknown>) => new NextRequest("http://localhost/api/admin/experience/feature-flags", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("feature flag administration", () => {
  beforeEach(() => {
    mocks.auth = { user: { id: "admin-1" }, role: "admin" };
    mocks.previous = { name: "neutral_matching_v1", enabled: true, rollout: { mode: "open" }, description: "old" };
    mocks.updated = null;
    mocks.where = null;
    mocks.audited = null;
  });

  it("updates an authorized feature flag by name and audits the update", async () => {
    const response = await PUT(request({ name: "neutral_matching_v1", enabled: true, rollout: { mode: "allowlist", user_ids: [], roles: [] } }), { params: Promise.resolve({ resource: "feature-flags" }) });
    expect(response.status).toBe(200);
    expect(mocks.where).toBe("name");
    expect(mocks.updated).toMatchObject({ rollout: { mode: "allowlist", user_ids: [], roles: [] } });
    expect(mocks.audited).toEqual({ action: "update", targetId: "neutral_matching_v1" });
  });

  it("rejects an unauthorized feature flag update", async () => {
    mocks.auth = null;
    const response = await PUT(request({ name: "neutral_matching_v1", enabled: false }), { params: Promise.resolve({ resource: "feature-flags" }) });
    expect(response.status).toBe(403);
    expect(mocks.updated).toBeNull();
  });

  it("rejects invalid rollout modes and arbitrary rollout fields", async () => {
    const invalidMode = await PUT(request({ name: "neutral_matching_v1", rollout: { mode: "experimental", user_ids: [], roles: [] } }), { params: Promise.resolve({ resource: "feature-flags" }) });
    const extraField = await PUT(request({ name: "neutral_matching_v1", rollout: { mode: "allowlist", user_ids: [], roles: [], extra: true } }), { params: Promise.resolve({ resource: "feature-flags" }) });
    expect(invalidMode.status).toBe(400);
    expect(extraField.status).toBe(400);
    expect(mocks.updated).toBeNull();
  });

  it("keeps generic non-feature-flag updates on the key path", async () => {
    const response = await PUT(request({ id: "default", draft: { value: true } }), { params: Promise.resolve({ resource: "sample-resource" }) });
    expect(response.status).toBe(200);
    expect(mocks.where).toBe("key");
  });
});
