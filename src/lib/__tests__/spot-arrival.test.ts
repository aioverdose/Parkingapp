import { describe, expect, it } from "vitest";
import { isInsideSpotArrivalGeofence, SPOT_ARRIVAL_GEOFENCE } from "@/lib/spot-protocol";

describe("SPOT Arrival geofence", () => {
  it("accepts the Belmont Shore center", () => {
    expect(isInsideSpotArrivalGeofence(SPOT_ARRIVAL_GEOFENCE)).toBe(true);
  });

  it("uses a larger exit boundary after entry", () => {
    const nearExit = { latitude: SPOT_ARRIVAL_GEOFENCE.latitude, longitude: SPOT_ARRIVAL_GEOFENCE.longitude + 0.0115 };
    expect(isInsideSpotArrivalGeofence(nearExit, false)).toBe(false);
    expect(isInsideSpotArrivalGeofence(nearExit, true)).toBe(true);
  });

  it("rejects an entry when GPS uncertainty crosses the boundary", () => {
    const nearBoundary = { latitude: SPOT_ARRIVAL_GEOFENCE.latitude, longitude: SPOT_ARRIVAL_GEOFENCE.longitude + 0.009 };
    expect(isInsideSpotArrivalGeofence(nearBoundary, false, 250)).toBe(false);
  });
});
