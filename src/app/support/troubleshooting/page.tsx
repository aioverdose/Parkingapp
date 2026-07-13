"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Bell, MessageCircle, Phone, Navigation, RefreshCw, Smartphone, Globe, Mail } from "lucide-react";

const ISSUES = [
  {
    icon: MapPin,
    title: "Map not loading or showing blank",
    desc: "Make sure you have a stable internet connection. Try refreshing the page. If the issue persists, your browser may need WebGL enabled — check your browser settings and ensure hardware acceleration is turned on.",
  },
  {
    icon: Navigation,
    title: "GPS / Location not working",
    desc: "Ensure location services are enabled in your browser settings. On Chrome, go to Settings → Privacy and Security → Site Settings → Location and allow access for this site. On iOS Safari, go to Settings → Safari → Location and set to Allow.",
  },
  {
    icon: Bell,
    title: "Not receiving notifications",
    desc: "Check that your browser allows notifications for this site. On desktop, look for the bell icon in the address bar. On mobile, ensure the site is added to your home screen for reliable push notifications.",
  },
  {
    icon: MessageCircle,
    title: "Can't send or receive chat messages",
    desc: "Chats are ephemeral and expire 30 minutes after a match is confirmed. If the chat disappeared, the 30-minute window has closed. Both parties must confirm the match before chat becomes available.",
  },
  {
    icon: Phone,
    title: "Phone verification not working",
    desc: "If SMS doesn't arrive, try again after 60 seconds. Still stuck? The system has a dev-mode fallback that accepts any 6-digit code. If both methods fail, email support@spotmatch.app.",
  },
  {
    icon: RefreshCw,
    title: "Match not showing up",
    desc: "Matches are found automatically after you list your spot. The system runs every few minutes. If no match appears after 10 minutes, try removing and re-listing your spot with slightly adjusted times.",
  },
  {
    icon: Smartphone,
    title: "App feels slow or unresponsive",
    desc: "Try clearing your browser cache and refreshing. For mobile users, ensure you're on a stable WiFi or cellular connection. The map uses real-time data and may be slower on older devices.",
  },
  {
    icon: Globe,
    title: "Can't sign in or account issues",
    desc: 'Use the "Forgot Password" link to reset. If that doesn\'t work or your account seems locked, contact support@spotmatch.app from the email you registered with.',
  },
];

export default function TroubleshootingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/support")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Troubleshooting</h1>
        </div>

        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          Common issues and how to fix them. If you don&apos;t see your problem here, visit the{" "}
          <a href="/support" className="text-blue-600 hover:underline">Support Center</a> or{" "}
          <a href="/faq" className="text-blue-600 hover:underline">FAQ</a>.
        </p>

        <div className="flex flex-col gap-3">
          {ISSUES.map((issue) => (
            <div key={issue.title} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <issue.icon size={20} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1">{issue.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{issue.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="font-bold mb-2">Still having trouble?</h2>
          <p className="text-sm text-zinc-500 mb-4">
            If none of these solutions help, our support team can assist you directly.
          </p>
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
