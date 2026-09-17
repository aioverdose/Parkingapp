import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { chatCompletion, activeProviderName } from "@/lib/llm";
import { RESEARCH_TYPES, parseResearchJson, researchChecklist } from "@/lib/parking-research";
import { fetchResearchSource, MAX_RESEARCH_URLS } from "@/lib/parking-research-sources";

const isUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await createAdminClient().from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "moderator") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const city = typeof body.city === "string" ? body.city.trim().slice(0, 160) : "";
  const stateCountry = typeof body.state_country === "string" ? body.state_country.trim().slice(0, 160) : "";
  const types = Array.isArray(body.types) ? body.types.filter((type: unknown): type is string => typeof type === "string" && RESEARCH_TYPES.includes(type as typeof RESEARCH_TYPES[number])) : [];
  const sources = Array.isArray(body.sources) ? body.sources.filter(isUrl).slice(0, 20) : [];
  if (!city || !types.length) return NextResponse.json({ error: "city and at least one valid research type are required" }, { status: 400 });
  const query = `Research ${types.join(", ")} in ${[city, stateCountry].filter(Boolean).join(", ")}`;
  let result = researchChecklist(city, stateCountry, types, sources);
  let provider = "none";
  const providerUrl = process.env.PARKING_RESEARCH_PROVIDER_URL?.trim();
  let fetchedSources: Awaited<ReturnType<typeof fetchResearchSource>>[] = [];
  try {
    if (providerUrl) {
      const response = await fetch(providerUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, state_country: stateCountry, types, sources, query, response_format: "strict_json" }) });
      if (!response.ok) throw new Error(`Research provider returned ${response.status}`);
      result = parseResearchJson(await response.json()); provider = "configured-provider";
    } else {
      fetchedSources = await Promise.all(sources.slice(0, MAX_RESEARCH_URLS).map(fetchResearchSource));
      const usableSources = fetchedSources.filter((source): source is NonNullable<typeof source> => Boolean(source));
      if (activeProviderName() !== "none") {
        const reply = await chatCompletion([{ role: "system", content: "Return strict JSON only matching {records:[],notes:string,confidence:number|null}. Every record must have record_type, name, source_url, and status draft. Every source_url must exactly match one of the supplied source URLs. Never invent dates, times, pricing, coordinates, sources, or verification." }, { role: "user", content: JSON.stringify({ city, state_country: stateCountry, types, query, sources: usableSources }) }]);
        if (reply) { result = parseResearchJson(reply); provider = activeProviderName(); }
      }
      if (provider === "none") {
        result = { ...result, notes: `${result.notes} Fetched source excerpts are saved below; structured extraction requires configuring an LLM provider.` };
      }
    }
  } catch (error) {
    return NextResponse.json({ error: "Research output failed validation or provider request failed", detail: error instanceof Error ? error.message : "Unknown error" }, { status: 502 });
  }
  const admin = createAdminClient();
  const savedResult = fetchedSources.some(Boolean) ? { ...result, source_excerpts: fetchedSources.filter(Boolean) } : result;
  const { data: job, error: jobError } = await (admin as any).from("parking_research_jobs").insert({ city, state_country: stateCountry, requested_types: types, query, sources, result: savedResult, created_by: user.id }).select("id, city, state_country, requested_types, status, query, sources, result, created_at").single();
  if (jobError) return NextResponse.json({ error: "Could not save research draft", detail: jobError.message }, { status: 500 });
  if (result.records.length) await (admin as any).from("parking_research_records").insert(result.records.map((record) => ({ ...record, job_id: job.id, lat: record.lat ?? null, lng: record.lng ?? null })));
  return NextResponse.json({ job, provider, published: false, message: provider === "none" ? "Source excerpts were fetched, but structured extraction requires configuring an LLM provider. This remains an unapproved draft." : "Research returned as an unapproved draft. Official source verification is required." });
}
