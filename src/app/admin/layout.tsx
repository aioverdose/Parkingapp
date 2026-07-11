"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { LayoutDashboard, Megaphone, Users, AlertTriangle, Globe, Truck, ArrowLeft } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push("/");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (data?.role !== "admin" && data?.role !== "moderator") {
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
        <div className="flex-1" />
        <a href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
          <ArrowLeft size={18} /> Back to App
        </a>
      </nav>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex">
        <a href="/admin" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><LayoutDashboard size={20} />Dashboard</a>
        <a href="/admin/ads" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><Megaphone size={20} />Ads</a>
        <a href="/admin/users" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><Users size={20} />Users</a>
        <a href="/admin/flags" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><AlertTriangle size={20} />Flags</a>
        <a href="/admin/pilot-areas" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><Globe size={20} />Pilot</a>
        <a href="/admin/street-sweeping" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><Truck size={20} />Sweeping</a>
        <a href="/" className="flex-1 flex flex-col items-center py-3 text-xs text-zinc-500"><ArrowLeft size={20} />App</a>
      </div>

      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
    </div>
  );
}
