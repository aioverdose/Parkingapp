import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";
import { checkRateLimit } from "@/lib/api/rate-limit";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await checkRateLimit(`community-media:${user.id}`, 20, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Media upload limit reached. Try again later." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const postId = typeof body.post_id === "string" ? body.post_id : "";
  const kind = body.kind === "image" || body.kind === "video" ? body.kind : null;
  const storagePath = typeof body.storage_path === "string" ? body.storage_path : "";
  const mimeType = typeof body.mime_type === "string" ? body.mime_type.toLowerCase() : "";
  const sizeBytes = typeof body.size_bytes === "number" ? body.size_bytes : 0;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;

  if (!postId || !kind || !mimeType || !storagePath || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxBytes) {
    return NextResponse.json({ error: "Invalid media metadata or file size" }, { status: 400 });
  }
  const validMime = /^(image|video)\/[a-z0-9.+-]+$/.test(mimeType);
  if (!validMime || !(kind === "image" ? mimeType.startsWith("image/") : mimeType.startsWith("video/"))) {
    return NextResponse.json({ error: "Media type does not match its kind" }, { status: 400 });
  }
  if (storagePath.includes("..") || storagePath.startsWith("/") || !storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: post } = await admin.from("community_posts").select("id, author_id").eq("id", postId).maybeSingle();
  if (!post || post.author_id !== user.id) return NextResponse.json({ error: "You do not own this post" }, { status: 403 });

  const { data, error } = await admin.from("community_post_media").insert({
    post_id: postId,
    kind,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: sizeBytes,
  }).select("id, post_id, kind, storage_path, mime_type, size_bytes, created_at").single();
  if (error) return NextResponse.json({ error: "Could not register media" }, { status: 400 });
  const { data: publicUrl } = admin.storage.from("community-media").getPublicUrl(storagePath);
  return NextResponse.json({ media: { ...data, url: publicUrl.publicUrl } }, { status: 201 });
}
