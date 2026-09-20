"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Map, { Marker } from "react-map-gl/maplibre";
import type { MapMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { CalendarClock, Car, Check, Clock3, MapPin, Plus, Save, Search, Trash2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "@/lib/map";
import { VEHICLE_TYPES } from "@/lib/vehicle-types";
import { NotificationConsent } from "@/components/NotificationConsent";

type Time = { hour: string; minute: string; ampm: "AM" | "PM" };
type AdditionalSchedule = { id: number; label: string; lat: number; lng: number; departure: Time; arrival: Time; days: number[] };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const defaultTime = (hour: string, ampm: "AM" | "PM"): Time => ({ hour, minute: "00", ampm });

function to24h(time: Time) {
  let hour = Number(time.hour);
  if (time.ampm === "AM" && hour === 12) hour = 0;
  if (time.ampm === "PM" && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${time.minute}`;
}

function TimeSelect({ label, value, onChange }: { label: string; value: Time; onChange: (value: Time) => void }) {
  return <label className="block text-xs font-bold text-[#71807b]">{label}<span className="mt-1 flex items-center gap-1"><select value={value.hour} onChange={(e) => onChange({ ...value, hour: e.target.value })} className="app-input min-w-0 flex-1 rounded-xl border px-2 py-3 text-sm"><option value="12">12</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select><b>:</b><select value={value.minute} onChange={(e) => onChange({ ...value, minute: e.target.value })} className="app-input w-20 rounded-xl border px-2 py-3 text-sm"><option>00</option><option>15</option><option>30</option><option>45</option></select><select value={value.ampm} onChange={(e) => onChange({ ...value, ampm: e.target.value as "AM" | "PM" })} className="app-input w-20 rounded-xl border px-2 py-3 text-sm"><option>AM</option><option>PM</option></select></span></label>;
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [vehicleType, setVehicleType] = useState<string>(VEHICLE_TYPES[0]?.value ?? "sedan");
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<Array<{ display_name: string; lat: number; lon: number }>>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [primaryDeparture, setPrimaryDeparture] = useState(defaultTime("5", "PM"));
  const [primaryArrival, setPrimaryArrival] = useState(defaultTime("8", "AM"));
  const [primaryDays, setPrimaryDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [additional, setAdditional] = useState<AdditionalSchedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [matchingStatus, setMatchingStatus] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showNotificationConsent, setShowNotificationConsent] = useState(false);

  const toggleDay = (days: number[], day: number) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort();
  const addSchedule = () => setAdditional((items) => [...items, { id: Date.now(), label: "", lat: pin?.latitude ?? viewState.latitude, lng: pin?.longitude ?? viewState.longitude, departure: defaultTime("5", "PM"), arrival: defaultTime("8", "AM"), days: [1, 2, 3, 4, 5] }]);

  const searchAddress = async () => {
    if (addressQuery.trim().length < 3) return;
    setSearchingAddress(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(addressQuery)}`, { headers: { Authorization: `Bearer ${token ?? ""}` } });
      const data = await response.json();
      setAddressResults(data.results ?? []);
    } finally { setSearchingAddress(false); }
  };

  const selectAddress = (result: { display_name: string; lat: number; lon: number }) => {
    setAddress(result.display_name);
    setAddressQuery(result.display_name);
    setAddressResults([]);
    setPin({ latitude: result.lat, longitude: result.lon });
    setViewState((current) => ({ ...current, latitude: result.lat, longitude: result.lon, zoom: 15 }));
  };

  const selectMapPoint = async (event: MapMouseEvent) => {
    const nextPin = { latitude: event.lngLat.lat, longitude: event.lngLat.lng };
    setPin(nextPin);
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const response = await fetch(`/api/geocode/search?lat=${nextPin.latitude}&lng=${nextPin.longitude}`, { headers: { Authorization: `Bearer ${token ?? ""}` } });
    const data = await response.json();
    setAddress(data.results?.[0]?.display_name ?? "Selected map area");
    setAddressQuery(data.results?.[0]?.display_name ?? "Selected map area");
  };

  const save = async () => {
    if (!pin) { setMessage("Drop a pin for your primary three-block area before saving."); return; }
    if (primaryDays.length === 0) { setMessage("Choose at least one day for your primary schedule."); return; }
    setSaving(true); setMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Please log in again.");
      const profileResponse = await fetch("/api/profile/schedule", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ vehicle_type: vehicleType, schedule_arrival: to24h(primaryArrival), schedule_departure: to24h(primaryDeparture), schedule_days: primaryDays }) });
      if (!profileResponse.ok) throw new Error("Your profile details could not be synchronized.");
      const primaryResponse = await fetch("/api/parking-spots/save", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...pin, label: "Primary commute area" }) });
      if (!primaryResponse.ok) throw new Error("Your primary area could not be saved.");
      const primaryScheduleResponse = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ latitude: pin.latitude, longitude: pin.longitude, label: "Primary commute area", days_of_week: primaryDays, departure_time: to24h(primaryDeparture), return_time: to24h(primaryArrival), vehicle_type: vehicleType }) });
      if (!primaryScheduleResponse.ok) throw new Error("Your primary schedule could not be saved.");
      for (const schedule of additional) {
        if (!schedule.label.trim() || schedule.days.length === 0) continue;
        const response = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ latitude: schedule.lat, longitude: schedule.lng, label: schedule.label.trim(), days_of_week: schedule.days, departure_time: to24h(schedule.departure), return_time: to24h(schedule.arrival) }) });
        if (!response.ok) throw new Error("An additional schedule could not be saved.");
      }
       setMatchingStatus(null);
      setSaved(true);
      setShowNotificationConsent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save profile setup.");
    } finally { setSaving(false); }
  };

  if (saved) return <main className="premium-shell premium-grid flex min-h-screen items-center px-5 py-10 text-[#17211e] sm:px-8"><div className="mx-auto w-full max-w-xl text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#e6f0e8] text-[#4b805d]"><Check className="h-10 w-10" /></div><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Profile saved</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em]">We&apos;ll watch for a fit.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#71807b]">Your vehicle, area, and schedule are saved. We&apos;ll use them to look for compatible coordination opportunities and notify you when a match is found.</p>{matchingStatus && <p className="mt-4 rounded-2xl border border-[#ead9b5] bg-[#fff9e9] p-4 text-sm font-semibold text-[#80651f]">{matchingStatus}</p>}<button type="button" onClick={() => router.replace("/profile")} className="mt-8 h-12 w-full rounded-2xl bg-[#e85d3f] text-sm font-black text-white">Continue to profile</button><button type="button" onClick={() => router.replace("/profile/schedules")} className="mt-3 h-12 w-full rounded-2xl border border-[#dce3df] bg-white text-sm font-black text-[#17211e]">Open schedule planner</button><NotificationConsent open={showNotificationConsent} onDismiss={() => setShowNotificationConsent(false)} /></div></main>;

  return <main className="premium-shell premium-grid min-h-screen px-4 py-6 text-[#17211e] sm:px-8 sm:py-10"><div className="mx-auto max-w-3xl"><header className="mb-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Profile setup</p><h1 className="mt-2 text-4xl font-bold tracking-[-0.05em]">Build your parking rhythm.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#71807b]">Choose a vehicle, set your primary three-block area, and tell us when you usually arrive and leave. These are coordination preferences, not a reservation.</p></header>
    <section className="app-card p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0eb] text-[#e85d3f]"><Car className="h-4 w-4" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#71807b]">Step 1</p><h2 className="text-xl font-bold">Your vehicle</h2></div></div><label className="block text-xs font-bold text-[#71807b]">Vehicle type<select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="app-input mt-1 w-full rounded-xl border px-3 py-3 text-sm"><option value="">Select vehicle type</option>{VEHICLE_TYPES.map((vehicle) => <option key={vehicle.value} value={vehicle.value}>{vehicle.label}</option>)}</select></label></section>
    <section className="app-card mt-4 overflow-hidden p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f0e8] text-[#4b805d]"><MapPin className="h-4 w-4" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#71807b]">Step 2</p><h2 className="text-xl font-bold">Primary parking area</h2></div></div><p className="mb-3 text-sm text-[#71807b]">Search for an address or click the map. We store coordinates for matching, but show you the physical address.</p><div className="relative mb-3 flex gap-2"><input value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchAddress(); } }} placeholder="Search a street address" className="app-input min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none" /><button type="button" onClick={() => void searchAddress()} disabled={searchingAddress} className="app-primary rounded-xl px-4"><Search className="h-4 w-4" /></button>{addressResults.length > 0 && <div className="absolute left-0 right-12 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[#dce3df] bg-white shadow-xl">{addressResults.map((result) => <button type="button" key={`${result.lat}-${result.lon}`} onClick={() => selectAddress(result)} className="block w-full border-b border-[#edf0ee] px-4 py-3 text-left text-xs text-[#17211e] last:border-0 hover:bg-[#fff0eb]">{result.display_name}</button>)}</div>}</div><div className="h-[22rem] overflow-hidden rounded-2xl"><Map {...viewState} onMove={(event) => setViewState(event.viewState)} onClick={(event: MapMouseEvent) => void selectMapPoint(event)} mapStyle={MAP_STYLE_URL} style={{ width: "100%", height: "100%" }}>{pin && <Marker latitude={pin.latitude} longitude={pin.longitude} anchor="bottom"><MapPin className="fill-[#e85d3f] text-[#e85d3f]" size={34} /></Marker>}</Map></div>{pin ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#4b805d]"><Check className="h-4 w-4" /> {address || "Primary area selected"}</p> : <p className="mt-3 text-center text-xs text-[#71807b]">Search an address or click the map to set your primary area.</p>}</section>
    <section className="app-card mt-4 p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0eb] text-[#e85d3f]"><Clock3 className="h-4 w-4" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#71807b]">Step 3</p><h2 className="text-xl font-bold">Primary schedule</h2></div></div><div className="grid gap-4 sm:grid-cols-2"><TimeSelect label="Typical arrival" value={primaryArrival} onChange={setPrimaryArrival} /><TimeSelect label="Typical departure" value={primaryDeparture} onChange={setPrimaryDeparture} /></div><div className="mt-5"><p className="text-xs font-bold text-[#71807b]">Days you usually need parking</p><div className="mt-2 grid grid-cols-7 gap-1">{DAYS.map((day, index) => <button key={day} type="button" onClick={() => setPrimaryDays((days) => toggleDay(days, index))} className={`rounded-xl py-2 text-xs font-bold ${primaryDays.includes(index) ? "bg-[#17211e] text-white" : "bg-[#f6f8f6] text-[#71807b]"}`}>{day}</button>)}</div></div></section>
    <section className="app-card mt-4 p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f0e8] text-[#4b805d]"><CalendarClock className="h-4 w-4" /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#71807b]">Step 4</p><h2 className="text-xl font-bold">Additional schedules</h2></div></div><button type="button" onClick={addSchedule} className="flex items-center gap-1 rounded-xl border border-[#dce3df] px-3 py-2 text-xs font-bold text-[#17211e]"><Plus className="h-4 w-4" /> Add</button></div><p className="mt-3 text-sm text-[#71807b]">Add another neighborhood or recurring schedule for a different routine. These are signals for coordination, not reserved spaces.</p><div className="mt-5 space-y-4">{additional.map((schedule) => <div key={schedule.id} className="rounded-2xl border border-[#dce3df] bg-[#f6f8f6] p-4"><div className="flex items-center gap-2"><input value={schedule.label} onChange={(e) => setAdditional((items) => items.map((item) => item.id === schedule.id ? { ...item, label: e.target.value } : item))} placeholder="Schedule name, e.g. Work" className="app-input min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm" /><button type="button" onClick={() => setAdditional((items) => items.filter((item) => item.id !== schedule.id))} className="rounded-xl p-2 text-[#71807b] hover:text-[#e85d3f]" aria-label="Remove schedule"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><TimeSelect label="Arrival" value={schedule.arrival} onChange={(value) => setAdditional((items) => items.map((item) => item.id === schedule.id ? { ...item, arrival: value } : item))} /><TimeSelect label="Departure" value={schedule.departure} onChange={(value) => setAdditional((items) => items.map((item) => item.id === schedule.id ? { ...item, departure: value } : item))} /></div><div className="mt-3 grid grid-cols-7 gap-1">{DAYS.map((day, index) => <button key={day} type="button" onClick={() => setAdditional((items) => items.map((item) => item.id === schedule.id ? { ...item, days: toggleDay(item.days, index) } : item))} className={`rounded-lg py-1.5 text-[10px] font-bold ${schedule.days.includes(index) ? "bg-[#17211e] text-white" : "bg-white text-[#71807b]"}`}>{day}</button>)}</div></div>)}</div></section>
    {message && <p className="mt-4 rounded-2xl border border-[#f1c6bb] bg-[#fff0eb] p-4 text-sm font-semibold text-[#b9432b]">{message}</p>}<button type="button" onClick={() => void save()} disabled={saving} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e85d3f] text-sm font-black text-white shadow-lg shadow-[#e85d3f]/20 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving profile..." : "Save profile and start matching"}</button></div></main>;
}
