import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, BookOpen, ChevronRight, Gavel, HelpCircle, LifeBuoy } from "lucide-react";

export const metadata: Metadata = { title: "Resources | Parking Meeters" };

const resources = [
  [BookOpen, "Courses and safety education", "Learn the handoff protocol, location-sharing basics, and safer arrival habits.", "/learn"],
  [Gavel, "Parking laws and rules", "Official references for Long Beach parking, California rules, and accessible parking.", "/laws"],
  [LifeBuoy, "Support center", "Get help with your account, matching, notifications, GPS, and reporting.", "/support"],
  [HelpCircle, "Frequently asked questions", "Quick answers about matches, chats, cancellations, and privacy.", "/faq"],
];

export default function ResourcesPage() {
  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-8 text-[#17211e] sm:px-8 sm:py-12"><div className="mx-auto max-w-4xl"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#e85d3f] hover:underline"><ArrowLeft className="h-4 w-4" />Back to Parking Meeters</Link><header className="mt-14"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e85d3f]">Parking Meeters library</p><h1 className="mt-3 text-5xl font-bold tracking-[-0.05em]">Useful before you hit the curb.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[#71807b]">Guides and references to help you coordinate responsibly, understand the rules, and get more from your parking profile.</p></header><div className="mt-10 grid gap-4 sm:grid-cols-2">{resources.map(([Icon, title, description, href]) => <Link key={href as string} href={href as string} className="rounded-3xl border border-[#dce3df] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0eb] text-[#e85d3f]"><Icon className="h-5 w-5" /></span><h2 className="mt-7 text-xl font-bold">{title as string}</h2><p className="mt-2 text-sm leading-6 text-[#71807b]">{description as string}</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[#e85d3f]">Open resource <ChevronRight className="h-4 w-4" /></span></Link>)}</div></div></main>;
}
