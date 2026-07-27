export const TEST_USERS = [
  { id: "00000000-0000-0000-0000-000000000001", email: "test-device-1@parkingmeeters.test", label: "Device 1", vehicleType: "sedan" as const },
  { id: "00000000-0000-0000-0000-000000000002", email: "test-device-2@parkingmeeters.test", label: "Device 2", vehicleType: "suv" as const },
  { id: "00000000-0000-0000-0000-000000000003", email: "test-device-3@parkingmeeters.test", label: "Device 3", vehicleType: "compact" as const },
  { id: "00000000-0000-0000-0000-000000000004", email: "test-device-4@parkingmeeters.test", label: "Device 4", vehicleType: "truck" as const },
] as const;

export const TEST_USER_PASSWORD = "test-device-password-2024";

export const LONG_BEACH_CENTER = { lat: 33.7701, lng: -118.1937 };

export const PARKING_SPEED_THRESHOLD = 1.0; // m/s — below this = parked

export const IDLE_TIMEOUT_MS = 300_000; // 5 minutes

export const AUTO_BROADCAST_INTERVAL_MS = 1000;

export const PARKING_DETECTION_WINDOW = 30; // seconds of slow speed to confirm parking

export const DEFAULT_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const TEST_BANNER_BG = "bg-amber-500";

export const OSRM_BASE_URL = "http://localhost:5000";

export const URBAN_SPEED_FACTOR = 1.4; // multiply straight-line time by this for urban driving estimate

export const MPH_TO_MS = 0.44704;

export const MS_TO_MPH = 2.23694;
