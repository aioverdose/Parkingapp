import Link from "next/link";
import {
  MapPinned,
  CalendarClock,
  BellRing,
  Handshake,
  ArrowRight,
  Car,
  KeyRound,
} from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: Car,
    title: "Mark your spot",
    body: "Tap the map, drop a pin where you're parked, and tell us when you'll leave and when you'll be back. Our arrival and departure detection takes it from there.",
  },
  {
    step: "02",
    icon: CalendarClock,
    title: "Publish your departure",
    body: "When you leave, the app knows. A live departure signal is sent to compatible drivers, matched to the exact window you'll be gone.",
  },
  {
    step: "03",
    icon: BellRing,
    title: "Get matched to arrivals",
    body: "Looking for a spot nearby? We ping you the moment one opens within your search area, schedule, and vehicle type.",
  },
  {
    step: "04",
    icon: Handshake,
    title: "Confirm the handoff",
    body: "Both parties confirm. You get directions, a temporary chat to coordinate, and a verified handoff — no guessing, no circling.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">How It Works</p>
        <h1 className="text-3xl md:text-5xl font-black">Coming and going, made to meet</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-4">
          Four steps between &quot;no parking anywhere&quot; and &quot;a spot is waiting for you.&quot;
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {STEPS.map((s) => (
          <div
            key={s.step}
            className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 overflow-hidden"
          >
            <span className="absolute -top-2 -right-2 text-7xl font-black text-zinc-100 dark:text-zinc-800 select-none">
              {s.step}
            </span>
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-4">
                <s.icon size={22} />
              </div>
              <p className="font-bold text-lg mb-1">{s.title}</p>
              <p className="text-sm text-zinc-500 leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <div>
            <p className="font-bold">The 30-minute handoff</p>
            <p className="text-xs text-zinc-500">Safety by design</p>
          </div>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          <li className="flex items-start gap-2">
            <ArrowRight size={16} className="mt-0.5 text-blue-600 shrink-0" />
            Matches are shown only after both sides confirm.
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight size={16} className="mt-0.5 text-blue-600 shrink-0" />
            Chat is ephemeral and expires after 30 minutes.
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight size={16} className="mt-0.5 text-blue-600 shrink-0" />
            Vehicle type + schedule compatibility built into matching.
          </li>
          <li className="flex items-start gap-2">
            <ArrowRight size={16} className="mt-0.5 text-blue-600 shrink-0" />
            Flag &amp; report tools protect every member.
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-center">
        <Link
          href="/auth/signup"
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition"
        >
          <MapPinned size={18} /> Start in Belmont Shore <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
