"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseClient";
import { ShieldCheck, X } from "lucide-react";

const MAX_FILES = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function fileError(file: File) {
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return "Only image and video files are supported.";
  const max = file.type.startsWith("image/") ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  return file.size <= max ? null : `${file.name} is larger than the ${file.type.startsWith("image/") ? "10 MB image" : "25 MB video"} limit.`;
}

export function CommunityPostComposer() {
  const supabase = createBrowserClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [area, setArea] = useState("Belmont Shore");
  const [postCategory, setPostCategory] = useState("neighborhood");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/experience/community").then((response) => response.json()).then((data) => setEnabled(data.feed_enabled !== false && data.settings?.composer_enabled !== false)).catch(() => setEnabled(true));
  }, []);

  if (enabled !== true) return null;

  function chooseFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)].slice(0, MAX_FILES);
    const invalid = next.find(fileError);
    setNotice(invalid ? fileError(invalid) : next.length < files.length + selected.length ? "A post can include up to 4 files." : null);
    setFiles(invalid ? files : next);
  }

  async function submitPost() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setNotice("Sign in to publish a community post."); return; }
    setPosting(true); setNotice(null); setUploadState(null);
    const res = await fetch("/api/community/posts", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ body, area_label: area, category: postCategory }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setNotice(data.error || "Could not publish post."); setPosting(false); return; }

    const failures: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setUploadState(`Uploading ${index + 1} of ${files.length}...`);
      const kind = file.type.startsWith("video/") ? "video" : "image";
      const path = `${session.user.id}/${data.post.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      try {
        const upload = await supabase.storage.from("community-media").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) { failures.push(file.name); continue; }
        const registered = await fetch("/api/community/media", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ post_id: data.post.id, kind, storage_path: path, mime_type: file.type, size_bytes: file.size }) });
        if (!registered.ok) failures.push(file.name);
      } catch {
        failures.push(file.name);
      }
    }
    setPosting(false); setUploadState(null); setBody(""); setFiles([]); setComposerOpen(false);
    setNotice(failures.length ? `Post published, but these files could not be attached: ${failures.join(", ")}` : data.message);
  }

  return <section className="mb-5">
    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"><ShieldCheck className="mr-1 inline" size={14} /> Posts use approximate areas only. Community posts are not parking reservations or guarantees.</div>
    {notice && <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notice"><X size={14} /></button></div>}
    {!composerOpen ? <button onClick={() => setComposerOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">+</div>Share something helpful with neighbors...</button> : <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">New community post</h2><button onClick={() => setComposerOpen(false)} aria-label="Close composer"><X size={18} /></button></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><select value={postCategory} onChange={(e) => setPostCategory(e.target.value)} className="app-input rounded-xl px-3 py-2 text-sm"><option value="neighborhood">Neighborhood</option><option value="question">Question</option><option value="alert">Alert</option><option value="event">Event</option><option value="business">Local business / sponsored</option></select><input value={area} maxLength={120} onChange={(e) => setArea(e.target.value)} placeholder="Approximate area" className="app-input rounded-xl px-3 py-2 text-sm" /></div><textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} placeholder="Keep it useful and neighborly. No exact addresses or reservation offers." className="app-input mt-3 min-h-28 w-full rounded-xl p-3 text-sm" /><input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => chooseFiles(e.target.files)} /><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => fileInput.current?.click()} disabled={posting} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold dark:border-zinc-700">Add photos or videos</button>{files.map((file) => <span key={`${file.name}-${file.size}`} className="max-w-full truncate rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{file.name}</span>)}</div><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[11px] text-zinc-400">{body.length}/2000 · Up to 4 files, images 10 MB, videos 25 MB</span><button disabled={posting || !body.trim() || !area.trim()} onClick={() => void submitPost()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{uploadState || "Post"}</button></div></div>}
  </section>;
}
