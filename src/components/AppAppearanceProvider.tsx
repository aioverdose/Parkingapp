"use client";

import { useEffect } from "react";
import { getAppColorPalette } from "@/lib/experience-appearance";

export function AppAppearanceProvider() {
  useEffect(() => {
    let cancelled = false;
    fetch("/api/experience/profile", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body: { appearance?: { palette?: string } } | null) => {
      if (cancelled) return;
      const palette = getAppColorPalette(body?.appearance?.palette);
      const root = document.documentElement;
      root.dataset.appPalette = palette.id;
      root.style.setProperty("--app-accent", palette.accent);
      root.style.setProperty("--app-accent-strong", palette.accentStrong);
      root.style.setProperty("--app-surface", palette.surface);
      root.style.setProperty("--app-ink", palette.ink);
      root.style.setProperty("--app-muted", palette.muted);
      root.style.setProperty("--app-border", palette.border);
       root.style.setProperty("--app-accent-contrast", palette.contrastSafeText);
       root.style.setProperty("--background", palette.background);
       root.style.setProperty("--foreground", palette.ink);
       root.style.setProperty("--surface", palette.surface);
       root.style.setProperty("--border", palette.border);
       root.style.setProperty("--muted", palette.muted);
       root.style.setProperty("--accent", palette.accent);
       root.style.setProperty("--accent-strong", palette.accentStrong);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  return null;
}
