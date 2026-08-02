import Link from "next/link";
import {
  Clock,
  DollarSign,
  MapPinned,
  Car,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

interface Stat {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  label: string;
  detail: string;
  highlight?: boolean;
}

// Statistics shown on the landing page. Verify against the latest city studies
// before external distribution; edit the numbers here to update the page.
const NATIONWIDE_STATS: Stat[] = [
  {
    icon: Clock,
    value: "17 hrs",
    label: "spent searching every year",
    detail: "The average US driver burns 17 hours a year hunting for parking (INRIX).",
  },
  {
    icon: DollarSign,
    value: "$345",
    label: "lost per driver, per year",
    detail: "Time + fuel + emissions from circling the block adds up fast.",
  },
  {
    icon: AlertTriangle,
    value: "1 in 3",
    label: "drivers give up on busy streets",
    detail: "Frustrated drivers abandon errands when parking feels impossible.",
  },
];

const BELMONT_SHORE_STATS: Stat[] = [
  {
    icon: MapPinned,
    value: "~2,000",
    label: "street spaces in the business district",
    detail: "Belmont Shore's 2nd Street corridor competes for a finite set of curb spaces.",
    highlight: true,
  },
  {
    icon: TrendingUp,
    value: "90%",
    label: "peak occupancy on weekend evenings",
    detail: "At prime times, nearly every space is taken — and most sit empty the rest of the day.",
    highlight: true,
  },
  {
    icon: Clock,
    value: "15–20 min",
    label: "of circling during peak hours",
    detail: "Drivers loop the same blocks waiting for someone to leave.",
    highlight: true,
  },
  {
    icon: Car,
    value: "Hundreds",
    label: "of unused spots every workday",
    detail: "Commuters park and leave for hours, while visitors can't find anywhere to go.",
    highlight: true,
  },
];

export default function MarketingHomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold bg-blue-600/10 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1.5 mb-6">
            <MapPinned size={14} /> Belmont Shore, Long Beach · our launch neighborhood
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight max-w-3xl mx-auto">
            Parking isn&apos;t scarce. It&apos;s{" "}
            <span className="text-blue-600">mismatched</span>.
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mt-6">
            Millions of empty spaces sit idle while drivers circle the block.
            ParkingMeeters connects the people leaving a spot with the people
            arriving — so every space gets used.
          </p>
          <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              Start parking smarter <ArrowRight size={18} />
            </Link>
            <Link
              href="/marketing/solution"
              className="px-6 py-3 rounded-xl font-semibold border border-zinc-300 dark:border-zinc-700 hover:border-blue-600 hover:text-blue-600 transition"
            >
              See the solution
            </Link>
          </div>
        </div>
      </section>

      {/* Nationwide stats */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NATIONWIDE_STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4">
                <s.icon size={20} />
              </div>
              <p className="text-3xl font-black">{s.value}</p>
              <p className="text-sm font-medium text-zinc-500 mt-1">{s.label}</p>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Belmont Shore stats */}
      <section className="bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
              The Problem, Up Close
            </p>
            <h2 className="text-3xl md:text-4xl font-black">
              What parking looks like in Belmont Shore
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4">
              2nd Street is one of the most walkable retail corridors in Long
              Beach — and one of the hardest to park on. The numbers below show
              why &quot;find a spot&quot; is really a matching problem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BELMONT_SHORE_STATS.map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl border p-6 ${
                  s.highlight
                    ? "border-blue-300 dark:border-blue-700 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    s.highlight
                      ? "bg-white/15 text-white"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                  }`}
                >
                  <s.icon size={20} />
                </div>
                <p className={`text-3xl font-black ${s.highlight ? "" : ""}`}>{s.value}</p>
                <p className={`text-sm font-medium mt-1 ${s.highlight ? "text-blue-100" : "text-zinc-500"}`}>
                  {s.label}
                </p>
                <p className={`text-xs mt-2 leading-relaxed ${s.highlight ? "text-blue-50/90" : "text-zinc-400"}`}>
                  {s.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex-1">
              <p className="font-bold text-lg">The fix isn&apos;t more parking. It&apos;s smarter parking.</p>
              <p className="text-sm text-zinc-500 mt-1">
                When someone leaves their spot, someone else should already know about it. That&apos;s what we built.
              </p>
            </div>
            <Link
              href="/marketing/solution"
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shrink-0"
            >
              How we fix it <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
