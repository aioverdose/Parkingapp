"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseClient";
import { Loader2, ArrowLeft, Share2, Copy, Users, Gift, Check } from "lucide-react";

interface InviteRecord {
  id: string;
  invitee_phone: string | null;
  invited_via: string;
  created_at: string;
}

export default function InvitePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.push("/"); return; }
      setUserId(session.user.id);

      const admin = (await import("@/lib/supabaseAdmin")).createAdminClient();
      const { data } = await admin
        .from("invite_conversions")
        .select("id, invitee_phone, invited_via, created_at")
        .eq("inviter_id", session.user.id)
        .order("created_at", { ascending: false });

      setInvites(data ?? []);
      setLoading(false);
    });
  }, [router, supabase]);

  const shareLink = `${window.location.origin}?ref=${userId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SpotMatch - Find Parking",
          text: "Join me on SpotMatch! We help each other find parking spots.",
          url: shareLink,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setShareError("Failed to share");
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-2xl font-bold">Invite a Friend</h1>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Gift size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="font-bold">Share &amp; Earn</p>
              <p className="text-xs text-zinc-500">Invite friends to join SpotMatch</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={handleShare}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Share
            </button>
            <button
              onClick={handleCopy}
              className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 transition flex items-center justify-center"
            >
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 flex items-center justify-between">
            <code className="text-xs text-zinc-500 truncate max-w-[80%]">{shareLink}</code>
            {copied && <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>}
          </div>

          {shareError && <p className="text-red-500 text-xs mt-2">{shareError}</p>}
        </div>

        <h2 className="font-bold text-lg mb-3">Your Invites ({invites.length})</h2>
        {invites.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <Users size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500 text-sm">No invites yet</p>
            <p className="text-zinc-400 text-xs mt-1">Share your link to invite friends.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map((inv) => (
              <div key={inv.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.invitee_phone || "Unknown"}</p>
                  <p className="text-xs text-zinc-500">via {inv.invited_via}</p>
                </div>
                <p className="text-[10px] text-zinc-400">{new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
