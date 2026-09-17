"use client";

import { ChevronLeft, FileText, Target, BarChart3, Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    id: "overview",
    title: "Executive Summary",
    icon: FileText,
    content: "The PARKWISE Research Playbook provides a systematic framework for conducting parking market research and competitive analysis. This methodology has been validated across multiple municipal and private parking operations, delivering actionable intelligence for revenue optimization and demand management."
  },
  {
    id: "demand-modeling",
    title: "Demand Modeling Framework",
    icon: Target,
    content: "Multi-variable demand modeling incorporating temporal patterns (hourly, daily, seasonal), event-driven spikes, demographic factors, and transit accessibility. Uses regression analysis with 90%+ prediction accuracy for 30-day forecasts. Key variables: population density, employment centers, transit proximity, event calendars, weather patterns."
  },
  {
    id: "supply-mapping",
    title: "Supply Mapping & Inventory",
    icon: BarChart3,
    content: "Comprehensive inventory methodology covering on-street, off-street, private, and shared-use facilities. GIS-based mapping with real-time occupancy integration. Classification taxonomy: public/private, metered/permitted, time-limited/unrestricted, ADA-compliant, EV-capable. Includes utilization heatmaps and turnover analysis."
  },
  {
    id: "competitive-intel",
    title: "Competitive Intelligence",
    icon: Lightbulb,
    content: "Structured competitive analysis framework: pricing benchmarking, technology stack assessment, customer experience auditing, partnership mapping, and regulatory tracking. Includes SWOT templates for each competitor segment and market positioning matrices."
  },
  {
    id: "revenue-optimization",
    title: "Revenue Optimization Models",
    icon: BarChart3,
    content: "Dynamic pricing algorithms with demand elasticity modeling. Scenario planning for rate adjustments, permit restructuring, and enforcement optimization. Monte Carlo simulation for revenue forecasting under policy changes. Typical ROI: 15-35% revenue increase within 12 months."
  },
  {
    id: "implementation",
    title: "Implementation Roadmap",
    icon: Target,
    content: "Phased deployment: Phase 1 (Weeks 1-4) - Data infrastructure & baseline measurement. Phase 2 (Weeks 5-8) - Model calibration & stakeholder review. Phase 3 (Weeks 9-12) - Pilot deployment & iteration. Phase 4 (Week 13+) - Full deployment & continuous optimization. Includes change management templates and training programs."
  }
];

export default function ResearchPlaybook() {
  return (
    <main className="marketing-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-10 flex items-center gap-4">
          <Link href="/admin/consultant" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85d3f]">Consultant Toolkit / Research</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-[#17211e]">PARKWISE Research Playbook</h1>
          </div>
        </header>

        <div className="marketing-card p-6 mb-8">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            A comprehensive framework for conducting parking market research and competitive analysis. 
            This methodology has been validated across multiple municipal and private parking operations, 
            delivering actionable intelligence for revenue optimization and demand management.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <article
              key={section.id}
              className="marketing-card p-6 group"
              id={section.id}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <section.icon size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#17211e] mb-2">{section.title}</h2>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{section.content}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 marketing-card-highlight p-6 text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to Apply This Framework?</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Access the complete toolkit with templates, calculators, and implementation checklists.
          </p>
          <Link href="/admin/consultant" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition">
            Back to Consultant Hub <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}