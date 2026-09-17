import { describe, expect, it } from "vitest";
import { generateFallbackStoryboard } from "@/lib/video/storyboard";
import { createDefaultProject } from "@/lib/video/default-project";
import { dimensionsForAspectRatio, framesForSeconds } from "@/lib/video/types";

describe("video storyboard fallback", () => {
  it("creates a complete editable parking demo at the requested duration", () => {
    const defaults = createDefaultProject();
    const project = generateFallbackStoryboard({ title: "Demo", prompt: "Show parking near 2nd Street", aspectRatio: "16:9", durationSeconds: 45, voice: defaults.voice, brand: defaults.brand });
    expect(project.title).toBe("Demo");
    expect(project.aspectRatio).toBe("16:9");
    expect(project.scenes).toHaveLength(7);
    expect(project.durationInFrames).toBe(framesForSeconds(45));
    expect(project.scenes.at(-1)?.sceneType).toBe("cta");
  });

  it("keeps composition dimensions predictable", () => {
    expect(dimensionsForAspectRatio("9:16")).toEqual({ width: 540, height: 960 });
    expect(dimensionsForAspectRatio("1:1")).toEqual({ width: 720, height: 720 });
  });
});
