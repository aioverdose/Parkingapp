"use client";

import { Check, HeartHandshake, ShieldCheck, Users, X } from "lucide-react";

interface MembershipModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: () => void;
}

export function MembershipModal({ open, onClose, onJoin }: MembershipModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#17211e]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="membership-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-start justify-between bg-[#17211e] p-6 text-white sm:p-8">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e85d3f]"><HeartHandshake className="h-5 w-5" /></div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#f0c9a5]">Parking Meeters membership</p>
            <h2 id="membership-title" className="mt-2 text-2xl font-bold tracking-tight">Privacy by design.</h2>
            <p className="mt-2 text-sm leading-6 text-[#b7c3be]">Membership connects you to a local network of drivers who coordinate real parking departures.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close membership details" className="rounded-xl p-2 text-[#b7c3be] hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          <div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff0eb] text-[#e85d3f]"><Users className="h-4 w-4" /></span><div><p className="font-bold text-[#17211e]">Build your parking profile</p><p className="mt-1 text-sm leading-6 text-[#71807b]">Set your schedule, vehicle, and preferred three-block zone.</p></div></div>
          <div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f0e8] text-[#4b805d]"><Check className="h-4 w-4" /></span><div><p className="font-bold text-[#17211e]">Connect with local drivers</p><p className="mt-1 text-sm leading-6 text-[#71807b]">If there&apos;s a match, you will be notified and you choose to connect.</p></div></div>
          <div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff4dd] text-[#b8791f]"><ShieldCheck className="h-4 w-4" /></span><div><p className="font-bold text-[#17211e]">Keep coordination private</p><p className="mt-1 text-sm leading-6 text-[#71807b]">Your exact location stays private until a handoff is confirmed.</p></div></div>
          <button type="button" onClick={onJoin} className="flex w-full items-center justify-center rounded-2xl bg-[#e85d3f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#d94d31]">Join the network</button>
        </div>
      </section>
    </div>
  );
}
