import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, Check, ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Community Guidelines | Parking Meeters" };

const rules = [
  "Follow all posted signs, permits, time limits, street-sweeping rules, and local laws.",
  "Never offer, request, or accept money, gifts, tips, or compensation for a public parking handoff.",
  "Do not block driveways, sidewalks, crosswalks, travel lanes, fire hydrants, or accessible spaces.",
  "Do not follow, threaten, harass, impersonate, or pressure another member.",
  "Keep exact addresses, access codes, phone numbers, and other sensitive information out of chat.",
  "Only share live location when you are stopped, have confirmed the match, and understand who can see it.",
  "Report unsafe, fraudulent, or misleading activity promptly and stop the interaction if you feel unsafe.",
];

export default function CommunityGuidelinesPage() {
  return <main className="min-h-screen bg-white px-5 py-8 text-zinc-900 sm:px-8 sm:py-12"><article className="mx-auto max-w-3xl"><Link href="/legal" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" />Legal Center</Link><header className="mt-12 border-b border-zinc-200 pb-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><ShieldAlert className="h-6 w-6" /></div><h1 className="mt-6 text-4xl font-bold tracking-tight">Community Guidelines</h1><p className="mt-3 text-sm text-zinc-500">Parking Meeters · Last updated: September 2026</p></header><div className="space-y-8 py-8 text-sm leading-7 text-zinc-700"><section><h2 className="text-xl font-bold text-zinc-900">A coordination tool, not a claim to the curb</h2><p className="mt-3">Parking Meeters helps members communicate about real departures and possible arrivals. A notification is not a reservation, guarantee, or ownership right. Public parking rules always control.</p></section><section><h2 className="text-xl font-bold text-zinc-900">Our expectations</h2><div className="mt-4 space-y-3">{rules.map((rule) => <p key={rule} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /><span>{rule}</span></p>)}</div></section><section><h2 className="text-xl font-bold text-zinc-900">Reporting and enforcement</h2><p className="mt-3">Use the in-app reporting and blocking tools when available. We may remove content, restrict matching, suspend accounts, or terminate access when activity is unsafe, deceptive, abusive, or unlawful. If there is immediate danger, contact local emergency services first.</p></section><section><h2 className="text-xl font-bold text-zinc-900">Contact</h2><p className="mt-3">Safety reports: <a href="mailto:abuse@parkingmeeters.com" className="text-blue-600 hover:underline">abuse@parkingmeeters.com</a>. Privacy questions are handled under the <Link href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>.</p></section></div></article></main>;
}
