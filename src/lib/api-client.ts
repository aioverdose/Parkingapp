import { createBrowserClient } from "./supabaseClient";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error ?? `Request failed with status ${res.status}` };
    }

    const body = await res.json();
    return { data: body as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function claimSpot(spotId: string) {
  return apiFetch<{ success: boolean }>(`/api/spots/${spotId}/claim`, { method: "POST" });
}

export function sendTip(spotId: string, amount: number) {
  return apiFetch<{ success: boolean; amount: number }>(`/api/spots/${spotId}/tip`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function createSpot(data: {
  latitude: number;
  longitude: number;
  address: string;
  departure_time: string;
  return_time?: string | null;
  vehicle_type?: string | null;
  lead_minutes?: number;
}) {
  return apiFetch<{ spot: unknown }>("/api/spots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchStats() {
  return apiFetch<{
    totalSpotsPosted: number;
    activeSpotsNow: number;
    userSpotsPosted: number;
    userSpotsClaimed: number;
  }>("/api/stats");
}
