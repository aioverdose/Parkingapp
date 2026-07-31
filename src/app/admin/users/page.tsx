"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Shield, User, Loader2, Search, LogOut, Wifi, WifiOff, Check } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  vehicle_type: string | null;
  role: string;
  created_at: string | null;
}

export default function AdminUsersPage() {
  const supabase = createBrowserClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [online, setOnline] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loggedOut, setLoggedOut] = useState<Record<string, boolean>>({});

  const loadOnline = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/api/admin/users/online", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setOnline(data.online ?? {});
    }
  }, [supabase]);

  useEffect(() => {
    supabase.from("users").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setUsers((data ?? []) as UserProfile[]);
      setLoading(false);
    });
    loadOnline();
    const interval = setInterval(loadOnline, 30_000);
    return () => clearInterval(interval);
  }, [supabase, loadOnline]);

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    await supabase.from("users").update({ role: newRole }).eq("id", userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  }

  async function signOutUser(userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`/api/admin/users/${userId}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      setLoggedOut((prev) => ({ ...prev, [userId]: true }));
      setOnline((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setTimeout(() => {
        setLoggedOut((prev) => ({ ...prev, [userId]: false }));
      }, 3000);
    }
  }

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  const onlineCount = Object.keys(online).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {onlineCount} online
        </span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((u) => {
          const isOnline = Boolean(online[u.id]);
          const lastSeen = online[u.id];
          return (
            <div key={u.id} className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                  {(u.name ?? u.email)[0].toUpperCase()}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{u.name ?? "Unnamed"}</span>
                  {u.role === "admin" && <Shield size={14} className="text-amber-500" />}
                  {u.role === "moderator" && <Shield size={14} className="text-blue-500" />}
                </div>
                <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-zinc-400">
                    {u.vehicle_type ?? "No vehicle"} &middot; Role: {u.role}
                  </p>
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Wifi size={10} /> Online
                      {lastSeen && (
                        <span className="text-zinc-400 font-normal">({new Date(lastSeen).toLocaleTimeString()})</span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                      <WifiOff size={10} /> Offline
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleRole(u.id, u.role)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  u.role === "admin"
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {u.role === "admin" ? "Demote" : "Make Admin"}
              </button>
              <button
                onClick={() => signOutUser(u.id)}
                disabled={loggedOut[u.id] || isOnline === false}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  loggedOut[u.id]
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : isOnline
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                }`}
                title={isOnline ? "Sign this user out" : "User is offline"}
              >
                {loggedOut[u.id] ? (
                  <span className="flex items-center gap-1"><Check size={12} /> Signed out</span>
                ) : (
                  <span className="flex items-center gap-1"><LogOut size={12} /> Log Out</span>
                )}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-10">No users found</p>
        )}
      </div>
    </div>
  );
}
