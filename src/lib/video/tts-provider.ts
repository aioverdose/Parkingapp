import type { VoiceSettings } from "./types";

export interface NarrationAudioProvider {
  name: string;
  configured: boolean;
  generateNarrationAudio(text: string, voiceSettings: VoiceSettings): Promise<{ url: string; durationSeconds?: number } | null>;
}

/** Browser speech is intentionally preview-only; this server seam is for a real TTS provider. */
export const configuredNarrationProvider: NarrationAudioProvider = {
  name: "browser-preview",
  configured: Boolean(process.env.TTS_API_KEY),
  async generateNarrationAudio() { return null; },
};
