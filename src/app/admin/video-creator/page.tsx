"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { speak } from "@/lib/speech";
import { createDefaultProject } from "@/lib/video/default-project";
import type { VideoProject, VideoRenderJob, VideoScene } from "@/lib/video/types";
import VideoProjectLibrary from "@/components/admin/video/VideoProjectLibrary";
import VideoPromptPanel from "@/components/admin/video/VideoPromptPanel";
import StoryboardEditor from "@/components/admin/video/StoryboardEditor";
import RemotionVideoPlayer from "@/components/admin/video/RemotionVideoPlayer";
import AudioControls from "@/components/admin/video/AudioControls";
import RenderPanel from "@/components/admin/video/RenderPanel";

async function getHeaders(json = false) {
  const { data: { session } } = await createBrowserClient().auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}`, ...(json ? { "Content-Type": "application/json" } : {}) };
}

function projectPayload(project: VideoProject) {
  return { title: project.title, prompt: project.prompt, status: project.status, aspectRatio: project.aspectRatio, fps: project.fps, durationInFrames: project.durationInFrames, voice: project.voice, music: project.music, brand: project.brand, scenes: project.scenes };
}

export default function VideoCreatorPage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [job, setJob] = useState<VideoRenderJob>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string }>();

  const load = async () => {
    setLoading(true); setMessage(undefined);
    const headers = await getHeaders();
    if (!headers) { setMessage({ type: "error", text: "Sign in to use the AI Video Creator." }); setLoading(false); return; }
    const response = await fetch("/api/admin/video-projects", { headers }); const body = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage({ type: "error", text: body.error || "Could not load video projects." }); setLoading(false); return; }
    const loaded = body.projects ?? [];
    if (loaded.length === 0) {
      try {
        const createHeaders = await getHeaders(true);
        const created = await fetch("/api/admin/video-projects", { method: "POST", headers: createHeaders ?? headers, body: JSON.stringify(createDefaultProject()) });
        const createdBody = await created.json().catch(() => ({}));
        if (created.ok && createdBody.project) { setProjects([createdBody.project]); setProject(createdBody.project); setLoading(false); return; }
      } catch { /* Keep the empty state usable if persistence is unavailable. */ }
    }
    setProjects(loaded); setProject(loaded[0] ?? null); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveNew = async (candidate: Omit<VideoProject, "id" | "createdAt" | "updatedAt">) => {
    const headers = await getHeaders(true); if (!headers) throw new Error("Not authenticated");
    const response = await fetch("/api/admin/video-projects", { method: "POST", headers, body: JSON.stringify(candidate) }); const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Could not create project");
    setProjects((current) => [body.project, ...current]); setProject(body.project); return body.project as VideoProject;
  };
  const newProject = async () => { try { await saveNew(createDefaultProject()); setMessage({ type: "success", text: "New demo project created." }); } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not create project" }); } };
  const updateProject = (patch: Partial<VideoProject>) => setProject((current) => current ? { ...current, ...patch } : current);
  const updateScenes = (scenes: VideoScene[]) => updateProject({ scenes, durationInFrames: scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) });
  const generate = async () => {
    if (!project) return; setGenerating(true); setMessage(undefined);
    try {
      const headers = await getHeaders(true); if (!headers) throw new Error("Not authenticated");
      const response = await fetch("/api/admin/video-projects/storyboard", { method: "POST", headers, body: JSON.stringify({ title: project.title, prompt: project.prompt, aspectRatio: project.aspectRatio, durationSeconds: Math.round(project.durationInFrames / project.fps), voice: project.voice, brand: project.brand }) }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Storyboard generation failed");
      const generated = { ...body.project, id: project.id, createdAt: project.createdAt, updatedAt: project.updatedAt, status: "ready" } as VideoProject;
      setProject(generated); await persist(generated); setMessage({ type: "success", text: "Storyboard generated. You can edit every scene below." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Storyboard generation failed" }); } finally { setGenerating(false); }
  };
  const persist = async (candidate = project) => {
    if (!candidate) return; setSaving(true);
    try { const headers = await getHeaders(true); if (!headers) throw new Error("Not authenticated"); const response = await fetch(`/api/admin/video-projects/${candidate.id}`, { method: "PATCH", headers, body: JSON.stringify(projectPayload(candidate)) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not save draft"); setProject(body.project); setProjects((current) => current.map((item) => item.id === body.project.id ? body.project : item)); setMessage({ type: "success", text: "Draft saved." }); } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not save draft" }); } finally { setSaving(false); }
  };
  const remove = async (candidate: VideoProject) => { if (!window.confirm(`Delete “${candidate.title}”?`)) return; try { const headers = await getHeaders(); if (!headers) throw new Error("Not authenticated"); const response = await fetch(`/api/admin/video-projects/${candidate.id}`, { method: "DELETE", headers }); if (!response.ok) throw new Error("Could not delete project"); const remaining = projects.filter((item) => item.id !== candidate.id); setProjects(remaining); setProject(remaining[0] ?? null); } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not delete project" }); } };
  const render = async () => { if (!project) return; try { const headers = await getHeaders(true); if (!headers) throw new Error("Not authenticated"); const response = await fetch(`/api/admin/video-projects/${project.id}/render`, { method: "POST", headers }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not create render job"); setJob({ id: body.job.id, projectId: body.job.project_id, status: body.job.status, provider: body.job.provider, progress: body.job.progress, outputUrl: body.job.output_url, error: body.job.error, metadata: body.job.metadata, createdAt: body.job.created_at, updatedAt: body.job.updated_at }); setMessage({ type: "success", text: body.message }); } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not create render job" }); } };
  const previewNarration = async () => { if (!project?.voice.enabled) return; const text = project.scenes.map((scene) => scene.narration).filter(Boolean).join(" "); await speak(text, { rate: project.voice.speed, volume: project.voice.volume }); };
  const projectDuration = useMemo(() => (project ? (project.durationInFrames / project.fps).toFixed(1) : "0"), [project]);

  if (loading) return <div className="p-6 text-center py-16 text-zinc-500"><Loader2 className="animate-spin mx-auto mb-3" />Loading video workspace...</div>;
  return <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5"><div className="flex items-start justify-between gap-4 flex-wrap"><div><div className="flex items-center gap-2"><Sparkles className="text-blue-600" size={22} /><h1 className="text-2xl font-black">AI Video Creator</h1></div><p className="text-sm text-zinc-500 mt-1">Turn a product idea into an editable, previewable demo video.</p></div><span className="text-xs rounded-full bg-amber-100 text-amber-800 px-3 py-1.5 font-semibold">Preview + mock renderer</span></div>{message && <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}{message.text}</div>}<div className="flex flex-col lg:flex-row gap-5 items-start"><VideoProjectLibrary projects={projects} selectedId={project?.id} onSelect={(next) => { setProject(next); setJob(undefined); }} onNew={newProject} onDelete={remove} /><main className="min-w-0 flex-1 w-full space-y-5">{project ? <><VideoPromptPanel title={project.title} prompt={project.prompt} aspectRatio={project.aspectRatio} durationSeconds={Math.round(project.durationInFrames / project.fps) || 30} onChange={(patch) => updateProject(patch)} onGenerate={generate} loading={generating} /><StoryboardEditor scenes={project.scenes} fps={project.fps} onChange={updateScenes} /></> : <div className="rounded-2xl border border-dashed p-10 text-center text-zinc-500">Create a project to begin.</div>}</main><aside className="w-full lg:w-[360px] shrink-0 space-y-5 lg:sticky lg:top-4"><div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><div className="flex items-center justify-between mb-3"><h2 className="font-bold">Live preview</h2><span className="text-xs text-zinc-500">{projectDuration}s</span></div>{project && <RemotionVideoPlayer project={project} />}</div>{project && <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"><AudioControls voice={project.voice} music={project.music} onVoiceChange={(value) => updateProject({ voice: { ...project.voice, ...value } })} onMusicChange={(value) => updateProject({ music: { ...project.music, ...value } })} onPreview={previewNarration} /><div className="mt-5"><RenderPanel project={project} job={job} saving={saving} onSave={() => persist()} onRender={render} /></div></div>}</aside></div></div>;
}
