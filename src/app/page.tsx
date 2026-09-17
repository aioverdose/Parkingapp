"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Handshake } from "lucide-react";
import { MembershipModal } from "@/components/MembershipModal";
import { SiteFooter } from "@/components/SiteFooter";

function Logo() {
  return (
    <div className="flex items-center gap-2.5 text-lg font-bold tracking-[-0.04em] text-[#13231d]">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2457d6] to-[#153ea8] text-white shadow-lg shadow-[#2457d6]/25">
        <Handshake className="h-4 w-4" />
      </span>
      Parking <span className="text-[#d94f35]">Meeters</span>
    </div>
  );
}

function RoutePreview({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[31rem]">
      <h2 className="text-4xl font-black tracking-[-0.05em] text-[#17233d]">How it Works</h2>
      <div className="mt-7 space-y-5">
        <div className="flex items-center gap-5"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e8efff] text-4xl font-black text-[#2457d6]">1</span><p className="text-lg font-black text-[#17233d]">Choose your vehicle type</p></div>
        <div className="flex items-center gap-5"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e8efff] text-4xl font-black text-[#2457d6]">2</span><p className="text-lg font-black text-[#17233d]">Enter your arrival and departure schedule</p></div>
        <div className="flex items-center gap-5"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e8efff] text-4xl font-black text-[#2457d6]">3</span><p className="text-lg font-black text-[#17233d]">Select your desired location</p></div>
        <div className="flex items-center gap-5"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e8efff] text-4xl font-black text-[#2457d6]">4</span><p className="text-lg font-black text-[#17233d]">Receive match notifications</p></div>
        <div className="flex items-center gap-5"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#e8efff] text-4xl font-black text-[#2457d6]">5</span><p className="text-lg font-black text-[#17233d]">You choose to connect</p></div>
      </div>
      <button type="button" onClick={onJoin} className="group mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#2457d6] to-[#153ea8] px-6 py-4 text-sm font-black text-white shadow-xl shadow-[#2457d6]/20 transition hover:-translate-y-0.5 hover:from-[#153ea8] hover:to-[#2457d6]">Join Parking Meeters <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [membershipOpen, setMembershipOpen] = useState(false);

  return (
    <main className="premium-shell premium-grid min-h-screen overflow-hidden bg-white text-[#13231d]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Logo />
        <div className="flex items-center gap-3">
         <Link href="/auth/login" className="rounded-full px-3 py-2 text-xs font-black text-[#71807b] transition hover:text-[#17211e]">Log in</Link>
         <button type="button" onClick={() => setMembershipOpen(true)} className="rounded-full border border-[#b7c9ee] bg-white/75 px-4 py-2 text-xs font-black text-[#153ea8] shadow-sm backdrop-blur transition hover:border-[#2457d6] hover:bg-[#f2f6ff] hover:text-[#2457d6]">Join the network</button>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-20">
        <div>
           <p className="mb-6 text-2xl font-black leading-tight tracking-[-0.04em] text-[#2457d6] sm:text-3xl">For people who live life on schedule</p>
           <h1 className="max-w-3xl text-5xl font-bold leading-[0.96] tracking-[-0.07em] sm:text-7xl lg:text-[5.7rem]">A Social Scheduling App for Drivers</h1>
        </div>
         <RoutePreview onJoin={() => setMembershipOpen(true)} />
      </section>

       <SiteFooter />

      <MembershipModal open={membershipOpen} onClose={() => setMembershipOpen(false)} onJoin={() => router.push("/auth/signup")} />
    </main>
  );
}
