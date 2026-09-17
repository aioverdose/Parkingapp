import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, BriefcaseBusiness, Building2, Mail, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = { title: "Contact Parking Meeters" };

const departments = [
  [Users, "Member support", "Account help, matching, notifications, and general questions.", "support@parkingmeeters.com"],
  [ShieldCheck, "Safety and reports", "Report abuse, unsafe conduct, privacy concerns, or suspicious activity.", "abuse@parkingmeeters.com"],
  [Building2, "Business partnerships", "Business networks, pilots, community programs, and white-label coordination.", "partnerships@parkingmeeters.com"],
  [BriefcaseBusiness, "Legal and privacy", "Privacy requests, data deletion, legal notices, and security reports.", "legal@parkingmeeters.com"],
];

export default function ContactPage() {
  return <main className="public-shell min-h-screen bg-[var(--public-background)] px-5 py-8 text-[var(--public-ink)] sm:px-8 sm:py-12"><div className="mx-auto max-w-4xl"><Link href="/" className="public-back-link"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Parking Meeters</Link><header className="mt-14 max-w-2xl"><p className="public-eyebrow">We&apos;re here to help</p><h1 className="public-title mt-3">Find the right team.</h1><p className="public-intro mt-4">Choose a department and we&apos;ll route your question to the people best equipped to help.</p></header><div className="mt-10 grid gap-4 sm:grid-cols-2">{departments.map(([Icon, title, description, email]) => <article key={email as string} className="public-card rounded-3xl border bg-white p-6"><Icon className="h-6 w-6 text-[var(--public-accent)]" aria-hidden="true" /><h2 className="mt-6 text-xl font-bold">{title as string}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-[var(--public-muted)]">{description as string}</p><a href={`mailto:${email}`} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--public-accent)] hover:underline"><Mail className="h-4 w-4" aria-hidden="true" />{email as string}</a></article>)}</div><p className="mt-8 text-xs leading-5 text-[var(--public-muted)]">For immediate danger or a traffic emergency, contact local emergency services first. Parking Meeters is not an emergency response service.</p></div></main>;
}
