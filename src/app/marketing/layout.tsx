import Link from "next/link";
import { CarFront, ArrowRight } from "lucide-react";

export const MARKETING_NAV = [
  { href: "/marketing", label: "The Problem" },
  { href: "/marketing/problem", label: "Why It's Broken" },
  { href: "/marketing/solution", label: "The Solution" },
  { href: "/marketing/how-it-works", label: "How It Works" },
  { href: "/marketing/business", label: "Business Plans" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="premium-shell premium-grid min-h-screen bg-white text-[#17233d]">
      <nav className="sticky top-0 z-40 border-b border-[#d9e2f4] bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/marketing" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2457d6] text-white shadow-md shadow-[#2457d6]/20">
              <CarFront size={18} />
            </span>
            <span>
               <span>Parking <span className="text-[#2457d6]">Meeters</span></span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {MARKETING_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm font-semibold text-[#52627d] transition-colors hover:text-[#2457d6]"
              >
                {n.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-semibold text-[#52627d] transition-colors hover:text-[#2457d6]"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-xl bg-[#2457d6] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#2457d6]/20 transition hover:-translate-y-0.5 hover:bg-[#153ea8]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer className="footer-glow mt-16 border-t border-[#d9e2f4]">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
             <p className="font-bold mb-2">Parking Meeters</p>
            <p className="text-sm text-zinc-500 max-w-xs">
               Connecting drivers that are coming and going — so arrivals can be
               better coordinated without promising a public parking space.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Marketing</p>
            {MARKETING_NAV.map((n) => (
               <Link key={n.href} href={n.href} className="block py-1 text-sm text-[#52627d] hover:text-[#2457d6]">
                {n.label}
              </Link>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Company</p>
             <Link href="/faq" className="block py-1 text-sm text-[#52627d] hover:text-[#2457d6]">FAQ</Link>
             <Link href="/privacy-policy" className="block py-1 text-sm text-[#52627d] hover:text-[#2457d6]">Privacy</Link>
             <Link href="/support" className="block py-1 text-sm text-[#52627d] hover:text-[#2457d6]">Support</Link>
          </div>
        </div>
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-zinc-400">
             <span>© {new Date().getFullYear()} Parking Meeters</span>
            <span className="flex items-center gap-1">
              Street parking, matched <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
