"use client";

import { usePresencePing } from "@/hooks/usePresencePing";

export function PresenceTracker() {
  usePresencePing(true);
  return null;
}
