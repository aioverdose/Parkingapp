"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "What is SpotMatch?",
    a: "SpotMatch is a matching service that connects drivers with compatible parking spots. Set your location, schedule, and vehicle type, and we'll match you with the perfect spot.",
  },
  {
    q: "How do I list my parking spot?",
    a: "Tap the map to select your spot location, then set your departure time and return time. The system will match you with drivers looking for a spot during those hours.",
  },
  {
    q: "How does the matching work?",
    a: "Our system matches you based on three criteria: location proximity, schedule compatibility, and vehicle type. When a good match is found, both parties are notified and must confirm.",
  },
  {
    q: "What happens when I get a match?",
    a: "Both you and the matched driver receive a notification. Both parties must confirm the match for it to go through. Once confirmed, you can chat to coordinate the handoff.",
  },
  {
    q: "How do departure and return times work?",
    a: "Set when you'll depart and when you'll return. The system shows your spot as available during that window. Matches are based on overlapping availability.",
  },
  {
    q: "Can I cancel a match?",
    a: "Yes. Either party can cancel a pending match before it's confirmed. Once confirmed, cancelling may affect your reliability score.",
  },
  {
    q: "How does the ephemeral chat work?",
    a: "When you match with someone, a temporary chat opens so you can coordinate the spot handoff. Chats automatically expire after 30 minutes for safety and privacy.",
  },
  {
    q: "What are the safety guidelines?",
    a: "Meet in public areas, stay in your vehicle during handoff, and don't share personal contact info. Report any issues using the flag button.",
  },
  {
    q: "How do I reset my password?",
    a: "Use the 'Forgot Password' link on the login screen. You'll receive a password reset email from Supabase Auth.",
  },
  {
    q: "Is my data private?",
    a: "We only share your name and vehicle type with matched users. Your exact schedule is only visible to confirmed matches. See our Privacy Policy for details.",
  },
  {
    q: "How do I contact support?",
    a: "Report issues using the flag button. For other inquiries, contact us at privacy@spotmatch.app.",
  },
];

export default function FAQPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">FAQ</h1>
        </div>

        <div className="flex flex-col gap-2">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-sm flex items-center gap-3">
                  <HelpCircle size={16} className="text-blue-500 shrink-0" />
                  {faq.q}
                </span>
                {openIndex === i ? (
                  <ChevronUp size={18} className="text-zinc-400 shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-zinc-400 shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-9">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
