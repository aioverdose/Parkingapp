export const EXPERIENCE_APPEARANCE_PRESETS = [
  { id: "parking-native", label: "Parking Meeters Native", source: "Original Parking Meeters system", description: "The current forest-green and coral product language with practical parking-first cards.", accent: "#e85d3f", surface: "#f6f8f6", ink: "#17211e" },
  { id: "editorial", label: "Editorial Newsletter", source: "Editorial publishing direction", description: "A calm, text-led reading experience with generous typography and strong story hierarchy.", accent: "#b24b36", surface: "#fbf8f3", ink: "#28231f" },
  { id: "neighborhood", label: "Neighborhood Network", source: "Neighborhood-network direction", description: "A friendly local-network experience with clear status, trust, and nearby participation cues.", accent: "#3e8060", surface: "#f3f8f4", ink: "#17211e" },
  { id: "conversation", label: "Conversation Stream", source: "Discussion-community direction", description: "A compact conversation-first layout for updates, questions, replies, and moderation signals.", accent: "#6b55a5", surface: "#f7f6fb", ink: "#211d2d" },
  { id: "photo-community", label: "Photo Community", source: "Visual-community direction", description: "A media-forward visual language for neighborhood images, events, and community context.", accent: "#d94f35", surface: "#fff8f4", ink: "#241d1a" },
  { id: "utility-groups", label: "Utility Groups", source: "Group-management direction", description: "A structured group dashboard emphasizing controls, activity, and practical actions.", accent: "#2f6f91", surface: "#f2f7fa", ink: "#17211e" },
] as const;

export const APP_COLOR_PALETTES = [
  { id: "native-forest-coral", label: "Native Forest / Coral", accent: "#d94f35", accentStrong: "#b93d29", surface: "#f3f7f3", background: "#f3f7f3", ink: "#13231d", muted: "#5f756c", border: "#d4e1da", contrastSafeText: "#ffffff" },
  { id: "editorial-ink-terracotta", label: "Editorial Ink / Terracotta", accent: "#b24b36", accentStrong: "#823526", surface: "#fbf8f3", background: "#fbf8f3", ink: "#28231f", muted: "#756b63", border: "#ded5cc", contrastSafeText: "#ffffff" },
  { id: "neighborhood-sage", label: "Neighborhood Sage", accent: "#3e8060", accentStrong: "#286044", surface: "#f3f8f4", background: "#f3f8f4", ink: "#17211e", muted: "#60766b", border: "#cfe3d0", contrastSafeText: "#ffffff" },
  { id: "conversation-violet", label: "Conversation Violet", accent: "#6b55a5", accentStrong: "#503b86", surface: "#f7f6fb", background: "#f7f6fb", ink: "#211d2d", muted: "#716a82", border: "#ddd9ea", contrastSafeText: "#ffffff" },
  { id: "utility-blue", label: "Utility Blue", accent: "#2f6f91", accentStrong: "#20526e", surface: "#f2f7fa", background: "#f2f7fa", ink: "#17211e", muted: "#60747e", border: "#cadce5", contrastSafeText: "#ffffff" },
  { id: "warm-sand", label: "Warm Sand", accent: "#a66a3f", accentStrong: "#7f4c2a", surface: "#fbf6ed", background: "#fbf6ed", ink: "#30261f", muted: "#796c5e", border: "#e5d8c6", contrastSafeText: "#ffffff" },
  { id: "royal-blue-white", label: "Royal Blue / White", accent: "#2457d6", accentStrong: "#153ea8", surface: "#ffffff", background: "#ffffff", ink: "#17233d", muted: "#5e6b80", border: "#d9e2f4", contrastSafeText: "#ffffff" },
] as const;

export type ExperienceAppearancePreset = typeof EXPERIENCE_APPEARANCE_PRESETS[number]["id"];
export type AppColorPalette = typeof APP_COLOR_PALETTES[number]["id"];

export function getAppearancePreset(id: unknown) {
  return EXPERIENCE_APPEARANCE_PRESETS.find((preset) => preset.id === id) ?? EXPERIENCE_APPEARANCE_PRESETS[0];
}

export function getAppColorPalette(id: unknown) {
  return APP_COLOR_PALETTES.find((palette) => palette.id === id) ?? APP_COLOR_PALETTES[0];
}
