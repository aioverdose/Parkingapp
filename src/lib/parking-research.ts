import { z } from "zod";

export const RESEARCH_TYPES = ["street sweeping", "paid garages", "EV charging", "parking meters", "general parking rules"] as const;
export const RECORD_TYPES = ["sweeping", "garage", "ev", "meter", "rules"] as const;
export const researchRecordSchema = z.object({
  record_type: z.enum(RECORD_TYPES), name: z.string().min(1).max(240), address_area: z.string().max(240).default(""),
  lat: z.number().finite().nullable().optional(), lng: z.number().finite().nullable().optional(), hours: z.string().max(500).default(""),
  pricing: z.string().max(500).default(""), restrictions: z.string().max(1_000).default(""), source_url: z.string().url(), source_name: z.string().max(200).default(""),
  confidence: z.number().min(0).max(1).nullable().default(null), verified_at: z.string().datetime().nullable().default(null), status: z.literal("draft").default("draft"), notes: z.string().max(2_000).default(""),
});
export const researchResultSchema = z.object({ records: z.array(researchRecordSchema), notes: z.string().max(4_000).default(""), confidence: z.number().min(0).max(1).nullable().default(null) });
export type ResearchRecord = z.infer<typeof researchRecordSchema>;
export type ResearchResult = { records: ResearchRecord[]; notes: string; confidence: number | null };

export function researchChecklist(city: string, stateCountry: string, types: string[], sources: string[]): ResearchResult {
  const place = [city.trim(), stateCountry.trim()].filter(Boolean).join(", ");
  return { records: [], confidence: null, notes: `Draft checklist for ${place}: verify official ${types.join(", ")} sources. Confirm effective dates, street-level restrictions, hours, pricing, exemptions, accessibility, and seasonal changes before approval.${sources.length ? ` Supplied sources: ${sources.join(", ")}` : " No source URLs supplied."}` };
}

export function parseResearchJson(value: unknown) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return researchResultSchema.parse(parsed);
}
