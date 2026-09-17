"use client";
import { Player } from "@remotion/player";
import { VideoComposition } from "@/remotion/VideoComposition";
import { dimensionsForAspectRatio, type VideoProject } from "@/lib/video/types";

export default function RemotionVideoPlayer({ project }: { project: VideoProject }) {
  const dimensions = dimensionsForAspectRatio(project.aspectRatio);
  return <div className="w-full flex justify-center"><Player component={VideoComposition} inputProps={{ project }} durationInFrames={project.durationInFrames} fps={project.fps} compositionWidth={dimensions.width} compositionHeight={dimensions.height} controls loop clickToPlay doubleClickToFullscreen initiallyShowControls={false} acknowledgeRemotionLicense style={{ width: "min(100%, 360px)", aspectRatio: `${dimensions.width}/${dimensions.height}`, borderRadius: 22, overflow: "hidden", background: "#0f172a" }} /></div>;
}
