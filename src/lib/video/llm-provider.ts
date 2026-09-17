import type { AspectRatio, BrandSettings, VideoProject, VoiceSettings } from "./types";

export interface StoryboardProvider {
  name: string;
  configured: boolean;
  generate(input: { title: string; prompt: string; aspectRatio: AspectRatio; durationSeconds: number; voice: VoiceSettings; brand: BrandSettings }): Promise<Partial<VideoProject> | null>;
}

/** Vendor-neutral seam for a future OpenAI, Anthropic, or internal storyboard provider. */
export const configuredStoryboardProvider: StoryboardProvider = {
  name: "unconfigured",
  configured: Boolean(process.env.LLM_API_KEY),
  async generate() { return null; },
};
