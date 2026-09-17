import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { requireExperienceAuth } from "@/lib/api/experience-auth";
import { fetchOSMParking } from "@/lib/parking-providers/openstreetmap";
import { normalizeOSMElement } from "@/lib/parking-providers/osm-normalizer";
import { flagSpatialDuplicates } from "@/lib/parking-providers/osm-dedupe";
import type { OSMElement } from "@/lib/parking-providers/types";

class ImportError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = "ImportError";
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireResult<T>(result: { data: T; error: { message?: string } | null }, operation: string): T {
  if (result.error) throw new ImportError(`${operation}: ${result.error.message || "unknown database error"}`);
  return result.data;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const checked = await requireExperienceAuth(request, "edit");
  if ("response" in checked) return checked.response;

  const { id } = await context.params;
  const admin = createAdminClient() as any;
  const jobResult = await admin.from("parking_import_jobs").select("*").eq("id", id).single();
  if (jobResult.error || !jobResult.data) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const job = jobResult.data;

  if (!["queued", "draft"].includes(job.status)) {
    return NextResponse.json({ error: "Job is not runnable in its current state" }, { status: 409 });
  }

  if (Number(job.boundary_area_km2) > 250) {
    const queued = await admin.from("parking_import_jobs").update({
      status: "queued",
      error_message: "This job requires a worker because it exceeds the synchronous MVP size limit",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (queued.error) return NextResponse.json({ error: `Could not queue job: ${queued.error.message}` }, { status: 500 });
    return NextResponse.json({ error: "Large imports require a worker; job remains queued", queued: true }, { status: 202 });
  }

  try {
    requireResult(await admin.from("parking_import_jobs").update({
      status: "fetching",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", id), "Could not mark job as fetching");

    let response;
    try {
      response = await fetchOSMParking(job.boundary);
    } catch (error) {
      throw new ImportError(`Overpass fetch failed: ${messageOf(error)}`, 502);
    }
    if (!Array.isArray(response.elements)) throw new ImportError("Overpass returned an invalid response", 502);
    requireResult(await admin.from("parking_import_jobs").update({
      status: "normalizing",
      fetched_count: response.elements.length,
      updated_at: new Date().toISOString(),
    }).eq("id", id), "Could not save fetched count");

    const normalized: { element: OSMElement; record: NonNullable<ReturnType<typeof normalizeOSMElement>> }[] = [];
    for (const element of response.elements) {
      try {
        const record = normalizeOSMElement(element);
        if (record) normalized.push({ element, record });
      } catch {
        // A malformed OSM element should not discard an otherwise usable import.
      }
    }

    requireResult(await admin.from("parking_import_jobs").update({
      status: "deduplicating",
      updated_at: new Date().toISOString(),
    }).eq("id", id), "Could not mark job as deduplicating");

    const duplicateIndexes = new Set(flagSpatialDuplicates(normalized.map(({ record }) => record)));
    const staged: Record<string, unknown>[] = [];

    for (let index = 0; index < normalized.length; index += 1) {
      const { element, record } = normalized[index];
      const sourceResult = await admin.from("parking_external_sources").upsert({
        provider: "osm",
        osm_type: element.type,
        osm_id: element.id,
        osm_version: element.version ?? null,
        source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
        raw_tags: element.tags || {},
        raw_geometry: element.geometry || element.center || null,
        retrieved_at: new Date().toISOString(),
      }, { onConflict: "provider,osm_type,osm_id" }).select("id").single();
      const source = requireResult<{ id: string }>(sourceResult, `Could not save OSM source ${element.type}/${element.id}`);
      if (!source?.id) throw new ImportError(`OSM source ${element.type}/${element.id} did not return an id`);

      staged.push({
        job_id: id,
        external_source_id: source.id,
        ...record,
        duplicate_confidence: duplicateIndexes.has(index) ? 0.85 : 0,
        import_status: duplicateIndexes.has(index) ? "needs_review" : "staged",
      });
    }

    if (staged.length) {
      requireResult(await admin.from("parking_import_staged_records").upsert(staged, { onConflict: "job_id,external_source_id" }), "Could not stage OSM records");
    }

    const completed = await admin.from("parking_import_jobs").update({
      status: "ready_for_review",
      staged_count: staged.length,
      updated_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", id);
    requireResult(completed, "Could not finalize import job");
    return NextResponse.json({ message: "Import fetched and staged for review", fetched_count: response.elements.length, staged_count: staged.length });
  } catch (error) {
    const reason = messageOf(error);
    const status = error instanceof ImportError ? error.status : 500;
    const failed = await admin.from("parking_import_jobs").update({
      status: "failed",
      error_message: reason.slice(0, 4000),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }).eq("id", id);
    const persisted = failed.error ? `${reason}; additionally could not persist failure: ${failed.error.message}` : reason;
    return NextResponse.json({ error: persisted }, { status });
  }
}
