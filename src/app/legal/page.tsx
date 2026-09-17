import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, ChevronRight, FileText, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = { title: "Legal Center | Parking Meeters" };

const documents = [
  { href: "/privacy-policy", title: "Privacy Policy", description: "What information we collect, why we use it, and your privacy choices.", icon: ShieldCheck },
  { href: "/tos/latest", title: "Terms of Service", description: "The rules for using Parking Meeters and coordinating parking handoffs.", icon: FileText },
  { href: "/legal/community-guidelines", title: "Community Guidelines", description: "Safety and conduct expectations for every member interaction.", icon: Users },
  { href: "/legal/cookies", title: "Cookies and Technologies", description: "How cookies, local storage, analytics, and notifications may work in the app.", icon: ShieldCheck },
];

export default function LegalCenterPage() {
  return <main className="min-h-screen bg-zinc-50 px-5 py-8 text-zinc-900 sm:px-8 sm:py-12"><div className="mx-auto max-w-3xl"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" />Back to Parking Meeters</Link><p className="mt-12 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Parking Meeters</p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Legal Center</h1><p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">Clear information about how Parking Meeters works, what it collects, and how members are expected to treat one another.</p><div className="mt-10 space-y-3">{documents.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm leading-6 text-zinc-500">{description}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" /></Link>)}</div><div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><strong>Before launch:</strong> have these drafts reviewed for your legal entity, operating locations, age requirements, governing law, retention practices, and any state or local privacy obligations.</div><p className="mt-8 text-sm text-zinc-500">Legal questions: <a href="mailto:legal@parkingmeeters.com" className="font-semibold text-blue-600 hover:underline">legal@parkingmeeters.com</a></p></div></main>;
}
