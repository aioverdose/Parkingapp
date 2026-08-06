interface MatchStatusPayload {
  matchId: string;
  status: "en_route" | "arrived" | "departed" | "no_show" | "completed";
  token: string;
}

export async function postMatchStatus(payload: MatchStatusPayload): Promise<boolean> {
  try {
    const res = await fetch(`/api/matches/${payload.matchId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${payload.token}`,
      },
      body: JSON.stringify({ status: payload.status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface AutoSpotPayload {
  latitude: number;
  longitude: number;
  address?: string | null;
  vehicle_type?: string | null;
  token: string;
  leadMinutes?: number;
}

export async function postAutoSpot(payload: AutoSpotPayload): Promise<boolean> {
  const leadMinutes = payload.leadMinutes ?? 5;
  const departureTime = new Date(Date.now() + leadMinutes * 60_000).toISOString();
  try {
    const res = await fetch("/api/spots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${payload.token}`,
      },
      body: JSON.stringify({
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address ?? "Auto-detected spot",
        departure_time: departureTime,
        relay_mode: "imminent",
        vehicle_type: payload.vehicle_type ?? null,
      }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.spot;
  } catch {
    return false;
  }
}

export async function postCarLocation(latitude: number, longitude: number, token: string): Promise<string | null> {
  try {
    const res = await fetch("/api/car-locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ latitude, longitude }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.carLocation?.id ?? null;
  } catch {
    return null;
  }
}

export async function patchCarLocation(
  carLocationId: string,
  updates: Record<string, unknown>,
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/car-locations/${carLocationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch {
    return false;
  }
}
