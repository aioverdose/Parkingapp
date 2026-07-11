"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { ArrowLeft, Bell, CheckCheck, Loader2 } from "lucide-react";
import type { Database } from "@/lib/database.types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function NotificationsPage() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications((data ?? []) as Notification[]);
      setLoading(false);
    });
  }, [router]);

  const markAsRead = async (id: string) => {
    setMarking(id);
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setMarking(null);
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <Bell className="mx-auto mb-4 opacity-30" size={48} />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">Notifications will appear here when someone claims your spot or sends you a message.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 bg-white dark:bg-zinc-900 border rounded-2xl p-4 transition ${
                  n.read
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === "claim"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                    : n.type === "chat"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                    : n.type === "tip"
                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                }`}>
                  <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    disabled={marking === n.id}
                    className="shrink-0 p-2 text-zinc-400 hover:text-blue-600 transition"
                  >
                    {marking === n.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCheck size={16} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
