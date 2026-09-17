import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: { getUser } })),
}));

import { getAuthenticatedUser } from "./auth-helpers";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-key";
    getUser.mockImplementation(async (token: string) => ({ data: { user: { id: token } }, error: null }));
  });

  it.each(["ordinary-access-token", "synthetic-access-token"])("accepts a valid %s", async (token) => {
    const request = new NextRequest("http://localhost/api/profile", { headers: { Authorization: `Bearer ${token}` } });
    await expect(getAuthenticatedUser(request)).resolves.toEqual({ id: token });
    expect(getUser).toHaveBeenCalledWith(token);
  });

  it("rejects a missing bearer token", async () => {
    await expect(getAuthenticatedUser(new NextRequest("http://localhost/api/profile"))).resolves.toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });
});
