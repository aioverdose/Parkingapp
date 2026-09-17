import { createDefaultProject } from "./default-project";
import type { AspectRatio, BrandSettings, VideoProject, VoiceSettings } from "./types";

export function generateFallbackStoryboard(input: { title: string; prompt: string; aspectRatio: AspectRatio; durationSeconds: number; voice: VoiceSettings; brand: BrandSettings }): Omit<VideoProject, "id" | "createdAt" | "updatedAt"> {
  const project = createDefaultProject();
  const targetFrames = Math.max(15, Math.round(input.durationSeconds * project.fps));
  const ratio = targetFrames / project.durationInFrames;
  const scenes = project.scenes.map((scene) => ({ ...scene, durationInFrames: Math.max(15, Math.round(scene.durationInFrames * ratio)) }));
  return { ...project, title: input.title || project.title, prompt: input.prompt, aspectRatio: input.aspectRatio, durationInFrames: scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0), voice: input.voice, brand: input.brand, scenes };
}
