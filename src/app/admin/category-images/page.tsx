"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ImagePlus, Ruler } from "lucide-react";
import { createBrowserClient } from "@/lib/supabaseClient";

type GalleryImage = { id: string; filename: string; image_url: string | null; thumbnail_url: string | null; alt_text: string; source: string; source_url: string | null; photographer_name: string | null; license_name: string | null; license_url: string | null; width: number | null; height: number | null; aspect_ratio: number | null; usage_tags: string[]; status: string };

export default function CategoryImagesPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) { setMessage("Your admin session has expired."); setLoading(false); return; }
      const response = await fetch("/api/admin/experience/category-images", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = await response.json().catch(() => ({})) as { data?: GalleryImage[]; error?: string };
      if (response.ok) setImages(body.data || []); else setMessage(body.error || "Could not load image gallery.");
      setLoading(false);
    }
    void load();
  }, []);

  return <main className="min-h-screen bg-[#f6f8f6] px-5 py-8 text-[#17211e] sm:px-8 lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e85d3f]">Admin / Experience management</p><div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-4xl font-black tracking-[-0.05em]">Image gallery</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#71807b]">Curated car, parking, meter, garage, and EV images with source, license, attribution, and responsive sizing metadata.</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#17211e] px-4 py-3 text-sm font-bold text-white"><ImagePlus className="h-4 w-4" />Add approved image</button></div>{message && <p role="alert" className="mt-5 rounded-xl bg-[#fff0eb] p-3 text-sm font-semibold text-[#8d3d2d]">{message}</p>}{loading ? <p className="mt-8 text-sm text-[#71807b]">Loading gallery...</p> : images.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#cbdcd3] bg-white p-10 text-center text-sm text-[#71807b]">No approved images yet.</div> : <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{images.map((image) => <article key={image.id} className="overflow-hidden rounded-3xl border border-[#dce3df] bg-white shadow-sm"><div className="relative aspect-[16/10] bg-[#e6f0e8]">{image.thumbnail_url || image.image_url ? <img src={image.thumbnail_url || image.image_url || ""} alt={image.alt_text} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#71807b]">No preview</div>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#3d7650]">{image.status}</span></div><div className="p-5"><h2 className="font-black">{image.alt_text}</h2><p className="mt-1 text-xs text-[#71807b]">{image.filename}</p><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#71807b]"><Ruler className="h-3.5 w-3.5 text-[#e85d3f]" />{image.width} × {image.height} · {image.aspect_ratio?.toFixed(2)}:1</div><div className="mt-3 flex flex-wrap gap-1">{image.usage_tags.map((tag) => <span key={tag} className="rounded-full bg-[#f6f8f6] px-2 py-1 text-[10px] font-bold text-[#71807b]">{tag}</span>)}</div><div className="mt-4 border-t border-[#edf0ee] pt-4 text-xs text-[#71807b]"><p>Source: {image.photographer_name || image.source}</p><p className="mt-1 font-semibold">{image.license_name}</p><div className="mt-3 flex gap-3">{image.source_url && <a href={image.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#e85d3f]">Source <ExternalLink className="h-3 w-3" /></a>}{image.license_url && <a href={image.license_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#e85d3f]">License <ExternalLink className="h-3 w-3" /></a>}</div></div></div></article>)}</section>}</div></main>;
}
