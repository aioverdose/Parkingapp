# Admin AI Video Creator

The protected workspace is available at `/admin/video-creator`.

## Current behavior

- Storyboard generation uses a deterministic, fully editable parking-app demo when no LLM provider is configured.
- The Remotion Player previews scenes, transitions, phone mockups, map visuals, captions, and optional music URLs in the browser.
- Browser speech synthesis is labeled preview-only and is not used by final rendering.
- Render jobs use an explicit `mock` provider until a real worker is configured. Mock jobs never claim to have produced an MP4 or show a fake download URL.
- Video projects and render-job metadata are stored by migration `00050_admin_video_creator.sql`.

## Provider configuration

The provider seams are `src/lib/video/llm-provider.ts`, `src/lib/video/tts-provider.ts`, and `src/lib/video/render-provider.ts`. `LLM_API_KEY` and `TTS_API_KEY` only indicate that a provider can be enabled; vendor SDK calls should be implemented server-side in those adapters. Never store these values in project JSON or the database.

For production rendering, implement `RenderProvider` with Remotion Lambda, Remotion Cloud, or a dedicated worker. Set its provider status from server-side environment variables and persist the resulting MP4 URL in `video_render_jobs.output_url` and `video_projects.output_url`.

## Assets

Scene visuals currently use deterministic app mockups. To add screenshots, upload them through a protected storage flow, validate MIME type and size, store only the storage path/URL in `visual.imageUrl`, and keep the composition free of browser-only APIs.

Apply the migration before opening the page in an environment whose database does not yet have `video_projects` and `video_render_jobs`.
