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
    body: "Set when you'll leave and when you'll be back. The moment you depart, our detection sends a live departure signal to a matched driver for exactly that window.",
  },
  {
    icon: RefreshCcw,
    title: "The signal keeps working",
    body: "Every departure is a live signal. Commuter out in the morning, lunchtime visitor in the afternoon, evening guest at night — the technology keeps the space in motion.",
  },
  {
    icon: MapPin,
    title: "Belmont Shore first",
    body: "We're launching in the tightest test bed around: 2nd Street and the neighborhoods around it. If it works there, it works anywhere.",
  },
  {
    icon: Smartphone,
    title: "Arrival alerts",
    body: "No more guessing. When a spot is about to open near you, you get a real-time alert with directions to a space that's actually available.",
  },
  {
    icon: ShieldCheck,
    title: "Confirmed handoffs only",
    body: "Both sides confirm the handoff. Chats are ephemeral, matches are vetted by schedule + vehicle type, and safety tools are built in.",
  },
  {
    icon: Users,
    title: "A shared network, not a marketplace",
    body: "Members help each other. Every departure signal you share makes the neighborhood better for the next driver — and gets you more reliable parking in return.",
  },
];

export default function SolutionPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">The Solution</p>
        <h1 className="text-3xl md:text-5xl font-black">Stop circling. Start matching.</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-4">
          ParkingMeeters turns every departing driver into a live parking signal,
          and every arriving driver into a matched guest.
        </p>
      </div>

      {/* Two-column story */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-8">
          <p className="font-black text-xl mb-2">Someone is leaving…</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            They set their departure and return time. When they drive away, the
            app publishes a live &quot;spot opening&quot; signal to matched drivers —
            never exposing the address until it&apos;s confirmed.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-8">
          <p className="font-black text-xl mb-2">…and someone is arriving.</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            They&apos;re nearby and looking. We match them to the opening window by
            location, schedule, and vehicle type. Both confirm, both win, and the
            space keeps flowing.
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
            Sign up free <ArrowRight size={18} />
          </Link>
          <Link href="/marketing/how-it-works" className="px-6 py-3 rounded-xl font-bold border border-zinc-600 hover:border-white transition">
            How it works
          </Link>
        </div>
      </div>
    </main>
  );
}
