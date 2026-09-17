"use client";

import { ChevronLeft, Target, Building2, DollarSign, Users, TrendingUp, ArrowRight, CheckCircle2, Shield, Lightbulb, MapPin, Zap } from "lucide-react";
import Link from "next/link";

const sections = [
  {
    id: "executive-summary",
    title: "Executive Summary",
    icon: Target,
    content: "Parking Meeters Consulting is a specialized advisory practice focused on helping municipalities, universities, healthcare systems, and private operators optimize their parking assets through data-driven strategies, technology enablement, and operational excellence. Our mission: transform parking from a cost center into a strategic asset that serves communities, generates revenue, and supports sustainable mobility.",
    highlights: ["$2.5B+ in parking assets under advisory", "15-35% typical revenue improvement", "90%+ demand prediction accuracy", "50+ successful engagements"]
  },
  {
    id: "market-opportunity",
    title: "Market Opportunity",
    icon: MapPin,
    content: "The North American parking market exceeds $25B annually with 100M+ spaces. Yet 30-40% of spaces sit underutilized at any given time. Municipalities face aging infrastructure, budget constraints, and climate mandates. Private operators seek yield optimization. Universities and hospitals struggle with access equity. This fragmentation creates massive demand for specialized expertise.",
    metrics: ["$25B+ TAM in North America", "30-40% average underutilization", "500+ potential municipal clients", "200+ university/healthcare systems"]
  },
  {
    id: "service-lines",
    title: "Core Service Lines",
    icon: Building2,
    services: [
      { name: "Strategic Assessment & Roadmapping", description: "Comprehensive audits of parking operations, technology, policies, and financials. Deliverable: prioritized 3-5 year transformation roadmap with ROI modeling.", icon: Target },
      { name: "Demand Analytics & Dynamic Pricing", description: "Advanced modeling of temporal demand patterns, price elasticity, and cross-zone substitution. Real-time pricing engines with 90%+ forecast accuracy.", icon: TrendingUp },
      { name: "Technology Procurement & Integration", description: "Vendor-agnostic specification, RFP management, and integration oversight for PARCS, payment, sensor, enforcement, and customer-facing platforms.", icon: Zap },
      { name: "Operations Optimization", description: "Workforce planning, enforcement strategy, permit redesign, shared-use frameworks, and continuous improvement programs with KPI dashboards.", icon: Shield },
      { name: "Stakeholder Engagement & Change Management", description: "Community outreach, political navigation, communication campaigns, and capability building for sustainable organizational change.", icon: Users },
      { name: "Revenue Enhancement & Asset Monetization", description: "Dynamic rate structures, permit restructuring, advertising/sponsorship programs, EV charging monetization, and public-private partnership design.", icon: DollarSign }
    ]
  },
  {
    id: "differentiators",
    title: "Key Differentiators",
    icon: Lightbulb,
    differentiators: [
      "Parking-Exclusive Focus: We don't do general transportation consulting. Parking is our only practice.",
      "Proprietary Methodologies: PARKWISE Research Playbook and TIME Consulting Method are IP-protected frameworks.",
      "Technology-Agnostic: No vendor partnerships means unbiased recommendations aligned with client outcomes.",
      "Municipal Experience: Deep understanding of public sector procurement, politics, and equity requirements.",
      "Data-First Approach: Every recommendation backed by empirical analysis, not industry benchmarks.",
      "Implementation Partnership: We stay through deployment, calibration, and knowledge transfer—not just slide decks."
    ]
  },
  {
    id: "target-clients",
    title: "Target Client Segments",
    icon: Users,
    segments: [
      { name: "Mid-Size Municipalities (50K-500K pop)", desc: "Downtown revitalization, budget optimization, climate action plans", value: "$150K-$500K per engagement" },
      { name: "Universities & Medical Centers", desc: "Access equity, permit management, event operations, multi-modal integration", value: "$100K-$300K per engagement" },
      { name: "Private Parking Operators", desc: "Portfolio optimization, acquisition due diligence, technology modernization", value: "$200K-$1M+ per engagement" },
      { name: "Transit Agencies & Airports", desc: "Park-and-ride optimization, revenue diversification, customer experience", value: "$250K-$750K per engagement" },
      { name: "Real Estate Developers", desc: "Parking ratio reduction, shared-use modeling, entitlements support", value: "$75K-$250K per engagement" }
    ]
  },
  {
    id: "financial-model",
    title: "Financial Model & Growth Plan",
    icon: DollarSign,
    content: "Asset-light consulting model with 70%+ gross margins. Year 1: $1.2M revenue (4-6 engagements). Year 3: $4.5M revenue (12-15 engagements) with 25% EBITDA. Scaling via: (1) Productized assessments ($25K-$50K), (2) Retainer-based advisory ($15K-$30K/month), (3) Technology licensing (TIME Method software), (4) Training & certification programs.",
    projections: [
      { year: "Year 1", revenue: "$1.2M", engagements: "4-6", team: "3-4" },
      { year: "Year 2", revenue: "$2.8M", engagements: "8-10", team: "6-8" },
      { year: "Year 3", revenue: "$4.5M", engagements: "12-15", team: "10-12" },
      { year: "Year 5", revenue: "$10M+", engagements: "25+", team: "20+" }
    ]
  },
  {
    id: "go-to-market",
    title: "Go-to-Market Strategy",
    icon: TrendingUp,
    strategies: [
      "Thought Leadership: Publish PARKWISE research, speak at IPI/NAPA conferences, municipal webinars",
      "Strategic Partnerships: PARCS vendors, engineering firms, planning agencies, university centers",
      "Direct Outreach: Target 50 priority municipalities with customized opportunity assessments",
      "Referral Engine: Formal partner program with 20% referral fees, client success case studies",
      "Digital Presence: SEO-optimized content, LinkedIn thought leadership, email nurture sequences"
    ]
  }
];

export default function BusinessPlan() {
  return (
    <main className="marketing-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-10 flex items-center gap-4">
          <Link href="/admin/consultant" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85d3f]">Consultant Toolkit / Strategy</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-[#17211e]">Consulting Business Plan</h1>
          </div>
        </header>

        <div className="marketing-card p-6 mb-8">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Comprehensive business plan for Parking Meeters Consulting — a specialized advisory practice
            helping municipalities, universities, healthcare systems, and private operators optimize parking
            assets through data-driven strategies, proprietary methodologies, and implementation partnership.
          </p>
        </div>

        <div className="mt-10 marketing-card-highlight p-6 text-center" style={{background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'}}>
          <h3 className="text-2xl font-bold mb-3">Execute the Plan</h3>
          <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
            This business plan is a living document. Connect with the consulting team to discuss
            partnership opportunities, engagement models, or customized proposals for your organization.
          </p>
          <Link href="/admin/consultant" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition">
            Back to Consultant Hub <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}