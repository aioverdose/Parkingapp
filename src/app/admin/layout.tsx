"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { LayoutDashboard, Megaphone, Users, AlertTriangle, Globe, Truck, ArrowLeft, Radar, FlaskConical, Bell, GitCompare, Share2, Brain, Clapperboard, Mic, Code2, MessageSquare, Palette, SlidersHorizontal, BookOpen, Briefcase } from "lucide-react";

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
      <div className="app-page flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-accent)] border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="app-page flex min-h-screen">
       <nav className="hidden w-64 flex-col gap-1 border-r border-[var(--app-border)] bg-white/90 p-4 shadow-[8px_0_30px_-28px_rgba(36,87,214,0.2)] backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-3 py-4 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-accent)] text-sm font-bold text-white shadow-md">P</div>
           <span className="font-bold">Parking Meeters Admin</span>
        </div>
         <a href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#164d3b] transition hover:bg-[#fff1eb] hover:text-[#b93d29]">
          <LayoutDashboard size={18} /> Dashboard
        </a>
         <a href="/admin/control-tower" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#164d3b] transition hover:bg-[#fff1eb] hover:text-[#b93d29]">
          <Radar size={18} /> Control Tower
        </a>
        <a href="/admin/agent" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Brain size={18} /> App Agent
        </a>
         <a href="/admin/development-agent" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
           <Code2 size={18} /> Development Agent
         </a>
         <Link href="/admin/parking-research" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"><Globe size={18} /> Parking Research</Link>
         <div className="mt-3 border-t border-[#dce3df] pt-3"><p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#71807b]">Data Operations</p>
          <Link href="/admin/osm-import" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#164d3b] hover:bg-[#fff1eb]"><Globe size={18} /> OpenStreetMap Parking Import</Link>
          <Link href="/admin/osm-import/jobs" className="block rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Import Jobs</Link>
          <Link href="/admin/osm-import/records" className="block rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Staged Parking Records</Link>
          <Link href="/admin/osm-import/published" className="block rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Published Parking Records</Link>
          <Link href="/admin/osm-import/attribution" className="block rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Source Data and Attribution</Link>
          <Link href="/admin/osm-import/settings" className="block rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Import Settings</Link>
          <Link href="/admin/osm-import/audit" className="block rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Import Audit Log</Link></div>
         <Link href="/admin/community" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"><Users size={18} /> Community</Link>
         <Link href="/admin/content-studio" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"><Palette size={18} /> Content Studio</Link>
        <a href="/admin/testing" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <FlaskConical size={18} /> Test Suite
        </a>
        <a href="/admin/ads" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Megaphone size={18} /> Ad Campaigns
        </a>
        <a href="/admin/video-creator" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Clapperboard size={18} /> AI Video Creator
        </a>
        <a href="/admin/voice-simulator" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <Mic size={18} /> Voice Simulator
        </a>
         <Link href="/admin/sms-test" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#164d3b] transition hover:bg-[#fff1eb] hover:text-[#b93d29]"><MessageSquare size={18} /> SMS Test</Link>
        <Link href="/admin/synthetic-users" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#17211e] transition hover:bg-[#fff0eb] hover:text-[#e85d3f]"><FlaskConical size={18} /> Synthetic Users</Link>
         <Link href="/admin/messenger" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#17211e] transition hover:bg-[#fff0eb] hover:text-[#e85d3f]"><MessageSquare size={18} /> Messenger</Link>
         <Link href="/admin/profile-design" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#17211e] transition hover:bg-[#fff0eb] hover:text-[#e85d3f]"><Palette size={18} /> Profile Design</Link>
          <Link href="/admin/clients" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#164d3b] hover:bg-[#fff1eb]"><Briefcase size={18} /> Client Files</Link>
          <div className="mt-3 border-t border-[#dce3df] pt-3"><p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#71807b]">Experience management</p>
          <Link href="/admin/experience" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-[#164d3b] hover:bg-[#fff1eb]"><SlidersHorizontal size={18} /> Overview</Link>
          <Link href="/admin/profile-configuration" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Profile configuration</Link>
          <Link href="/admin/profile-appearance" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Profile appearance</Link>
          <Link href="/admin/explore-categories" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Explore categories</Link>
          <Link href="/admin/category-images" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Category images</Link>
          <Link href="/admin/community-settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Community settings</Link>
          <Link href="/admin/privacy-defaults" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Privacy defaults</Link>
          <Link href="/admin/feature-flags" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Feature flags</Link>
          <Link href="/admin/audit-logs" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#17211e] hover:bg-[#fff1eb]">Audit logs</Link></div>
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
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <ArrowLeft size={18} /> Back to App
        </Link>
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
           <a href="/admin/development-agent" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Development Agent</a>
           <a href="/admin/parking-research" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Parking Research</a>
           <a href="/admin/osm-import" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">OSM Import</a>
           <a href="/admin/osm-import/jobs" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Import Jobs</a>
           <a href="/admin/osm-import/records" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Staged Records</a>
           <a href="/admin/community" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Community</a>
           <a href="/admin/content-studio" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Content Studio</a>
          <a href="/admin/ads" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Ads</a>
          <a href="/admin/video-creator" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Video Creator</a>
          <a href="/admin/voice-simulator" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Voice Simulator</a>
          <a href="/admin/sms-test" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">SMS Test</a>
          <a href="/admin/synthetic-users" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Synthetic Users</a>
            <a href="/admin/messenger" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Messenger</a>
           <a href="/admin/profile-design" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Profile Design</a>
           <a href="/admin/experience" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Experience</a>
          <a href="/marketing" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Marketing</a>
          <Link href="/" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-zinc-100">Back to app</Link>
        </nav>
      </details>

      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
