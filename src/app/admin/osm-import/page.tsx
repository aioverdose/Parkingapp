"use client";

import { useState } from "react";
import { osmImportFetch } from "./client";

type FormState = {
  city: string;
  region: string;
  country: string;
  selected_place_name: string;
  west: string;
  south: string;
  east: string;
  north: string;
};

const initialForm: FormState = {
  city: "",
  region: "",
  country: "",
  selected_place_name: "",
  west: "",
  south: "",
  east: "",
  north: "",
};

export default function OSMImportPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createdJob, setCreatedJob] = useState<{ id: string; status: string } | null>(null);
  const [responseDetails, setResponseDetails] = useState<{ status: number; body: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const update = (key: keyof FormState, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
    setError("");
  };

  async function search() {
    setError("");
    if (query.trim().length < 3) {
      setError("Enter at least 3 characters before searching for a place.");
      return;
    }

    setIsSearching(true);
    try {
      const response = await osmImportFetch(
        `/api/admin/osm-import/locations?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || `Location search failed (${response.status}).`);
        setCandidates([]);
        return;
      }
      setCandidates(data.candidates || []);
      if (!data.candidates?.length) setError("No places found. Try a more specific search.");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Location search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  function validateForm() {
    if (!form.selected_place_name || !form.city || !form.country) {
      return "Select a place from the search results before creating an import job.";
    }

    const values = [form.west, form.south, form.east, form.north].map(Number);
    if (values.some((value) => !Number.isFinite(value))) {
      return "Enter numeric values for all four boundary coordinates.";
    }
    const [west, south, east, north] = values;
    if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
      return "Boundary must be valid coordinates: west < east and south < north within latitude/longitude limits.";
    }
    return "";
  }

  async function create(confirmReferenceImport: boolean) {
    setMessage("");
    setError("");
    setCreatedJob(null);
    setResponseDetails(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const west = Number(form.west);
    const south = Number(form.south);
    const east = Number(form.east);
    const north = Number(form.north);
    const boundary = {
      type: "Polygon",
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
    };

    setIsCreating(true);
    try {
      const response = await osmImportFetch("/api/admin/osm-import/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          boundary,
          confirm_reference_import: confirmReferenceImport,
          import_options: { include_named: true, include_street_side: true },
        }),
      });
      const data = await response.json().catch(() => ({}));
      const body = JSON.stringify(data, null, 2);
      setResponseDetails({ status: response.status, body });

      if (!response.ok) {
        setError(data.error || `The import job could not be created (${response.status}).`);
        return;
      }

      const job = data.job;
      const status = job?.status || "created";
      setCreatedJob({ id: job?.id || "unknown", status });
      setMessage(`Import job created with status: ${status}.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "The import job could not be created due to a network error.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-5 md:p-10">
      <header>
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Data Operations</p>
        <h1 className="mt-2 text-3xl font-black text-blue-950">OpenStreetMap Parking Import</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Import public reference data into review. This does not create user spots, predict availability, or guarantee access.
        </p>
      </header>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">1. Select a place</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border p-3"
            placeholder="City, region, country"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search();
            }}
          />
          <button type="button" disabled={isSearching} className="rounded-xl bg-blue-700 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void search()}>
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {candidates.map((candidate) => (
            <button
              key={candidate.display_name}
              type="button"
              className="rounded-xl border p-3 text-left text-sm hover:border-blue-500"
              onClick={() => {
                const boundingBox = candidate.bbox || [];
                update("selected_place_name", candidate.display_name);
                update("city", candidate.address?.city || candidate.address?.town || candidate.display_name.split(",")[0]);
                update("region", candidate.address?.state || "");
                update("country", candidate.address?.country || "");
                if (boundingBox.length === 4) {
                  update("south", String(boundingBox[0]));
                  update("north", String(boundingBox[1]));
                  update("west", String(boundingBox[2]));
                  update("east", String(boundingBox[3]));
                }
              }}
            >
              {candidate.display_name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">2. Boundary and query</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["west", "south", "east", "north"] as const).map((key) => (
            <label key={key} className="text-xs font-bold">
              {key[0].toUpperCase() + key.slice(1)}
              <input className="mt-1 w-full rounded-xl border p-2" value={form[key]} onChange={(event) => update(key, event.target.value)} />
            </label>
          ))}
        </div>
        <p className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">{form.selected_place_name || "Select a place above to populate the import."}</p>
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="font-bold">3. Confirm reference import</h2>
        <p className="mt-2 text-sm text-zinc-600">This creates a reviewable import job. It does not publish parking spots directly.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={isCreating} className="rounded-xl border px-4 py-3 font-semibold text-blue-900 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void create(false)}>
            {isCreating ? "Creating..." : "Create draft job"}
          </button>
          <button type="button" disabled={isCreating} className="rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void create(true)}>
            {isCreating ? "Creating..." : "Confirm and create queued job"}
          </button>
        </div>
      </section>

      {message && createdJob && (
        <div role="status" className="rounded-2xl border-2 border-green-300 bg-green-50 p-5 text-green-950">
          <p className="text-lg font-bold">{message}</p>
          <p className="mt-1 text-sm">Job ID: {createdJob.id}</p>
          <p className="text-sm">Status: {createdJob.status}</p>
          <a href="/admin/osm-import/jobs" className="mt-4 inline-block rounded-xl bg-green-700 px-5 py-3 font-bold text-white underline">Open Import Jobs to run or review this job</a>
        </div>
      )}
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 font-semibold text-red-900">{error}</div>}
      {responseDetails && (
        <div role="alert" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <p className="font-bold">POST response: HTTP {responseDetails.status}</p>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{responseDetails.body}</pre>
        </div>
      )}
    </main>
  );
}
