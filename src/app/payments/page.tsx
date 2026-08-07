"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, Coins, CreditCard, ExternalLink, Building2, ArrowRight } from "lucide-react";

interface Purchase {
  id: string;
  amount: number;
  credits: number;
  status: string;
  created_at: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }

      const admin = (await import("@/lib/supabaseAdmin")).createAdminClient();
      const { data: user } = await admin.from("users").select("match_credits").eq("id", session.user.id).single();
      setCredits(user?.match_credits ?? 0);

      const res = await fetch("/api/payments/history", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPurchases(data.purchases ?? []);
      }
      setLoading(false);
    });
  }, [router, supabase]);

  const buyCredits = async () => {
    setPurchasing(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/purchase/credits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: 1 }),
    });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
    }
    setPurchasing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-lg mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Payment History</h1>
        </div>

        <a
          href="/business"
          className="block bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Building2 size={24} />
            </div>
            <div className="flex-1">
              <p className="font-black">SpotMatch for Businesses</p>
              <p className="text-sm text-blue-100 mt-0.5">
                Subscription-based parking coordination for restaurants, bars, and operators. Set up your network to get started.
              </p>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold bg-white/15 rounded-full px-4 py-2 shrink-0">
              Get started <ArrowRight size={16} />
            </span>
          </div>
        </a>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Coins size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Optional: Match Credits</p>
              <p className="text-3xl font-bold">{credits}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Optional bonus credits for the consumer side. Business subscriptions are the primary way to pay for SpotMatch.
          </p>
          <button
            onClick={buyCredits}
            disabled={purchasing}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white font-bold text-sm transition flex items-center justify-center gap-2"
          >
            {purchasing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <><CreditCard size={16} /> Buy 1 Credit &mdash; $5.99</>
            )}
          </button>
        </div>

        <h2 className="font-bold text-lg mb-3">Credit Purchase History</h2>
        {purchases.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <CreditCard size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500 text-sm">No purchases yet</p>
            <p className="text-zinc-400 text-xs mt-1">Match credits are optional — most coordination happens through business subscriptions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {purchases.map((p) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {(p.amount / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      p.status === "complete" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {p.status === "complete" ? "Completed" : p.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.credits} credit{p.credits !== 1 && "s"} &middot; {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <ExternalLink size={14} className="text-zinc-300" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
