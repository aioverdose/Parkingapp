import Link from "next/link";
import {
  Timer,
  Fuel,
  MapPinned,
  Wallet,
  HeartPulse,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

const COSTS = [
  {
    icon: Timer,
    title: "Wasted time",
    body: "Drivers spend an average of 20 minutes circling before parking — more at peak hours on busy corridors like Belmont Shore's 2nd Street.",
  },
  {
    icon: Fuel,
    title: "Wasted fuel & emissions",
    body: "Idling and re-routing to find a space produces unnecessary CO₂ and burns gas. Parking searches are a top cause of urban congestion in blocks.",
  },
  {
    icon: Wallet,
    title: "Real money",
    body: "Add tickets, meters, and time. The national average cost of parking search is about $345 per driver per year.",
  },
  {
    icon: ShoppingBag,
    title: "Lost retail",
    body: "When shoppers can't park, they skip the errand. Merchants on dense corridors lose sales every time a visitor gives up and leaves.",
  },
  {
    icon: HeartPulse,
    title: "Stress & road rage",
    body: "Circling creates frustration, risky maneuvers, and last-second cutoffs — parking problems become safety problems.",
  },
  {
    icon: MapPinned,
    title: "Spaces that sit empty",
    body: "The cruel irony: in neighborhoods that feel 'full', the same spots stand empty for hours once their driver departs.",
  },
];

export default function ProblemPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-16">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Why It&apos;s Broken</p>
        <h1 className="text-3xl md:text-5xl font-black">Parking is a matching problem, not a scarcity problem</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-4">
          The supply of parking changes constantly. The demand does too. Nobody
          is matching the two — so everyone pays the price of the mismatch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COSTS.map((c) => (
          <div
            key={c.title}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-4">
              <c.icon size={20} />
            </div>
            <p className="font-bold mb-1">{c.title}</p>
            <p className="text-sm text-zinc-500 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-blue-600 text-white p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black">Sound familiar? You&apos;re not imagining it.</h2>
          <p className="text-blue-100 mt-2 max-w-xl">
            Every city block is a miniature supply-and-demand market with no market
            maker. We&apos;re building the market maker.
          </p>
        </div>
        <Link
          href="/marketing/solution"
          className="flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shrink-0"
        >
          See our solution <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
