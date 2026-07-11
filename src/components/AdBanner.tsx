"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { X, Megaphone } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  business_name: string;
  tagline: string | null;
  image_url: string | null;
  link_url: string | null;
}

function trackClick(adId: string) {
  fetch(`/api/ads/${adId}/click`, { method: "POST" }).catch(() => {});
}

function trackImpression(adId: string) {
  fetch(`/api/ads/${adId}/impression`, { method: "POST" }).catch(() => {});
}

interface AdWithTargeting extends Ad {
  target_lat: number | null;
  target_lng: number | null;
  target_radius_meters: number | null;
}

function isNearby(
  ad: AdWithTargeting,
  lat?: number,
  lng?: number,
): boolean {
  if (!ad.target_lat || !ad.target_lng || !ad.target_radius_meters || lat == null || lng == null) return true;
  const R = 6371e3;
  const dlat = ((ad.target_lat - lat) * Math.PI) / 180;
  const dlng = ((ad.target_lng - lng) * Math.PI) / 180;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos((lat * Math.PI) / 180) * Math.cos((ad.target_lat * Math.PI) / 180) * Math.sin(dlng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist <= ad.target_radius_meters;
}

export function AdBanner({ latitude, longitude }: { latitude?: number; longitude?: number }) {
  const supabase = createBrowserClient();
  const [ad, setAd] = useState<Ad | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    supabase
      .from("ads")
      .select("id, title, business_name, tagline, image_url, link_url, target_lat, target_lng, target_radius_meters")
      .eq("active", true)
      .lte("start_date", new Date().toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const geofenced = (data as AdWithTargeting[]).filter((a) => isNearby(a, latitude, longitude));
          const chosen = geofenced.length > 0 ? geofenced[0] : data[0];
          setAd(chosen as Ad);
          trackImpression(chosen.id);
        }
      });
  }, [latitude, longitude]);

  if (!ad || dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl overflow-hidden shadow-lg">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-white/70 hover:text-white z-10"
      >
        <X size={16} />
      </button>
      <a
        href={ad.link_url ?? "#"}
        target={ad.link_url ? "_blank" : undefined}
        rel={ad.link_url ? "noopener noreferrer" : undefined}
        onClick={() => trackClick(ad.id)}
        className="flex items-center gap-4 p-4"
      >
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Megaphone size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{ad.title}</p>
          <p className="text-xs text-white/80 truncate">
            {ad.business_name}{ad.tagline ? ` — ${ad.tagline}` : ""}
          </p>
        </div>
      </a>
    </div>
  );
}

export function AdSidebar() {
  const supabase = createBrowserClient();
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    supabase
      .from("ads")
      .select("id, title, business_name, tagline, image_url, link_url")
      .eq("active", true)
      .lte("start_date", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAds(data as Ad[]);
          data.forEach((ad) => trackImpression(ad.id));
        }
      });
  }, []);

  if (ads.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold px-1">Local Businesses</p>
      {ads.map((ad) => (
        <a
          key={ad.id}
          href={ad.link_url ?? "#"}
          target={ad.link_url ? "_blank" : undefined}
          rel={ad.link_url ? "noopener noreferrer" : undefined}
          onClick={() => trackClick(ad.id)}
          className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shrink-0">
            <Megaphone size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{ad.title}</p>
            <p className="text-xs text-zinc-500 truncate">{ad.business_name}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
