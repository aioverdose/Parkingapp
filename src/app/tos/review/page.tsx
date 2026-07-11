"use client";

import { useState, useEffect } from "react";
import { acceptUpdatedTos, checkTosAcceptance } from "@/actions/tos";
import { TOS_CONTENT, TOS_VERSION } from "@/lib/tos";
import { createBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function TOSReviewPage() {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push("/");
        return;
      }
      setUserId(session.user.id);
    });
  }, [router, supabase]);

  const handleAccept = async () => {
    if (!checked || !userId) return;
    setLoading(true);
    setError(null);

    const result = await acceptUpdatedTos(userId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <h1 className="text-xl font-bold">Terms of Service Updated</h1>
        <p className="text-sm text-zinc-500">Version {TOS_VERSION} &middot; Please review and accept</p>
      </header>
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
        <div className="flex-1 max-h-[60vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-900">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {TOS_CONTENT}
          </pre>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            I agree to the Terms of Service (v{TOS_VERSION})
          </span>
        </label>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={!checked || loading}
          className="w-full h-14 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold text-lg disabled:cursor-not-allowed transition"
        >
          {loading ? "Saving..." : "Accept & Continue"}
        </button>
      </div>
    </div>
  );
}
