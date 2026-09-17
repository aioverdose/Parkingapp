"use client";

import { Trash2 } from "lucide-react";
import type { VideoScene, SceneType } from "@/lib/video/types";

const textColorPresets = [
  ["White", "#ffffff"],
  ["Ink", "#0f172a"],
  ["Blue", "#bfdbfe"],
  ["Amber", "#fbbf24"],
  ["Mint", "#a7f3d0"],
] as const;

export default function SceneEditor({ scene, fps, onChange, onDelete }: { scene: VideoScene; fps: number; onChange: (value: Partial<VideoScene>) => void; onDelete: () => void }) {
  const textColor = scene.textColor || "#ffffff";
  return <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
    <div className="flex items-center justify-between"><span className="text-xs font-bold text-blue-600">Scene {scene.order + 1}</span><button onClick={onDelete} aria-label="Delete scene" className="text-zinc-400 hover:text-red-500"><Trash2 size={15} /></button></div>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs text-zinc-500">Type<select value={scene.sceneType} onChange={(e) => onChange({ sceneType: e.target.value as SceneType })} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm">{["intro", "problem", "app-demo", "map", "feature", "testimonial", "cta"].map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
      <label className="text-xs text-zinc-500">Seconds<input type="number" min=".5" max="120" step=".5" value={Math.round(scene.durationInFrames / fps * 10) / 10} onChange={(e) => onChange({ durationInFrames: Math.max(15, Math.round(Number(e.target.value) * fps)) })} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm" /></label>
    </div>
    <label className="block text-xs text-zinc-500">Headline<input value={scene.headline} onChange={(e) => onChange({ headline: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm" /></label>
    <label className="block text-xs text-zinc-500">Supporting text<textarea value={scene.body ?? ""} onChange={(e) => onChange({ body: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm" /></label>
    <label className="block text-xs text-zinc-500">Narration<textarea value={scene.narration ?? ""} onChange={(e) => onChange({ narration: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm" /></label>
    <div className="grid grid-cols-[auto_1fr] items-end gap-3">
      <label className="text-xs text-zinc-500">Text color<input aria-label="Text color" type="color" value={textColor} onChange={(e) => onChange({ textColor: e.target.value })} className="mt-1 block h-9 w-12 cursor-pointer rounded border border-zinc-200 bg-transparent p-1" /></label>
      <label className="text-xs text-zinc-500">Color preset<select value={textColorPresets.some(([, color]) => color === textColor) ? textColor : "custom"} onChange={(e) => { if (e.target.value !== "custom") onChange({ textColor: e.target.value }); }} className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"><option value="custom">Custom ({textColor})</option>{textColorPresets.map(([name, color]) => <option key={color} value={color}>{name}</option>)}</select></label>
    </div>
    <p className="text-[11px] text-zinc-400">This color applies to the slide headline, supporting text, and CTA text.</p>
  </div>;
}
