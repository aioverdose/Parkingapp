import { framesForSeconds, type BrandSettings, type MusicSettings, type VideoProject, type VideoScene, type VoiceSettings } from "./types";

export const defaultVoice: VoiceSettings = { enabled: true, preset: "friendly", volume: 1, speed: 1 };
export const defaultMusic: MusicSettings = { enabled: false, volume: 0.18, fadeIn: 1, fadeOut: 1 };
export const defaultBrand: BrandSettings = { primary: "#2563eb", secondary: "#0f172a", accent: "#f59e0b", website: "parkingmeeters.com" };

export function makeDefaultScenes(fps = 30): VideoScene[] {
  const scenes: Array<Omit<VideoScene, "id" | "order" | "durationInFrames"> & { seconds: number }> = [
    { seconds: 4, sceneType: "intro", headline: "Parking on 2nd Street shouldn’t ruin your night.", body: "A smarter way to coordinate arrivals and departures.", narration: "Parking on 2nd Street shouldn't ruin your night.", visual: { type: "gradient", background: "#0f172a" }, transition: "fade", captionsEnabled: true },
    { seconds: 4, sceneType: "problem", headline: "Too much circling. Not enough time.", body: "Busy blocks make every arrival feel like a guess.", narration: "Drivers circle crowded blocks while open spaces go unnoticed.", visual: { type: "map", background: "#172554" }, transition: "slide-left", captionsEnabled: true },
    { seconds: 5, sceneType: "app-demo", headline: "Find parking near 2nd Street", body: "Search your destination before you go.", narration: "Search for parking near your Belmont Shore destination.", visual: { type: "phone-mockup", screenId: "search", background: "#dbeafe" }, transition: "slide-up", captionsEnabled: true },
    { seconds: 5, sceneType: "app-demo", headline: "Compare nearby options", body: "See distance, rates, and restrictions at a glance.", narration: "Compare nearby options, price, distance, and restrictions.", visual: { type: "phone-mockup", screenId: "options", background: "#eff6ff" }, transition: "zoom", captionsEnabled: true },
    { seconds: 4, sceneType: "app-demo", headline: "Choose a spot. Start walking.", body: "Keep the handoff clear and coordinated.", narration: "Select a spot and start walking to the restaurant.", visual: { type: "phone-mockup", screenId: "navigate", background: "#ecfdf5" }, transition: "slide-left", captionsEnabled: true },
    { seconds: 4, sceneType: "feature", headline: "Less circling. More time enjoying 2nd Street.", body: "A local coordination layer for better arrivals.", narration: "Less circling means more time enjoying 2nd Street.", visual: { type: "feature-card", background: "#1e3a8a" }, transition: "fade", captionsEnabled: true },
    { seconds: 4, sceneType: "cta", headline: "Find your spot before you go.", body: "Coordinate smarter with SpotMatch.", narration: "Find your spot before you go.", visual: { type: "cta", background: "#2563eb" }, transition: "fade", captionsEnabled: true },
  ];
  return scenes.map((scene, order) => ({ ...scene, id: `scene-${order + 1}`, order, durationInFrames: framesForSeconds(scene.seconds, fps) }));
}

export function createDefaultProject(): Omit<VideoProject, "id" | "createdAt" | "updatedAt"> {
  const fps = 30; const scenes = makeDefaultScenes(fps);
  return { title: "Park Smarter on 2nd Street", prompt: "Create a promotional demonstration of my parking app for Belmont Shore and 2nd Street.", status: "draft", aspectRatio: "9:16", fps, durationInFrames: scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0), voice: defaultVoice, music: defaultMusic, brand: defaultBrand, scenes };
}
