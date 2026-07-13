"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Shield, MessageCircle, User, Wrench, HelpCircle, ChevronDown, ChevronUp, Mail, ExternalLink } from "lucide-react";

const CATEGORIES = [
  {
    icon: BookOpen,
    title: "Getting Started",
    desc: "Learn how to use SpotMatch — list your spot, find a match, and more.",
    href: "/support/getting-started",
  },
  {
    icon: MessageCircle,
    title: "Matching & Chats",
    desc: "How matching works, confirming matches, and using ephemeral chat.",
    href: "/support/getting-started#matching",
  },
  {
    icon: Shield,
    title: "Safety & Reporting",
    desc: "Safety guidelines and how to report issues or inappropriate behavior.",
    href: "/support/reporting",
  },
  {
    icon: User,
    title: "Account Management",
    desc: "Manage your profile, change password, delete account, and more.",
    href: "/support/account",
  },
  {
    icon: Wrench,
    title: "Troubleshooting",
    desc: "Fix common issues with matching, notifications, login, and GPS.",
    href: "/support/troubleshooting",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    desc: "Frequently asked questions about SpotMatch.",
    href: "/faq",
  },
];

const QUICK_TOPICS = [
  {
    q: "How do I list my parking spot?",
    a: "Tap the map to select your spot location, then set your departure and return times. The system will match you with drivers looking for a spot during those hours.",
  },
  {
    q: "How does the matching work?",
    a: "Our system matches based on location proximity, schedule overlap, and vehicle type. Both parties must confirm the match for it to go through.",
  },
  {
    q: "What happens after I confirm a match?",
    a: "Once both parties confirm, a temporary chat opens so you can coordinate the handoff. The chat auto-expires after 30 minutes for privacy.",
  },
  {
    q: "Can I cancel a match?",
    a: "Yes. Either party can cancel a pending match before it's confirmed. Once confirmed, cancelling may affect your reliability score.",
  },
];

export default function SupportPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Support Center</h1>
        </div>

        {/* Categories */}
        <div className="grid gap-3 mb-8">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.href}
              href={cat.href}
              className="flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <cat.icon size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm group-hover:text-blue-600 transition">{cat.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{cat.desc}</p>
              </div>
              <ExternalLink size={18} className="text-zinc-300 group-hover:text-blue-500 shrink-0 transition" />
            </a>
          ))}
        </div>

        {/* Quick topics */}
        <h2 className="text-lg font-bold mb-3">Quick Topics</h2>
        <div className="flex flex-col gap-2 mb-8">
          {QUICK_TOPICS.map((topic, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-sm">{topic.q}</span>
                {openIndex === i ? (
                  <ChevronUp size={18} className="text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-zinc-400 shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{topic.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="font-bold mb-2">Still need help?</h2>
          <p className="text-sm text-zinc-500 mb-4">Contact our support team and we&apos;ll get back to you.</p>
          <a
            href="mailto:support@spotmatch.app"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            <Mail size={16} />
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
