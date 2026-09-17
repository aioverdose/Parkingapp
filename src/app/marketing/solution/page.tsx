import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  MapPin,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: CalendarClock,
    title: "Departure & return matching",
    body: "Set when you'll leave and when you'll be back. The app can send a live departure signal to a compatible member for that estimated window.",
  },
  {
    icon: RefreshCcw,
    title: "The signal keeps working",
    body: "Every departure is a time-limited signal. Commuter out in the morning, lunchtime visitor in the afternoon, evening guest at night — members coordinate around changing conditions.",
  },
  {
    icon: MapPin,
    title: "Belmont Shore first",
    body: "We're launching in the tightest test bed around: 2nd Street and the neighborhoods around it. If it works there, it works anywhere.",
  },
  {
    icon: Smartphone,
    title: "Arrival alerts",
    body: "Reduce guesswork. When a departure signal appears near you, you can get an alert and directions while checking posted signs and current street conditions yourself.",
  },
  {
    icon: ShieldCheck,
    title: "Confirmed handoffs only",
    body: "Both sides can confirm they are coordinating. Chats are ephemeral, suggestions use schedule and vehicle compatibility, and safety tools are built in.",
  },
  {
    icon: Users,
    title: "A shared network, not a marketplace",
    body: "Members help each other. Every departure signal can make neighborhood arrivals easier, but no member is promised a space in return.",
  },
];

export default function SolutionPage() {
  return (
    <main className="public-shell min-h-screen max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">The Solution</p>
        <h1 className="text-3xl md:text-5xl font-black">Stop circling. Start matching.</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-4">
             ParkingMeeters turns departing drivers into live coordination signals,
             and helps arriving drivers make informed decisions.
        </p>
      </div>

      {/* Two-column story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-8">
          <p className="font-black text-xl mb-2">Someone is leaving…</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            They set their departure and return time. When they drive away, the
             app publishes a live &quot;departure window&quot; signal to compatible drivers —
             never promising that a public space will remain available.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-8">
          <p className="font-black text-xl mb-2">…and someone is arriving.</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
             They&apos;re nearby and looking. We suggest coordination based on location,
             schedule, and vehicle type. Both members decide whether to proceed,
             and public parking rules always control.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4">
              <f.icon size={20} />
            </div>
            <p className="font-bold mb-1">{f.title}</p>
            <p className="text-sm text-zinc-500 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-white p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black">Ready to stop circling?</h2>
          <p className="text-zinc-400 mt-2">Join the Belmont Shore launch and be the first to park smarter.</p>
        </div>
        <div className="flex gap-3 shrink-0 flex-wrap">
          <Link href="/auth/signup" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">
             Join a business pilot <ArrowRight size={18} />
          </Link>
          <Link href="/marketing/how-it-works" className="px-6 py-3 rounded-xl font-bold border border-zinc-600 hover:border-white transition">
            How it works
          </Link>
        </div>
      </div>
    </main>
  );
}
