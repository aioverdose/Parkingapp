export const EXPERIENCE_THEMES = ["coral", "sage", "navy", "sand", "lavender", "sky"] as const;
export const EXPERIENCE_STATUSES = ["draft", "published", "archived"] as const;
export type ExperienceTheme = typeof EXPERIENCE_THEMES[number];
export type ExperienceStatus = typeof EXPERIENCE_STATUSES[number];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateCategory(input: Record<string, unknown>) {
  if (typeof input.slug !== "string" || !slugPattern.test(input.slug) || input.slug.length > 80) return "slug must use lowercase letters, numbers, and hyphens";
  if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 100) return "name is required";
  if (typeof input.description !== "string" || input.description.trim().length < 2 || input.description.length > 500) return "description is required";
  if (typeof input.theme !== "string" || !EXPERIENCE_THEMES.includes(input.theme as ExperienceTheme)) return "theme is not approved";
  if (input.status !== undefined && (typeof input.status !== "string" || !EXPERIENCE_STATUSES.includes(input.status as ExperienceStatus))) return "status is invalid";
  if (input.image_id !== undefined && input.image_id !== null && typeof input.image_id !== "string") return "image_id is invalid";
  return null;
}
export const SAFE_PRIVACY_DEFAULTS = { exact_location: "private", address: "private", recurring_schedule: "private_or_selected_networks", vehicle: "match_participants", private_network: "network_only", contact: "private" } as const;
