import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/community-control", () => ({ getCommunityControl: vi.fn(async () => ({ feed_enabled: false, settings: {} })) }));
vi.mock("@/lib/api/auth-helpers", () => ({ getAuthenticatedUser: vi.fn(async () => ({ id: "user-1" })) }));

import { GET, POST } from "./route";

describe("community feed controls", () => {
  it("returns 403 for feed reads while disabled", async () => {
    const response = await GET(new NextRequest("http://localhost/api/community/posts"));
    expect(response.status).toBe(403);
  });

  it("returns 403 for post creation while disabled", async () => {
    const response = await POST(new NextRequest("http://localhost/api/community/posts", { method: "POST", body: "{}" }));
    expect(response.status).toBe(403);
  });
});
