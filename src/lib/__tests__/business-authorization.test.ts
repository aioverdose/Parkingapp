import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getAuthenticatedUser, getBusinessMembership, createAdminClient } = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getBusinessMembership: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/api/auth-helpers", () => ({ getAuthenticatedUser }));
vi.mock("@/lib/api/business-helpers", () => ({ getBusinessMembership }));
vi.mock("@/lib/supabaseAdmin", () => ({ createAdminClient }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { GET as getBusiness, PATCH as updateBusiness } from "@/app/api/businesses/[id]/route";
import { GET as getDashboard } from "@/app/api/businesses/[id]/dashboard/route";
import { GET as getMembers, POST as addMember } from "@/app/api/businesses/[id]/members/route";

function request(method = "GET") {
  return new NextRequest("http://localhost/api/businesses/00000000-0000-0000-0000-000000000002", { method });
}

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedUser.mockResolvedValue({ id: "user-a" });
  createAdminClient.mockImplementation(() => {
    throw new Error("database client should not be reached for rejected requests");
  });
});

describe("B2B business authorization", () => {
  it("blocks a member of Business A from reading Business B configuration", async () => {
    getBusinessMembership.mockResolvedValue(null);

    const response = await getBusiness(request(), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000002" }) });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("blocks a member of Business A from reading Business B dashboard data", async () => {
    getBusinessMembership.mockResolvedValue(null);

    const response = await getDashboard(request(), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000002" }) });

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("blocks a member of Business A from reading Business B roster data", async () => {
    getBusinessMembership.mockResolvedValue(null);

    const response = await getMembers(request(), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000002" }) });

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("blocks staff from adding members", async () => {
    getBusinessMembership.mockResolvedValue({ role: "staff", network_id: "network-a" });

    const response = await addMember(request("POST"), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }) });

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("blocks regular members from adding members", async () => {
    getBusinessMembership.mockResolvedValue({ role: "member", network_id: "network-a" });

    const response = await addMember(request("POST"), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }) });

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("blocks staff from changing business configuration or branding", async () => {
    getBusinessMembership.mockResolvedValue({ role: "staff", network_id: "network-a" });

    const response = await updateBusiness(request("PATCH"), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }) });

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
