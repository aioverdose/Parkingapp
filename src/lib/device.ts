const DEVICE_ID_KEY = "parkingapp_device_id";

export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
