"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { LayoutDashboard, Megaphone, Users, AlertTriangle, Globe, Truck, ArrowLeft, Radar, FlaskConical, Bell, GitCompare, Share2, Brain } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push("/auth/login");
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (profile?.role !== "admin" && profile?.role !== "moderator") {
        router.push("/");
        return;
      }
      setAuthorized(true);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      <nav className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 gap-1">
        <div className="flex items-center gap-2 px-3 py-4 mb-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">P</div>
          <span className="font-bold">Admin Panel</span>
        </div>
        <a href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <LayoutDashboard size={18} /> Dashboard
        </a>
        <a href="/admin/control-tower" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Radar size={18} /> Control Tower
        </a>
        <a href="/admin/agent" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Brain size={18} /> App Agent
        </a>
        <a href="/admin/testing" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <FlaskConical size={18} /> Test Suite
        </a>
        <a href="/admin/ads" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Megaphone size={18} /> Ad Campaigns
        </a>
        <a href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Users size={18} /> Users
        </a>
        <a href="/admin/flags" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <AlertTriangle size={18} /> Flags
        </a>
        <a href="/admin/pilot-areas" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Globe size={18} /> Pilot Areas
        </a>
        <a href="/admin/street-sweeping" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Truck size={18} /> Street Sweeping
        </a>
        <a href="/admin/potential-matches" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <GitCompare size={18} /> Potential Matches
        </a>
        <a href="/admin/broadcast" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Bell size={18} /> Broadcast
        </a>
        <a href="/marketing" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Share2 size={18} /> Marketing
        </a>
        <div className="flex-1" />
        <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <ArrowLeft size={18} /> Back to App
        </a>
      </nav>

      {/* Mobile nav */}
      <details className="md:hidden fixed top-3 right-3 z-50">
        <summary className="cursor-pointer list-none rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg [&::-webkit-details-marker]:hidden">Admin menu</summary>
        <nav className="absolute right-0 top-12 grid w-64 grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
          <a href="/admin" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Dashboard</a>
          <a href="/admin/testing" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Testing</a>
          <a href="/admin/control-tower" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Control Tower</a>
          <a href="/admin/users" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Users</a>
          <a href="/admin/pilot-areas" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Pilot Areas</a>
          <a href="/admin/street-sweeping" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Sweeping</a>
          <a href="/admin/flags" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Flags</a>
          <a href="/admin/broadcast" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Broadcast</a>
          <a href="/admin/agent" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Agent</a>
          <a href="/admin/ads" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Ads</a>
          <a href="/marketing" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Marketing</a>
          <a href="/" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Back to app</a>
        </nav>
      </details>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
