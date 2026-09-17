"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseClient";
import { MessageCircle, Send, ShieldCheck, ThumbsUp, Users, X } from "lucide-react";
import { VehicleAvatar } from "@/components/VehicleAvatar";

type Media = { id: string; kind: "image" | "video"; url: string; mime_type: string };
type User = { username?: string; name?: string; avatar_color?: string; vehicle_type?: string | null } | null;
type Comment = { id: string; body: string; created_at: string; users: User };
type Post = {
  id: string;
  author_id: string;
  category: string;
  body: string;
  area_label: string;
  sponsored: boolean;
  created_at: string;
  users: User;
  media: Media[];
  comments: Comment[];
  reactions: { user_id: string; reaction: string }[];
};

const categories = [
  { value: "", label: "All" },
  { value: "neighborhood", label: "Neighborhood" },
  { value: "question", label: "Questions" },
  { value: "alert", label: "Alerts" },
  { value: "event", label: "Events" },
  { value: "business", label: "Local business" },
];

function displayName(user: User) {
  return user?.username ? `@${user.username}` : user?.name || "Neighbor";
}

function initials(user: User) {
  return displayName(user).replace("@", "").slice(0, 2).toUpperCase();
}

export default function CommunityPage() {
  const supabase = createBrowserClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ body: "", category: "", area_label: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controlResponse = await fetch("/api/experience/community");
    const control = await controlResponse.json().catch(() => ({}));
    if (control.feed_enabled === false) {
      setDisabled(true);
      setLoading(false);
      return;
    }
    setDisabled(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSessionUserId(null);
      setError("Sign in to join the neighborhood conversation.");
      setLoading(false);
      return;
    }
    setSessionUserId(session.user.id);
    const res = await fetch(`/api/community/posts${category ? `?category=${category}` : ""}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Could not load the community feed.");
    else setPosts(data.posts || []);
    setLoading(false);
  }, [category, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFeed(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFeed]);

  if (disabled) return <main className="premium-shell min-h-screen bg-zinc-50 px-4 pb-24 pt-10 dark:bg-zinc-950"><div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><Users className="mx-auto mb-4 text-zinc-400" /><h1 className="text-2xl font-bold">Community is temporarily unavailable</h1><p className="mt-2 text-sm text-zinc-500">The community feed and posting controls are currently disabled. Existing posts are still preserved.</p></div></main>;

  async function postAction(path: string, payload: object) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? (data.message || "Saved") : (data.error || "Action failed"));
    if (res.ok) void loadFeed();
  }

  async function submitComment(postId: string) {
    const text = commentDrafts[postId]?.trim() || "";
    if (!text || commentSubmitting[postId]) return;
    setCommentSubmitting((current) => ({ ...current, [postId]: true }));
    setCommentErrors((current) => ({ ...current, [postId]: null }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCommentErrors((current) => ({ ...current, [postId]: "Sign in to post a comment." }));
      setCommentSubmitting((current) => ({ ...current, [postId]: false }));
      return;
    }
    try {
      const res = await fetch("/api/community/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ post_id: postId, body: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCommentErrors((current) => ({ ...current, [postId]: data.error || "Could not post your comment." }));
        return;
      }
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setNotice(data.message || "Comment posted");
      void loadFeed();
    } catch {
      setCommentErrors((current) => ({ ...current, [postId]: "Could not post your comment. Try again." }));
    } finally {
      setCommentSubmitting((current) => ({ ...current, [postId]: false }));
    }
  }

  function startEditing(post: Post) {
    setEditingPostId(post.id);
    setEditDraft({ body: post.body, category: post.category, area_label: post.area_label });
    setEditError(null);
  }

  async function saveEdit() {
    if (!editingPostId || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setEditError("Sign in to edit your post.");
      setEditSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/community/posts/${editingPostId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(editDraft) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || "Could not update your post.");
        return;
      }
      setEditingPostId(null);
      setNotice(data.message || "Post updated");
      void loadFeed();
    } catch {
      setEditError("Could not update your post. Try again.");
    } finally {
      setEditSaving(false);
    }
  }

  async function deletePost(postId: string) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setNotice("Sign in to delete your post.");
      return;
    }
    const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(data.error || "Could not delete your post.");
    else {
      setNotice("Post deleted");
      void loadFeed();
    }
  }

  return (
    <main className="premium-shell premium-grid min-h-screen bg-zinc-50 pb-24 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--app-accent)]">Parking Meeters</p>
            <h1 className="text-3xl font-bold tracking-tight">Community</h1>
            <p className="mt-1 text-sm text-zinc-500">Useful local context from people in your area.</p>
          </div>
          <Link href="/profile" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold dark:border-zinc-800 dark:bg-zinc-900">Profile</Link>
        </header>

        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <ShieldCheck className="mr-1 inline" size={14} /> Posts use approximate areas only. Community posts are not parking reservations or guarantees.
        </div>
         <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
           {categories.map((item) => <button key={item.value} onClick={() => setCategory(item.value)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${category === item.value ? "bg-[var(--app-accent)] text-white" : "bg-white text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"}`}>{item.label}</button>)}
         </div>
         <figure className="relative mb-5 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-white shadow-sm">
           <img src="https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Several_cars.jpg/1280px-Several_cars.jpg" alt="Cars gathered in a city parking area" loading="lazy" className="h-40 w-full object-cover sm:h-52" />
           <figcaption className="absolute inset-x-0 bottom-0 bg-[#17233d]/80 px-4 py-3 text-xs text-white backdrop-blur-sm">
             <span className="font-bold">Parking works better with better local context.</span>{" "}
             <a href="https://commons.wikimedia.org/wiki/File:Several_cars.jpg" target="_blank" rel="noreferrer" className="underline decoration-white/50 underline-offset-2 hover:text-white">Image: Zhousiyuan / Wikimedia Commons, CC BY-SA 3.0</a>
           </figcaption>
         </figure>
         {notice && <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notice"><X size={14} /></button></div>}

        {loading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{error}</p><button onClick={() => void loadFeed()} className="mt-3 font-bold underline">Try again</button></div> : posts.length === 0 ? <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700"><Users className="mx-auto mb-3 text-zinc-400" /><h2 className="font-bold">No posts here yet</h2><p className="mt-1 text-sm text-zinc-500">Start a useful local conversation. Remember: a post never reserves a space.</p></div> : (
          <div className="space-y-3">
            {posts.map((post) => {
              const support = post.reactions.filter((reaction) => reaction.reaction === "support").length;
              const expanded = expandedComments[post.id] === true;
              const draft = commentDrafts[post.id] || "";
               const submitting = commentSubmitting[post.id] === true;
              const ownPost = post.author_id === sessionUserId;
              const editing = editingPostId === post.id;
              return (
                <article key={post.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex gap-3">
                     {post.users?.vehicle_type ? <VehicleAvatar vehicleType={post.users.vehicle_type} className="h-10 w-10 shrink-0 rounded-full bg-blue-100 text-blue-700" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials(post.users)}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">{displayName(post.users)}</p><p className="text-[11px] text-zinc-400">{post.area_label} · {new Date(post.created_at).toLocaleDateString()}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-500 dark:bg-zinc-800">{post.sponsored ? "Sponsored" : post.category}</span>{ownPost && <div className="flex gap-1 text-xs"><button type="button" onClick={() => startEditing(post)} className="rounded-lg px-2 py-1 font-semibold text-blue-600 hover:bg-blue-50" aria-label={`Edit post from ${displayName(post.users)}`}>Edit</button><button type="button" onClick={() => void deletePost(post.id)} className="rounded-lg px-2 py-1 font-semibold text-red-600 hover:bg-red-50" aria-label={`Delete post from ${displayName(post.users)}`}>Delete</button></div>}</div></div>
                      {editing ? <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void saveEdit(); }}><label htmlFor={`edit-body-${post.id}`} className="sr-only">Edit post</label><textarea id={`edit-body-${post.id}`} value={editDraft.body} onChange={(event) => setEditDraft((current) => ({ ...current, body: event.target.value.slice(0, 2000) }))} maxLength={2000} rows={5} className="app-input w-full resize-y rounded-xl px-3 py-2 text-sm" /><div className="grid gap-2 sm:grid-cols-2"><select value={editDraft.category} onChange={(event) => setEditDraft((current) => ({ ...current, category: event.target.value }))} className="app-input rounded-xl px-3 py-2 text-sm" aria-label="Post category">{categories.slice(1).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input value={editDraft.area_label} onChange={(event) => setEditDraft((current) => ({ ...current, area_label: event.target.value.slice(0, 120) }))} maxLength={120} className="app-input rounded-xl px-3 py-2 text-sm" aria-label="Approximate area" placeholder="Approximate area" /></div><div className="flex items-center justify-between text-xs text-zinc-400"><span>{editDraft.body.length}/2000</span><span className="flex gap-2"><button type="button" onClick={() => { setEditingPostId(null); setEditError(null); }} className="rounded-lg px-3 py-2 font-semibold">Cancel</button><button type="submit" disabled={editSaving} className="app-primary rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-50">{editSaving ? "Saving..." : "Save"}</button></span></div>{editError && <p role="alert" className="text-xs font-medium text-red-600">{editError}</p>}</form> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">{post.body}</p>}
                      {post.media.length > 0 && <div className={`mt-3 grid gap-2 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.media.map((media) => media.kind === "image" ? <img key={media.id} src={media.url} alt={`Media shared by ${displayName(post.users)} in ${post.area_label}`} loading="lazy" className="max-h-[28rem] w-full rounded-xl object-cover" /> : <video key={media.id} src={media.url} controls preload="metadata" className="max-h-[28rem] w-full rounded-xl object-contain" aria-label={`Video shared by ${displayName(post.users)} in ${post.area_label}`} />)}</div>}
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <button onClick={() => void postAction("/api/community/reactions", { post_id: post.id, reaction: "support" })} className="flex items-center gap-1 hover:text-blue-600"><ThumbsUp size={14} /> Support {support || ""}</button>
                        <button type="button" onClick={() => setExpandedComments((current) => ({ ...current, [post.id]: !expanded }))} className="flex items-center gap-1 hover:text-blue-600" aria-expanded={expanded} aria-controls={`comments-${post.id}`}><MessageCircle size={14} /> {post.comments.length} {post.comments.length === 1 ? "Comment" : "Comments"}</button>
                      </div>

                       {expanded && <section id={`comments-${post.id}`} aria-label={`Comments on ${displayName(post.users)}'s post`} className="mt-3 border-l-2 border-zinc-100 pl-3 dark:border-zinc-800">
                        {post.comments.length > 0 ? <ul className="space-y-3">{post.comments.map((comment) => <li key={comment.id} className="text-xs text-zinc-600 dark:text-zinc-300"><article><p><strong>{displayName(comment.users)}</strong> <time className="text-[10px] text-zinc-400" dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString()}</time></p><p className="mt-1 whitespace-pre-wrap leading-5">{comment.body}</p></article></li>)}</ul> : <p className="py-2 text-xs text-zinc-500">No comments yet. Be the first to add some helpful local context.</p>}
                        <form className="mt-3" onSubmit={(event) => { event.preventDefault(); void submitComment(post.id); }}>
                           <label htmlFor={`comment-${post.id}`} className="sr-only">Comment on {displayName(post.users)}&apos;s post</label>
                          <div className="flex gap-2"><textarea id={`comment-${post.id}`} value={draft} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value.slice(0, 1000) }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitComment(post.id); } }} maxLength={1000} rows={2} placeholder="Add a helpful comment" className="app-input min-w-0 flex-1 resize-y rounded-xl px-3 py-2 text-xs" /><button type="submit" disabled={submitting || !draft.trim()} className="self-end rounded-xl bg-zinc-100 px-3 py-2 text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300" aria-label={submitting ? "Posting comment" : "Send comment"}>{submitting ? <span className="text-xs">Posting...</span> : <Send size={14} />}</button></div>
                          <div className="mt-1 flex justify-between gap-2 text-[10px] text-zinc-400"><span>Press Enter to post. Shift+Enter adds a new line.</span><span>{draft.length}/1000</span></div>
                          {commentErrors[post.id] && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{commentErrors[post.id]}</p>}
                        </form>
                      </section>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
