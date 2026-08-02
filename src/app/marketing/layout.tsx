import Link from "next/link";
import { CarFront, ArrowRight } from "lucide-react";

export const MARKETING_NAV = [
  { href: "/marketing", label: "The Problem" },
  { href: "/marketing/problem", label: "Why It's Broken" },
  { href: "/marketing/solution", label: "The Solution" },
  { href: "/marketing/how-it-works", label: "How It Works" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/marketing" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <CarFront size={18} />
            </span>
            <span>
              <span className="text-blue-600">Parking</span>
              <span>Meeters</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {MARKETING_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-600 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <p className="font-bold mb-2">ParkingMeeters</p>
            <p className="text-sm text-zinc-500 max-w-xs">
              Connecting drivers that are coming and going — so every spot gets
              used, and nobody circles the block.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Marketing</p>
            {MARKETING_NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block text-sm text-zinc-500 hover:text-blue-600 py-1">
                {n.label}
              </Link>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Company</p>
            <Link href="/faq" className="block text-sm text-zinc-500 hover:text-blue-600 py-1">FAQ</Link>
            <Link href="/privacy-policy" className="block text-sm text-zinc-500 hover:text-blue-600 py-1">Privacy</Link>
            <Link href="/support" className="block text-sm text-zinc-500 hover:text-blue-600 py-1">Support</Link>
          </div>
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-zinc-400">
            <span>© {new Date().getFullYear()} ParkingMeeters</span>
            <span className="flex items-center gap-1">
              Street parking, matched <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
