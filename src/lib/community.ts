import { moderateMessengerMessage, moderationEvidence } from "@/lib/messenger-moderation";

export const COMMUNITY_CATEGORIES = ["neighborhood", "question", "alert", "event", "business"] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export function cleanCommunityText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}

/** Admin moderation may show a neighborhood label, never a precise address or coordinate. */
export function redactCommunityArea(value: unknown): string {
  if (typeof value !== "string") return "Area not specified";
  return value.replace(/\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+){0,3}\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/gi, "specific address").replace(/\b-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}\b/g, "specific coordinates").trim() || "Area not specified";
}

export function moderateCommunityText(text: string) {
  const result = moderateMessengerMessage(text);
  return { result, evidence: moderationEvidence(result) };
}
