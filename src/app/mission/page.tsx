import type { Metadata } from "next";
import { DocCard, DocSection, PublicDocShell } from "@/components/PublicDocShell";

export const metadata: Metadata = { title: "Mission | Parking Meeters", description: "Why Parking Meeters exists and what its parking coordination network does and does not do." };

export default function MissionPage() {
  return <PublicDocShell title="Our mission" eyebrow="Parking Meeters" intro="Make everyday arrivals calmer by helping people coordinate around the timing of a departing driver and an arriving driver.">
    <DocSection title="The problem"><p>Drivers can spend too long circling, while a useful departure goes unnoticed. That creates stress, traffic, and avoidable pressure on neighborhood streets. The problem is often timing and communication, not a lack of information that belongs to one person.</p></DocSection>
    <DocSection title="A social scheduling network"><p>Members share a general location and a schedule. The service looks for a potential fit between a departure and an arrival, asks both people to accept, and opens a temporary conversation for coordination. It is a lightweight network of signals, not a promise that a space will be available.</p></DocSection>
    <div className="grid gap-4 sm:grid-cols-2"><DocCard title="What we are">An opt-in information and coordination service for drivers, local businesses, and neighborhoods. Membership can support community participation, operational tools, and clearer local resources.</DocCard><DocCard title="What we are not">We do not own public parking, control a curb, issue permits, reserve spaces, collect payment for spots, or guarantee an arrival outcome.</DocCard></div>
    <DocSection title="Membership and local advertising"><p>Membership may provide access to network features under the applicable terms. Local businesses may advertise or support neighborhood information through clearly identified placements. Advertising does not buy a parking right, improve a match outcome, or change street rules.</p></DocSection>
    <div className="rounded-2xl border-2 border-blue-700 bg-blue-700 p-5 text-sm leading-6 text-white"><strong>Important boundary:</strong> Parking Meeters provides information and coordination only. It is not parking ownership, a reservation system, a sale or auction of parking spaces, or a payment service for spots. Always follow posted signs, permits, enforcement instructions, and applicable law.</div>
  </PublicDocShell>;
}
