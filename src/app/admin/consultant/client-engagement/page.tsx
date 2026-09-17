"use client";

import { ChevronLeft, Users, Handshake, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ClientEngagement() {
  return (
    <main className="marketing-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-10 flex items-center gap-4">
          <Link href="/admin/consultant" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85d3f]">Consultant Toolkit / Engagement</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-[#17211e]">Client Engagement Overview</h1>
          </div>
        </header>

        <div className="marketing-card p-6 mb-8">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            End-to-end client engagement framework from discovery through delivery. Three engagement models
            tailored to organizational readiness and risk tolerance.
          </p>
        </div>

        <div className="mt-10 marketing-card-highlight p-6 text-center">
          <h3 className="text-2xl font-bold mb-3">Start Your Engagement</h3>
          <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
            Schedule a discovery call to assess fit and define your engagement model.
          </p>
          <Link href="/admin/consultant" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition">
            Back to Consultant Hub <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}