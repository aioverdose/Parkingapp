"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Shield, User, Loader2, Search } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("users").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setUsers((data ?? []) as UserProfile[]);
      setLoading(false);
    });
  }, []);

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

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

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
        {filtered.map((u) => (
          <div key={u.id} className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold shrink-0">
              {(u.name ?? u.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{u.name ?? "Unnamed"}</span>
                {u.role === "admin" && <Shield size={14} className="text-amber-500" />}
                {u.role === "moderator" && <Shield size={14} className="text-blue-500" />}
              </div>
              <p className="text-xs text-zinc-500 truncate">{u.email}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {u.vehicle_type ?? "No vehicle"} &middot; Role: {u.role}
              </p>
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
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-zinc-500 py-10">No users found</p>
        )}
      </div>
    </div>
  );
}
