"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, MapPin, Filter, Clock, Car, Building2, CalendarClock, CircleDollarSign, Gavel, Store, Users, Wind } from "lucide-react";
import { AppPageShell } from "@/components/AppPageShell";
import { createBrowserClient } from "@/lib/supabaseClient";
import { ExploreCategoryCard } from "@/components/ExploreCategoryCard";

interface SpotResult {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address: string;
  departure_time: string;
  return_time: string | null;
  vehicle_type: string | null;
  relay_mode: "imminent" | "scheduled";
  tip_message: string | null;
  created_at: string;
  status: string;
}

const VEHICLE_TYPES = [
  { value: "", label: "Any vehicle" },
  { value: "compact", label: "Compact" },
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
  { value: "motorcycle", label: "Motorcycle" },
];

const CATEGORIES = [
  { label: "Live Departure Signals", detail: "Public-street coordination from members", href: "#live-signals", icon: Wind, tone: "bg-[#fff0eb] text-[#d94f35]", live: true },
  { label: "Paid Parking", detail: "Separate paid listings", href: "/business", icon: CircleDollarSign, tone: "bg-[#f6eee0] text-[#a36b2a]" },
  { label: "Private / Commercial Parking", detail: "Operator and venue listings", href: "/business", icon: Building2, tone: "bg-[#e6f0e8] text-[#4b805d]" },
  { label: "Venues", detail: "Parking context near destinations", href: "/community", icon: Store, tone: "bg-[#f0e9f5] text-[#79538f]" },
  { label: "Street Sweeping", detail: "Local timing reminders", href: "#coming-soon", icon: CalendarClock, tone: "bg-[#e7eef4] text-[#426d86]", placeholder: true },
  { label: "Parking Rules", detail: "Read local guidance", href: "/legal", icon: Gavel, tone: "bg-[#f6eee0] text-[#8b6334]" },
  { label: "Community", detail: "Useful neighborhood context", href: "/community", icon: Users, tone: "bg-[#fff0eb] text-[#d94f35]" },
  { label: "Businesses", detail: "Find participating operators", href: "/business", icon: Building2, tone: "bg-[#e6f0e8] text-[#4b805d]" },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [relayMode, setRelayMode] = useState("");
  const [results, setResults] = useState<SpotResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [publishedCategories, setPublishedCategories] = useState<Array<{ slug: string; name: string; description: string; icon_name?: string; theme?: string; badge?: string | null }>>([]);

  useEffect(() => {
    const destination = new URLSearchParams(window.location.search).get("destination");
    if (destination) setQuery(destination);
  }, []);

  useEffect(() => { fetch("/api/explore/categories").then((response) => response.ok ? response.json() : null).then((body) => { if (body?.categories?.length) setPublishedCategories(body.categories); }).catch(() => undefined); }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    const client = createBrowserClient();

    const now = new Date().toISOString();
    let q = client
      .from("parking_spots")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", now)
      .gt("departure_time", now)
      .order("departure_time", { ascending: true });

    if (vehicleType) {
      q = q.eq("vehicle_type", vehicleType);
    }
    if (relayMode) {
      q = q.eq("relay_mode", relayMode);
    }

    const { data } = await q;
    let spots = (data ?? []) as SpotResult[];

    if (query.trim()) {
      const lower = query.toLowerCase();
      spots = spots.filter(
        (s) =>
          s.address?.toLowerCase().includes(lower) ||
          s.tip_message?.toLowerCase().includes(lower),
      );
    }

    setResults(spots);
    setLoading(false);
  }, [query, vehicleType, relayMode]);

  useEffect(() => {
    if (searched) doSearch();
  }, [vehicleType, relayMode, doSearch, searched]);

  return (
    <AppPageShell title="Explore parking">
        <section className="mb-6 rounded-[1.75rem] bg-[var(--app-accent)] p-5 text-white shadow-xl shadow-blue-900/10 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">Parking Meeters directory</p>
          <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-[-0.05em] sm:text-4xl">Find the right kind of parking signal.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Explore live member coordination alongside clearly labeled paid, private, community, and local-information options.</p>
        </section>

        <section aria-labelledby="categories-heading" className="mb-7">
          <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e85d3f]">Explore by category</p><h2 id="categories-heading" className="mt-1 text-xl font-bold tracking-tight text-[#17211e]">A clearer way to start</h2></div><span className="hidden text-right text-[11px] font-semibold text-[#71807b] sm:block">Each category has its own rules</span></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
             {publishedCategories.length ? publishedCategories.map((category) => <ExploreCategoryCard key={category.slug} category={category} />) : CATEGORIES.map(({ label, detail, href, icon: Icon, tone, live, placeholder }) => (
               <a key={label} href={href} className="public-card group rounded-2xl border border-[#dce3df] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9db7ee] hover:shadow-md">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="mt-3 block text-sm font-black leading-tight text-[#17211e]">{label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-[#71807b]">{detail}</span>
                {live && <span className="mt-3 inline-flex rounded-full bg-[#fff0eb] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#d94f35]">Live</span>}
                {placeholder && <span className="mt-3 inline-flex rounded-full bg-[#f3f7f3] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#71807b]">Coming soon</span>}
              </a>
             ))}
          </div>
        </section>

        <div id="live-signals" className="mb-4 rounded-2xl border border-[#f1c6bb] bg-[#fff0eb] p-4 text-xs leading-5 text-[#8d3d2d]" role="note"><strong>Live departure signals are coordination only.</strong> Paid and private listings are separate from public-street coordination, and no listing guarantees public parking or reserves a space.</div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search address or tip..."
             className="app-input w-full rounded-xl border px-4 py-3 pl-10 text-sm outline-none transition"
            />
          </div>
           <button aria-label="Toggle search filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-11 rounded-xl border flex items-center justify-center transition ${
              showFilters
                 ? "bg-[var(--app-accent)] text-white border-[var(--app-accent)]"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600"
            }`}
          >
            <Filter size={16} />
          </button>
          <button
            onClick={doSearch}
              className="app-primary h-11 rounded-xl px-5 text-sm font-bold transition"
          >
            Search
          </button>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filters</span>
               <button onClick={() => { setVehicleType(""); setRelayMode(""); }} className="text-xs text-[var(--app-accent)] hover:text-[var(--app-accent-strong)] transition">
                Clear all
              </button>
            </div>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              {VEHICLE_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            <select
              value={relayMode}
              onChange={(e) => setRelayMode(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="">Any relay mode</option>
              <option value="imminent">Imminent (leaving now)</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <MapPin size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500 text-sm">No spots found</p>
            <p className="text-zinc-400 text-xs mt-1">Try adjusting your filters.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 font-medium mb-2">{results.length} spot{results.length !== 1 && "s"} available</p>
            {results.map((spot) => (
              <button
                key={spot.id}
                onClick={() => router.push(`/?spot=${spot.id}`)}
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-left hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-blue-500 shrink-0" />
                      <p className="text-sm font-bold truncate">{spot.address || "Unknown location"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {spot.vehicle_type && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                          <Car size={10} />{spot.vehicle_type}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        spot.relay_mode === "imminent"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      }`}>
                        {spot.relay_mode === "imminent" ? "Imminent" : "Scheduled"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock size={10} />
                      {new Date(spot.departure_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {spot.tip_message && (
                      <p className="text-[10px] text-zinc-400 mt-1 italic truncate max-w-[120px]">
                        &ldquo;{spot.tip_message}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
    </AppPageShell>
  );
}
