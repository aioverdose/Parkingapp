"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { fetchStats } from "@/lib/api-client";

interface StatsDashboardProps {
  onClose: () => void;
  onPostSpot?: () => void;
}

export function StatsDashboard({ onClose, onPostSpot }: StatsDashboardProps) {
  const [metrics, setMetrics] = useState<Record<string, string | number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    const { data, error: fetchError } = await fetchStats();
    if (fetchError) {
      setError(fetchError);
    } else if (data) {
      setMetrics({ ...data });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-500 dark:border-zinc-400 mx-auto my-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 text-sm">Failed to load stats.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Spot Metrics
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(metrics ?? {}).map(([key, value]) => (
            <div
              key={key}
              className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center"
            >
              <span className="text-zinc-600 dark:text-zinc-400 text-sm capitalize">{key.replace(/_/g, " ")}</span>
              <p className="text-zinc-900 dark:text-zinc-100 text-2xl font-bold mt-1">{String(value ?? "—")}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 space-y-3">
<Button
            onClick={() => { onPostSpot?.(); onClose(); }}
            className="w-full h-12 text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            Post a New Spot
          </Button>

          <Button
            onClick={onClose}
            className="w-full h-12 text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}