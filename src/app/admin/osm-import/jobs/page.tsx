"use client";

import { useEffect, useState } from "react";
import { osmImportFetch } from "../client";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[] | null>(null);
  const [message, setMessage] = useState("");
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await osmImportFetch("/api/admin/osm-import/jobs");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Could not load jobs (${response.status}).`);
      setJobs(data.jobs || []);
    } catch (loadError) {
      setMessage(loadError instanceof Error ? loadError.message : "Could not load import jobs.");
      setJobs([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(id: string) {
    setLoadingJobId(id);
    setMessage("Starting import...");
    try {
      const response = await osmImportFetch(`/api/admin/osm-import/jobs/${id}/run`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      setMessage(response.ok || response.status === 202 ? data.message || data.error || "Import started; the job remains queued." : data.error || `Import could not start (${response.status}).`);
      await load();
    } catch (runError) {
      setMessage(runError instanceof Error ? runError.message : "Import could not start due to a network error.");
    } finally {
      setLoadingJobId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-5 md:p-10">
      <h1 className="text-3xl font-black text-blue-950">Import Jobs</h1>
      <p className="mt-2 text-sm text-zinc-600">Bounded server runs show progress here. Large imports remain queued for a worker.</p>
      {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
      <div className="mt-6 grid gap-3">
        {jobs === null ? <p>Loading jobs...</p> : jobs.length ? jobs.map((job) => (
          <article key={job.id} className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{job.selected_place_name}</strong>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold">{job.status}</span>
                {["draft", "queued"].includes(job.status) && (
                  <button type="button" disabled={loadingJobId !== null} onClick={() => void run(job.id)} className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    {loadingJobId === job.id ? "Running..." : "Run import"}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-600">{job.staged_count} staged / {job.fetched_count} fetched · {Number(job.boundary_area_km2 || 0).toFixed(2)} km²</p>
            <p className="mt-2 text-xs text-zinc-500">{job.error_message || ""}</p>
          </article>
        )) : <p className="rounded-2xl border p-6 text-zinc-500">No imports yet.</p>}
      </div>
    </main>
  );
}
