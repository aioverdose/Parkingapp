import { z } from "zod";

export const aspectRatios = ["9:16", "16:9", "1:1"] as const;
export const sceneTypes = ["intro", "problem", "app-demo", "map", "feature", "testimonial", "cta"] as const;
export const visualTypes = ["phone-mockup", "map", "image", "gradient", "feature-card", "cta"] as const;
export const transitions = ["fade", "slide-left", "slide-up", "zoom", "none"] as const;
export const voicePresets = ["professional", "friendly", "energetic"] as const;

export type AspectRatio = (typeof aspectRatios)[number];
export type SceneType = (typeof sceneTypes)[number];
export type VisualType = (typeof visualTypes)[number];
export type Transition = (typeof transitions)[number];
export type VoicePreset = (typeof voicePresets)[number];
export type VideoStatus = "draft" | "storyboarding" | "ready" | "rendering" | "completed" | "failed";

export type VoiceSettings = { enabled: boolean; preset: VoicePreset; volume: number; speed: number };
export type MusicSettings = { enabled: boolean; volume: number; fadeIn: number; fadeOut: number; sourceUrl?: string };
export type BrandSettings = { primary: string; secondary: string; accent: string; website: string; logoUrl?: string };
export type VideoScene = {
  id: string; order: number; durationInFrames: number; sceneType: SceneType; headline: string; body?: string; narration?: string;
  textColor?: string;
  visual: { type: VisualType; imageUrl?: string; screenId?: string; background?: string };
  transition: Transition; captionsEnabled: boolean;
};
export type VideoProject = {
  id: string; title: string; prompt: string; status: VideoStatus; aspectRatio: AspectRatio; fps: number; durationInFrames: number;
  voice: VoiceSettings; music: MusicSettings; brand: BrandSettings; scenes: VideoScene[]; outputUrl?: string; createdAt: string; updatedAt: string;
};
export type VideoRenderJob = { id: string; projectId: string; status: "queued" | "rendering" | "completed" | "failed"; provider: string; progress: number; outputUrl?: string; error?: string; metadata?: Record<string, unknown>; createdAt: string; updatedAt: string };

export const videoSceneSchema = z.object({
  id: z.string(), order: z.number().int().min(0), durationInFrames: z.number().int().min(15).max(3600),
  sceneType: z.enum(sceneTypes), headline: z.string().min(1).max(160), body: z.string().max(500).optional(), narration: z.string().max(1000).optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "textColor must be a six-digit hex color").optional().default("#ffffff"),
  visual: z.object({ type: z.enum(visualTypes), imageUrl: z.string().url().optional().or(z.literal("")), screenId: z.string().max(80).optional(), background: z.string().max(100).optional() }),
  transition: z.enum(transitions), captionsEnabled: z.boolean(),
});
export const videoProjectPayloadSchema = z.object({
  title: z.string().min(1).max(120), prompt: z.string().max(5000), status: z.enum(["draft", "storyboarding", "ready", "rendering", "completed", "failed"]).optional(),
  aspectRatio: z.enum(aspectRatios), fps: z.number().int().min(1).max(60), durationInFrames: z.number().int().positive(),
  voice: z.object({ enabled: z.boolean(), preset: z.enum(voicePresets), volume: z.number().min(0).max(1), speed: z.number().min(0.5).max(2) }),
  music: z.object({ enabled: z.boolean(), volume: z.number().min(0).max(1), fadeIn: z.number().min(0).max(10), fadeOut: z.number().min(0).max(10), sourceUrl: z.string().url().optional().or(z.literal("")) }),
  brand: z.object({ primary: z.string().max(30), secondary: z.string().max(30), accent: z.string().max(30), website: z.string().max(120), logoUrl: z.string().url().optional().or(z.literal("")) }),
  scenes: z.array(videoSceneSchema).min(1).max(30),
});

export function framesForSeconds(seconds: number, fps = 30) { return Math.max(1, Math.round(seconds * fps)); }
export function secondsForFrames(frames: number, fps = 30) { return Math.round((frames / fps) * 10) / 10; }
export function dimensionsForAspectRatio(aspectRatio: AspectRatio) { return aspectRatio === "9:16" ? { width: 540, height: 960 } : aspectRatio === "1:1" ? { width: 720, height: 720 } : { width: 1280, height: 720 }; }
