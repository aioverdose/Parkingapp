"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, User, Key, Phone, Trash2, Mail, Bell, Shield } from "lucide-react";

const TOPICS = [
  {
    icon: User,
    title: "Edit Your Profile",
    desc: "Go to Profile → tap your name or vehicle type to edit. Changes save automatically.",
  },
  {
    icon: Key,
    title: "Change Your Password",
    desc: 'Use the "Forgot Password" link on the login screen. A reset link will be sent to your email.',
  },
  {
    icon: Phone,
    title: "Phone Verification",
    desc: "Verify your phone number from Settings. You'll receive a 6-digit code via SMS. If SMS fails, a dev-mode fallback accepts any 6-digit code.",
  },
  {
    icon: Bell,
    title: "Notification Preferences",
    desc: "Match alerts and reminders are sent automatically. To adjust, visit Settings → Notifications.",
  },
  {
    icon: Mail,
    title: "Change Your Email",
    desc: "Email changes must be done through your Supabase Auth account. Contact support@spotmatch.app for assistance.",
  },
  {
    icon: Trash2,
    title: "Delete Your Account",
    desc: "To delete your account and all associated data, email privacy@spotmatch.app from your registered email. Processing takes up to 48 hours.",
  },
];

export default function AccountPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/support")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Account Management</h1>
        </div>

        <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
          Manage your SpotMatch account settings, security, and personal information.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {TOPICS.map((topic) => (
            <div key={topic.title} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <topic.icon size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1">{topic.title}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{topic.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 flex items-start gap-3">
          <Shield size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            For security-related requests or account recovery, always email us directly at{" "}
            <a href="mailto:support@spotmatch.app" className="underline font-medium">support@spotmatch.app</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
