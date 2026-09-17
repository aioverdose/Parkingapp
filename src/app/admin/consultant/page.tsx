"use client";

import Link from "next/link";
import { BookOpen, Clock, Users, ArrowRight } from "lucide-react";

export default function ConsultantHub() {
  const cards = [
    {
      title: "PARKWISE Research Playbook",
      description: "Comprehensive research framework for parking market analysis, competitive intelligence, and data-driven decision making. Includes methodologies for demand modeling, supply mapping, and revenue optimization.",
      icon: BookOpen,
      href: "/admin/consultant/research-playbook",
      color: "bg-blue-600",
      iconBg: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
    },
    {
      title: "TIME Consulting Method",
      description: "Structured consulting methodology for time-based parking optimization. Covers temporal demand patterns, peak/off-peak strategies, and dynamic pricing frameworks for maximum utilization.",
      icon: Clock,
      href: "/admin/consultant/consulting-method",
      color: "bg-amber-600",
      iconBg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300"
    },
    {
      title: "Client Engagement Overview",
      description: "End-to-end client engagement framework from discovery through delivery. Includes stakeholder mapping, communication protocols, deliverable templates, and success metrics tracking.",
      icon: Users,
      href: "/admin/consultant/client-engagement",
      color: "bg-emerald-600",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300"
    }
  ];

  return (
    <main className="marketing-page min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85d3f]">Consultant Toolkit</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black text-[#17211e]">Parking Consultant Resources</h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Strategic frameworks and methodologies for parking optimization consulting engagements.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="marketing-card group p-6 transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <div
                className={"w-12 h-12 rounded-xl flex items-center justify-center mb-4 " + card.iconBg}
              >
                <card.icon size={24} className="text-[inherit]" />
              </div>
              <h3 className="text-xl font-bold text-[#17211e] mb-2 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                {card.description}
              </p>
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all">
                Open <ArrowRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}