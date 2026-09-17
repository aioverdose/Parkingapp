import Link from "next/link";
import { Mail, MapPin, Zap } from "lucide-react";

const columns = [
  {
    title: "Support",
    links: [
      ["Support center", "/support"],
      ["Matching guide", "/support/matching"],
      ["Schedules guide", "/support/schedules"],
      ["Notifications guide", "/support/notifications"],
      ["Messaging guide", "/support/messaging"],
      ["Troubleshooting", "/support/troubleshooting"],
      ["Contact support", "/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Mission", "/mission"],
      ["Municipal framework", "/framework"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Legal & privacy",
    links: [
      ["Privacy policy", "/privacy-policy"],
      ["Terms", "/tos/latest"],
      ["Cookies", "/legal/cookies"],
      ["Community guidelines", "/legal/community-guidelines"],
      ["Safety / reporting", "/support/reporting"],
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-glow border-t border-[var(--border)] bg-[var(--accent-strong)] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_2.5fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.04em]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] shadow-lg shadow-black/20">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              Parking <span className="text-[#b9ccf7]">Meeters</span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/75">Schedule-based parking coordination for calmer arrivals and more considerate neighborhoods.</p>
            <div className="mt-6 space-y-3 text-xs text-white/75">
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#b9ccf7]" />Belmont Shore · Long Beach, California</p>
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#b9ccf7]" /><a href="mailto:support@parkingmeeters.com" className="hover:text-white">support@parkingmeeters.com</a></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#b9ccf7]">{column.title}</h2>
                <nav aria-label={`${column.title} links`} className="mt-4 space-y-3">
                  {column.links.map(([label, href]) => <Link key={href} href={href} className="block text-sm text-white/75 transition hover:translate-x-0.5 hover:text-white">{label}</Link>)}
                </nav>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 max-w-4xl border-t border-white/15 pt-6 text-xs leading-5 text-white/70">Parking Meeters does not own, rent, sell, or receive payment for parking spots. Information on this site is not a reservation or a guarantee.</p>
        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Parking Meeters. Built for better handoffs.</p>
          <p>Better parking together.</p>
        </div>
      </div>
    </footer>
  );
}
