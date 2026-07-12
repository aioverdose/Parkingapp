"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Car, Bell, MessageCircle, Handshake, Search } from "lucide-react";

const STEPS = [
  {
    icon: MapPin,
    title: "Select a Spot on the Map",
    desc: "Open the app and tap any location on the map where you're parked. The marker will snap to the nearest street.",
  },
  {
    icon: Clock,
    title: "Set Your Schedule",
    desc: "Choose your departure time (when you're leaving) and return time (when you'll be back). Your spot is listed during that window.",
  },
  {
    icon: Car,
    title: "Choose Your Vehicle Type",
    desc: "Select your vehicle type so the system only matches you with compatible drivers.",
  },
  {
    icon: Search,
    title: "Get Matched",
    desc: "Our system automatically finds drivers looking for a spot in your area during your available window. You'll get a notification when a match is found.",
  },
  {
    icon: Handshake,
    title: "Confirm the Match",
    desc: "Both you and the seeker must confirm the match. You'll see each other's names and vehicle types before deciding.",
  },
  {
    icon: MessageCircle,
    title: "Chat to Coordinate",
    desc: "Once confirmed, a temporary chat opens so you can coordinate the handoff. Chats expire after 30 minutes for safety.",
  },
  {
    icon: Bell,
    title: "Get Reminders",
    desc: "You'll receive a notification when it's time to depart. The spot is then released to the matched driver.",
  },
];

export default function GettingStartedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/support")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Getting Started</h1>
        </div>

        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          SpotMatch connects drivers leaving a parking spot with those looking for one.
          Here&apos;s how it works.
        </p>

        <div className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <step.icon size={20} className="text-blue-600" />
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 my-2" />
                )}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="font-semibold text-sm mb-1">{i + 1}. {step.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tips section */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-5">
          <h2 className="font-bold text-sm mb-2 text-blue-800 dark:text-blue-300">Tips</h2>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
            <li>&bull; Set accurate departure and return times to avoid missed matches.</li>
            <li>&bull; Keep your vehicle type updated in Settings for better matches.</li>
            <li>&bull; Respond to match notifications promptly — matches expire after a few minutes.</li>
            <li>&bull; Use the chat to agree on a specific handoff spot near the pin.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
