"use client";
import { Plus } from "lucide-react";
import SceneEditor from "./SceneEditor";
import type { VideoScene } from "@/lib/video/types";

export default function StoryboardEditor({ scenes, fps, onChange }: { scenes: VideoScene[]; fps: number; onChange: (scenes: VideoScene[]) => void }) {
  const update = (index: number, patch: Partial<VideoScene>) => onChange(scenes.map((scene, i) => i === index ? { ...scene, ...patch } : scene));
  const add = () => onChange([...scenes, { id: crypto.randomUUID(), order: scenes.length, durationInFrames: fps * 3, sceneType: "feature", headline: "New scene", body: "Add supporting text", narration: "", textColor: "#ffffff", visual: { type: "gradient", background: "#0f172a" }, transition: "fade", captionsEnabled: true }]);
  const remove = (index: number) => onChange(scenes.filter((_, i) => i !== index).map((scene, order) => ({ ...scene, order })));
  return <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4"><div className="flex items-center justify-between"><div><h2 className="font-bold">Storyboard</h2><p className="text-xs text-zinc-500 mt-1">Edit scenes, timing, captions, visuals, and narration.</p></div><button onClick={add} className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold"><Plus size={14} /> Scene</button></div><div className="flex gap-1 h-2 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">{scenes.map((scene) => <div key={scene.id} style={{ flex: scene.durationInFrames }} className="bg-blue-500" title={scene.headline} />)}</div>{scenes.map((scene, index) => <SceneEditor key={scene.id} scene={scene} fps={fps} onChange={(patch) => update(index, patch)} onDelete={() => remove(index)} />)}</div>;
}
