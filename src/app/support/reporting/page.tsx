"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Flag, AlertTriangle, Eye, Lock, Mail } from "lucide-react";

const GUIDELINES = [
  {
    icon: Shield,
    title: "Stay in Your Vehicle",
    desc: "During handoffs, remain in your vehicle. No need to get out — just pull in or out.",
  },
  {
    icon: Eye,
    title: "Meet in Public Areas",
    desc: "Only match in well-lit, public streets. Avoid alleys or private lots.",
  },
  {
    icon: Lock,
    title: "Keep Contact Private",
    desc: "Don't share phone numbers or personal contact info. All communication stays in the app's ephemeral chat.",
  },
  {
    icon: AlertTriangle,
    title: "Trust Your Instincts",
    desc: "If something feels off, decline the match. Your safety comes first.",
  },
];

const REPORT_REASONS = [
  "Inappropriate behavior or language",
  "Suspicious or fraudulent activity",
  "False spot listing",
  "No-show after confirmed match",
  "Harassment or threats",
  "Vehicle type mismatch",
];

export default function ReportingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/support")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Safety &amp; Reporting</h1>
        </div>

        {/* Safety Guidelines */}
        <h2 className="text-lg font-bold mb-3">Safety Guidelines</h2>
        <div className="grid gap-3 mb-8">
          {GUIDELINES.map((item) => (
            <div key={item.title} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <item.icon size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-0.5">{item.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reporting */}
        <h2 className="text-lg font-bold mb-3">How to Report</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Flag size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">In-App Flagging</p>
              <p className="text-xs text-zinc-500">Tap the flag icon on any match or chat to report</p>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            When you tap the flag button, you can select a reason:
          </p>
          <ul className="space-y-2 mb-4">
            {REPORT_REASONS.map((reason) => (
              <li key={reason} className="text-sm text-zinc-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
          <p className="text-sm text-zinc-500">
            Reports are reviewed by the admin team. Repeated violations may result in account suspension.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="font-bold mb-2">Contact Us</h2>
          <p className="text-sm text-zinc-500 mb-4">
            For urgent issues or if in-app reporting isn&apos;t working, email us directly.
          </p>
          <a
            href="mailto:support@spotmatch.app"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            <Mail size={16} />
            support@spotmatch.app
          </a>
        </div>
      </div>
    </div>
  );
}
