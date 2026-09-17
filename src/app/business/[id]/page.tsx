"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_URL } from "@/lib/map";
import {
  MapPin, Users, Handshake, CalendarClock, Building2, Plus, Loader2,
} from "lucide-react";
import KnownDeparturesSection from "@/components/business/KnownDeparturesSection";

interface DashboardData {
  business: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    plan: string;
    status: string;
    operating_lat: number | null;
    operating_lng: number | null;
    logo_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
    app_name: string | null;
    welcome_message: string | null;
    house_notes: string | null;
    promo_text: string | null;
    info_link: string | null;
  };
  role: string;
  network_id: string | null;
  joinUrl: string;
  stats: {
    members: number;
    activeMembers: number;
    activeSpots: number;
    spotsToday: number;
    matchesToday: number;
    matchesTotal: number;
    departures7d: number;
    departures30d: number;
    newMembers7d: number;
    newMembers30d: number;
    offersSent: number;
    acceptedOffers: number;
    acceptanceRate: number;
    declinedOffers: number;
    expiredOffers: number;
    noShows: number;
    successfulHandoffs: number;
    qrJoins: number;
    linkJoins: number;
    qrVisits: number;
    pwaInstallsApprox: number;
    medianResponseMinutes: number | null;
  };
  recentSpots: any[];
  recentMatches: any[];
  members: any[];
}

export default function BusinessDashboard() {  const params = useParams<{ id: string }>();
  const id = params.id;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showPost, setShowPost] = useState(false);
  const [spotForm, setSpotForm] = useState({
    latitude: "",
    longitude: "",
    address: "",
    departure_time: "",
    return_time: "",
  });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);

  const belmontShoreCenter = { latitude: 33.7637, longitude: -118.1679 };
  const selectedLatitude = Number(spotForm.latitude);
  const selectedLongitude = Number(spotForm.longitude);
  const hasSelectedPin = Number.isFinite(selectedLatitude) && Number.isFinite(selectedLongitude) && Boolean(spotForm.latitude && spotForm.longitude);

  const [branding, setBranding] = useState({ app_name: "", primary_color: "", accent_color: "", logo_url: "", welcome_message: "", house_notes: "", promo_text: "", info_link: "" });
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Not authenticated");
        return;
      }
      const res = await fetch(`/api/businesses/${id}/dashboard`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Server error ${res.status}`);
        return;
      }
      const json = await res.json();
      setData(json);
      setBranding({
        app_name: json.business?.app_name ?? "",
        primary_color: json.business?.primary_color ?? "",
        accent_color: json.business?.accent_color ?? "",
        logo_url: json.business?.logo_url ?? "",
        welcome_message: json.business?.welcome_message ?? "",
        house_notes: json.business?.house_notes ?? "",
        promo_text: json.business?.promo_text ?? "",
        info_link: json.business?.info_link ?? "",
      });
      if (json.business?.operating_lat != null) {
        setSpotForm((f) => ({
          ...f,
          latitude: String(json.business.operating_lat),
          longitude: String(json.business.operating_lng),
        }));
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const postSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setPostError(null);
    setPostSuccess(null);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setPostError("Not authenticated");
        return;
      }
      const res = await fetch("/api/spots", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: id,
          latitude: Number(spotForm.latitude),
          longitude: Number(spotForm.longitude),
          address: spotForm.address || "Current Location",
          departure_time: new Date(spotForm.departure_time).toISOString(),
          return_time: spotForm.return_time ? new Date(spotForm.return_time).toISOString() : null,
          relay_mode: spotForm.return_time ? "scheduled" : "imminent",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPostError(body.error || `Server error ${res.status}`);
        return;
      }
      setPostSuccess("Spot posted. Matching will offer it to the best available driver in your network.");
      setShowPost(false);
      setSpotForm((f) => ({ ...f, address: "", departure_time: "", return_time: "" }));
      await load();
    } catch (err: any) {
      setPostError(err?.message || "Failed to post spot");
    } finally {
      setPosting(false);
    }
  };

  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setBrandingMsg(null);
    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setBrandingMsg("Not authenticated");
        return;
      }
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_name: branding.app_name || null,
          primary_color: branding.primary_color || null,
          accent_color: branding.accent_color || null,
          logo_url: branding.logo_url || null,
          welcome_message: branding.welcome_message || null,
          house_notes: branding.house_notes || null,
          promo_text: branding.promo_text || null,
          info_link: branding.info_link || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setBrandingMsg(body.error || `Server error ${res.status}`);
        return;
      }
      setBrandingMsg("Branding saved.");
      await load();
    } catch (err: any) {
      setBrandingMsg(err?.message || "Failed to save branding");
    } finally {
      setSavingBranding(false);
    }
  };

  if (loading) {
    return <div className="p-6 max-w-6xl mx-auto text-center py-12 text-zinc-500">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center py-12">
        <p className="text-red-500 font-bold mb-2">Error loading dashboard</p>
        <p className="text-sm text-zinc-500 mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    { label: "Active Spots", value: data.stats.activeSpots, icon: MapPin, color: "text-green-600 bg-green-100" },
    { label: "Active Members", value: data.stats.activeMembers, icon: Users, color: "text-blue-600 bg-blue-100" },
    { label: "Matches Today", value: data.stats.matchesToday, icon: Handshake, color: "text-amber-600 bg-amber-100" },
    { label: "Matches Total", value: data.stats.matchesTotal, icon: CalendarClock, color: "text-purple-600 bg-purple-100" },
    { label: "QR Joins", value: data.stats.qrJoins, icon: Users, color: "text-cyan-600 bg-cyan-100" },
    { label: "Handoffs", value: data.stats.successfulHandoffs, icon: Handshake, color: "text-emerald-600 bg-emerald-100" },
  ];

  const formatDate = (iso: string) => new Date(iso).toLocaleString();
  const formatMatchStatus = (match: any) => {
    const status = match.active_sessions?.[0]?.status || match.status;
    const labels: Record<string, string> = {
      offered: "Offered",
      confirmed_by_seeker: "Accepted",
      confirmed_by_owner: "Awaiting owner",
      confirmed: "Completed",
      completed: "Completed",
      no_show: "No-show",
      offer_expired: "Expired",
      offer_declined: "Declined",
      rejected: "Rejected",
      expired: "Expired",
    };
    return labels[status] || status;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{data.business.name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {data.business.description || "Business parking coordination"} · {data.role} · {data.business.plan}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPost(!showPost)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700"
        >
          <Plus size={16} /> Post a Spot
        </button>
      </div>

      <p className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
         Street rules, posted time limits, permits, and sweeping restrictions always apply. Parking Meeters coordinates departures; it does not sell, rent, or reserve public parking.
      </p>

      {postSuccess && (
        <div className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-xl p-4 text-sm mb-6">{postSuccess}</div>
      )}
      {postError && (
        <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl p-4 text-sm mb-6">{postError}</div>
      )}

      {showPost && (
        <form onSubmit={postSpot} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-6 space-y-4">
          <h2 className="font-bold">Post a spot to your network</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div><label className="text-xs font-medium text-zinc-500 block">Where is the departure? *</label><p className="text-xs text-zinc-400 mt-1">Tap the map to drop a pin in Belmont Shore.</p></div>
              <span className={`text-xs font-semibold ${hasSelectedPin ? "text-green-600" : "text-amber-600"}`}>{hasSelectedPin ? "Pin selected" : "Select a pin"}</span>
            </div>
            <div className="h-56 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <Map
                initialViewState={{ ...belmontShoreCenter, zoom: 14 }}
                mapStyle={MAP_STYLE_URL}
                onClick={(event) => setSpotForm((form) => ({ ...form, latitude: event.lngLat.lat.toFixed(6), longitude: event.lngLat.lng.toFixed(6) }))}
              >
                {hasSelectedPin && <Marker latitude={selectedLatitude} longitude={selectedLongitude} anchor="bottom"><MapPin className="fill-blue-600 text-white drop-shadow-md" size={32} /></Marker>}
              </Map>
            </div>
            <input required type="hidden" value={spotForm.latitude} readOnly />
            <input required type="hidden" value={spotForm.longitude} readOnly />
             {hasSelectedPin && <p className="text-xs text-zinc-500">Selected location saved privately</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-zinc-500 block mb-1">Address</label>
              <input
                value={spotForm.address}
                onChange={(e) => setSpotForm({ ...spotForm, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="Address or cross street"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Departure time *</label>
              <input
                required
                type="datetime-local"
                value={spotForm.departure_time}
                onChange={(e) => setSpotForm({ ...spotForm, departure_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Return time (for scheduled relays)</label>
              <input
                type="datetime-local"
                value={spotForm.return_time}
                onChange={(e) => setSpotForm({ ...spotForm, return_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
              />
            </div>
          </div>
          <button
            disabled={posting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {posting && <Loader2 size={16} className="animate-spin" />} Post Spot
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <KnownDeparturesSection businessId={id} isAdmin={data.role === "admin"} />

      {data.role === "admin" && (
        <form onSubmit={saveBranding} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8 space-y-4">
          <h2 className="font-bold">White-label Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">App name</label>
              <input
                value={branding.app_name}
                onChange={(e) => setBranding({ ...branding, app_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                 placeholder="Shown to your network instead of Parking Meeters"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["welcome_message", "house_notes", "promo_text"] as const).map((field) => (
                <div key={field} className="md:col-span-1">
                  <label className="text-xs font-medium text-zinc-500 block mb-1">{field === "welcome_message" ? "Welcome message" : field === "house_notes" ? "House notes" : "Promo / ad text"}</label>
                  <textarea value={branding[field]} onChange={(e) => setBranding({ ...branding, [field]: e.target.value })} maxLength={2000} rows={3} className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" placeholder="Plain text shown to your network" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Website / menu link</label>
                <input value={branding.info_link} onChange={(e) => setBranding({ ...branding, info_link: e.target.value })} type="url" className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" placeholder="https://..." />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Logo URL</label>
              <input
                value={branding.logo_url}
                onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Primary color (hex)</label>
              <input
                value={branding.primary_color}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="#3b82f6"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Accent color (hex)</label>
              <input
                value={branding.accent_color}
                onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                placeholder="#10b981"
              />
            </div>
          </div>
          {brandingMsg && <p className="text-sm text-zinc-500">{brandingMsg}</p>}
          <button
            disabled={savingBranding}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {savingBranding && <Loader2 size={16} className="animate-spin" />} Save Branding
          </button>
        </form>
      )}

      <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div><h2 className="font-bold">Grow your private network</h2><p className="text-sm text-zinc-500 mt-1">Share this link for heads-ups from your business network. It is not a parking reservation.</p></div>
          <div className="flex gap-2"><a href={`/business/${id}/print/table-tent`} target="_blank" className="px-3 py-2 rounded-xl border text-sm font-semibold">Table tent</a><a href={`/business/${id}/print/flyer`} target="_blank" className="px-3 py-2 rounded-xl border text-sm font-semibold">Flyer</a></div>
        </div>
        <div className="mt-4 flex flex-col md:flex-row gap-5 items-center">
          <img src={`https://quickchart.io/qr?size=240&text=${encodeURIComponent(data.joinUrl)}`} alt="Business join QR code" className="w-40 h-40 border rounded-xl" />
          <div className="min-w-0 flex-1 w-full"><p className="text-xs text-zinc-500 mb-1">Stable join link</p><code className="block bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-xs break-all">{data.joinUrl}</code><div className="flex gap-2 mt-3"><button onClick={() => navigator.clipboard.writeText(data.joinUrl)} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Copy link</button><a download={`${data.business.slug}-join-qr.png`} href={`https://quickchart.io/qr?size=1000&text=${encodeURIComponent(data.joinUrl)}`} className="px-3 py-2 rounded-xl border text-sm font-semibold">Download QR PNG</a></div><p className="text-xs text-zinc-500 mt-3">{data.stats.qrJoins} QR joins · {data.stats.linkJoins} link joins · {data.stats.qrVisits} QR scans recorded</p></div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[['Departures 7d', data.stats.departures7d], ['New members 7d', data.stats.newMembers7d], ['Offer acceptance', `${data.stats.acceptanceRate}%`], ['Declined / expired', `${data.stats.declinedOffers} / ${data.stats.expiredOffers}`], ['No-shows', data.stats.noShows], ['Handoffs', data.stats.successfulHandoffs], ['PWA installs (approx.)', data.stats.pwaInstallsApprox], ['Median response', data.stats.medianResponseMinutes == null ? 'Not enough data' : `${data.stats.medianResponseMinutes}m`], ['Departures 30d', data.stats.departures30d]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"><p className="text-lg font-bold">{value}</p><p className="text-xs text-zinc-500 mt-1">{label}</p></div>)}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold">Recent Spots</h2>
          </div>
          {data.recentSpots.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">No spots posted yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.recentSpots.map((spot) => (
                <div key={spot.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{spot.address}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{formatDate(spot.departure_time)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    spot.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {spot.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-bold">Recent Matches</h2>
          </div>
          {data.recentMatches.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">No matches yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.recentMatches.map((m) => (
                <div key={m.id} className="p-4">
                  <p className="text-sm font-medium">{m.parking_spots?.address || "Spot"}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                     {formatDate(m.created_at)} · {formatMatchStatus(m)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-8">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-bold">Members ({data.stats.members})</h2>
        </div>
        {data.members.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No members yet. Share the join link to add your team.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.members.map((m) => (
              <div key={m.user_id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.users?.name || m.users?.email || m.user_id}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{m.users?.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">{m.role}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                    m.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                  }`}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
