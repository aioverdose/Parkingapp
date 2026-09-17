import type { VideoRenderJob, VideoProject } from "./types";

export interface RenderProvider { name: string; configured: boolean; enqueue(project: VideoProject, jobId: string): Promise<Pick<VideoRenderJob, "status" | "progress" | "provider" | "outputUrl" | "metadata">>; }

/** The mock provider is deliberately explicit: it returns a preview URL, not a claimed MP4 render. */
export const mockRenderProvider: RenderProvider = {
  name: "mock",
  configured: false,
  async enqueue(project, jobId) {
    return { status: "completed", progress: 100, provider: "mock", outputUrl: undefined, metadata: { message: "Rendering provider is not configured. Preview remains available in the editor.", projectId: project.id, jobId } };
  },
};
