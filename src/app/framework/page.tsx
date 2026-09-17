import type { Metadata } from "next";
import { DocCard, DocLink, DocNotice, DocSection, PublicDocShell } from "@/components/PublicDocShell";

export const metadata: Metadata = { title: "Municipal Compliance Framework | Parking Meeters", description: "The operating principles Parking Meeters uses for information-only parking coordination." };

const principles = [
  ["Information only", "Signals and schedules help people coordinate; they do not create a right to occupy a space."],
  ["No transaction for spots", "No reservation, auction, sale, ownership claim, or payment exchange for a public parking space."],
  ["Transparent revenue", "Membership and advertising revenue should be described clearly and kept separate from curb access or match priority."],
  ["Open-data reciprocity", "Where appropriate, useful aggregated learnings can support public planning while respecting privacy, licensing, and source terms."],
  ["Rules and access", "The service does not circumvent meters, permits, time limits, closures, enforcement, accessible parking rules, or street-sweeping restrictions."],
  ["Safety and accessibility", "Design and education prioritize public, lawful handoffs, readable information, accessibility, and respectful conduct."],
  ["Local development", "Local businesses can share relevant information or advertise without purchasing parking control or preferential access."],
  ["Proactive engagement", "We aim to communicate with cities and stakeholders before pilots, and to respond to official feedback or concerns."],
];

export default function FrameworkPage() {
  return <PublicDocShell title="Municipal Compliance Framework" eyebrow="Public commitments" intro="A plain-language summary of the guardrails for information-only parking coordination and local partnerships.">
    <DocNotice tone="amber"><strong>Informational, not legal advice.</strong> This framework is a product and operating summary, not a legal opinion or a statement that any particular deployment complies with every rule. Review the <DocLink href="/legal">Legal Center</DocLink> and consult qualified local counsel and public agencies for location-specific questions.</DocNotice>
    <div className="grid gap-4 sm:grid-cols-2">{principles.map(([title, text]) => <DocCard key={title} title={title}>{text}</DocCard>)}</div>
    <DocSection title="Reference data and OpenStreetMap"><p>Map and reference data can be incomplete, delayed, differently licensed, or wrong at a particular location. OSM and other reference sources help orient users; they do not replace posted signs, official city data, permits, or on-site judgment. We should preserve attribution and follow each source&apos;s terms.</p></DocSection>
    <DocSection title="How this informs operations"><p>Product language should say “potential match,” “signal,” or “coordination,” never “reserved” or “guaranteed.” Public agencies and users remain the source of truth for rules, safety, accessibility, and lawful use of the street.</p></DocSection>
  </PublicDocShell>;
}
