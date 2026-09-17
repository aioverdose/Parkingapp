import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  post: null as Record<string, unknown> | null,
  updated: null as Record<string, unknown> | null,
  deleted: false,
}));

vi.mock("@/lib/api/auth-helpers", () => ({
  getAuthenticatedUser: vi.fn(async () => mocks.user),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  createAdminClient: vi.fn(() => ({
    from: () => {
      const query: any = {
        select: () => query,
        update: (value: Record<string, unknown>) => {
          mocks.updated = { ...mocks.post, ...value };
          if (value.status === "deleted" && mocks.post) mocks.deleted = true;
          return query;
        },
        eq: () => query,
        maybeSingle: async () => ({ data: mocks.post, error: null }),
        single: async () => ({ data: mocks.updated, error: null }),
      };
      return query;
    },
  })),
}));

import { DELETE, PATCH } from "./route";

const request = (method: string, body?: object) => new NextRequest("http://localhost/api/community/posts/post-1", {
  method,
  headers: { "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
});

describe("community post ownership controls", () => {
  beforeEach(() => {
    mocks.user = { id: "owner-1" };
    mocks.post = { id: "post-1", author_id: "owner-1", category: "question", body: "Old body", area_label: "Downtown", sponsored: false, status: "published", created_at: "now", updated_at: "now" };
    mocks.updated = null;
    mocks.deleted = false;
  });

  it("rejects an unauthenticated patch", async () => {
    mocks.user = null;
    expect((await PATCH(request("PATCH", { body: "New body" }), { params: Promise.resolve({ id: "post-1" }) })).status).toBe(401);
  });

  it("rejects a non-owner patch and delete", async () => {
    mocks.user = { id: "other-1" };
    mocks.post = null;
    expect((await PATCH(request("PATCH", { body: "New body" }), { params: Promise.resolve({ id: "post-1" }) })).status).toBe(404);
    expect((await DELETE(request("DELETE"), { params: Promise.resolve({ id: "post-1" }) })).status).toBe(404);
    expect(mocks.deleted).toBe(false);
  });

  it("rejects blocked content", async () => {
    const response = await PATCH(request("PATCH", { body: "I will kill you" }), { params: Promise.resolve({ id: "post-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.updated).toBeNull();
  });

  it("updates and deletes an owner's post", async () => {
    const update = await PATCH(request("PATCH", { body: "Helpful new body", category: "alert", area_label: "Midtown" }), { params: Promise.resolve({ id: "post-1" }) });
    expect(update.status).toBe(200);
    expect(mocks.updated).toMatchObject({ body: "Helpful new body", category: "alert", area_label: "Midtown", status: "published" });
    expect((await DELETE(request("DELETE"), { params: Promise.resolve({ id: "post-1" }) })).status).toBe(200);
    expect(mocks.deleted).toBe(true);
  });
});
