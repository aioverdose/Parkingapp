"use client";

import { ChevronLeft, DollarSign, Calculator, BarChart3, Clock, Users, ArrowRight, CheckCircle2, Shield, CreditCard, FileText, Building2 } from "lucide-react";
import Link from "next/link";

const pricingTiers = [
  {
    name: "Strategic Assessment",
    price: "$25,000 - $50,000",
    period: "per engagement",
    description: "Comprehensive 4-6 week audit of parking operations, technology, policies, and financials. Includes stakeholder interviews, data analysis, gap assessment, and prioritized roadmap with ROI modeling.",
    deliverables: ["Operations Audit Report", "Technology Stack Assessment", "Financial Baseline & Benchmarking", "Gap Analysis Matrix", "3-Year Transformation Roadmap", "Executive Presentation"],
    idealFor: "Organizations seeking independent validation before major investments",
    color: "blue",
    icon: FileText
  },
  {
    name: "Dynamic Pricing Implementation",
    price: "$75,000 - $150,000",
    period: "per zone + monthly",
    description: "Design and deploy demand-based pricing across 1-5 zones. Includes elasticity modeling, rate structure design, technology integration, A/B testing, and 90-day calibration period.",
    deliverables: ["Elasticity Matrix by Segment", "Dynamic Rate Engine Configuration", "Technology Integration Spec", "A/B Test Results & Calibration", "Operations Dashboard", "Staff Training Materials"],
    idealFor: "Cities/operators ready to move beyond static rates",
    color: "purple",
    icon: Calculator
  },
  {
    name: "Full Transformation Partnership",
    price: "$200,000 - $500,000+",
    period: "12-24 months",
    description: "End-to-end delivery from assessment through operations handoff. Dedicated team with embedded analysts, project managers, and technical specialists. Weekly sprints, milestone gates, and continuous calibration.",
    deliverables: ["Complete Strategic Roadmap", "Phased Implementation Plans", "Vendor Selection & Contracts", "Change Management Program", "KPI Dashboards & Reporting", "Operations Handoff & Capability Transfer"],
    idealFor: "Organizations ready for comprehensive, multi-year transformation",
    color: "emerald",
    icon: Building2
  },
  {
    name: "Retainer Advisory",
    price: "$15,000 - $30,000",
    period: "per month",
    description: "Ongoing strategic guidance with monthly executive sessions, quarterly business reviews, priority access to research, and ad-hoc consulting hours. Minimum 6-month commitment.",
    deliverables: ["Monthly Strategy Sessions", "Quarterly Business Reviews", "Priority Research Access", "Ad-Hoc Consulting (20 hrs/mo)", "Vendor Evaluation Support", "Board/Commission Presentations"],
    idealFor: "Executives wanting continuous expert counsel without full engagement",
    color: "amber",
    icon: Users
  }
];

const addOnServices = [
  { name: "PARKWISE Research License", price: "$10,000/yr", description: "Annual license for proprietary research framework, templates, and benchmark database" },
  { name: "TIME Method Software", price: "$5,000/mo", description: "SaaS platform for temporal demand modeling, elasticity simulation, and dynamic pricing optimization" },
  { name: "Training & Certification", price: "$2,500/person", description: "3-day intensive workshop with certification in parking analytics, dynamic pricing, and stakeholder engagement" },
  { name: "Expert Witness / Litigation Support", price: "$500/hr", description: "Testimony, report preparation, and deposition support for parking-related disputes and valuations" },
  { name: "Community Engagement Workshops", price: "$15,000", description: "Facilitated public workshops, survey design, and communication materials for controversial parking changes" }
];

const valueMetrics = [
  { metric: "Revenue Increase", value: "15-35%", description: "Typical first-year improvement" },
  { metric: "Occupancy Optimization", value: "85-95%", description: "Target utilization range" },
  { metric: "ROI Payback", value: "6-18 months", description: "Average engagement payback period" },
  { metric: "Client Retention", value: "90%+", description: "Repeat engagement rate" },
  { metric: "Implementation Success", value: "95%+", description: "On-time, on-budget delivery" },
  { metric: "Stakeholder Satisfaction", value: ">4.5/5.0", description: "Post-engagement survey average" }
];

const engagementProcess = [
  { step: "01", title: "Discovery Call", duration: "30 min", description: "Understand challenges, objectives, and organizational context" },
  { step: "02", title: "Opportunity Assessment", duration: "1-2 weeks", description: "Rapid data review and customized proposal with scope & pricing" },
  { step: "03", title: "Engagement Kickoff", duration: "1 week", description: "Team alignment, data access, stakeholder mapping, communication plan" },
  { step: "04", title: "Execution Sprints", duration: "Per scope", description: "Weekly sprints with demos, milestone gates, and continuous calibration" },
  { step: "05", title: "Knowledge Transfer", duration: "2-4 weeks", description: "Documentation, training, operations handoff, and capability certification" },
  { step: "06", title: "Ongoing Partnership", duration: "Optional", description: "Retainer advisory, quarterly reviews, and continuous optimization" }
];

export default function PricingGuide() {
  return (
    <main className="marketing-page min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">
        <header className="mb-10 flex items-center gap-4">
          <Link href="/admin/consultant" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85d3f]">Consultant Toolkit / Commercial</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-[#17211e]">Consulting Pricing Guide</h1>
          </div>
        </header>

        <div className="marketing-card p-6 mb-8">
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Transparent, value-based pricing for parking consulting engagements. All prices are starting points —
            final scope and fees are customized based on organizational size, complexity, data readiness,
            and desired outcomes. We believe in ROI-first pricing: our fees should be a fraction of the value we create.
          </p>
        </div>

        <div className="mt-10 marketing-card-highlight p-6 text-center" style={{background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'}}>
          <h3 className="text-2xl font-bold mb-3">Request a Custom Proposal</h3>
          <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
            Every organization is different. Schedule a discovery call for a customized scope,
            timeline, and investment estimate tailored to your specific challenges and goals.
          </p>
          <Link href="/admin/consultant" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition">
            Back to Consultant Hub <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}