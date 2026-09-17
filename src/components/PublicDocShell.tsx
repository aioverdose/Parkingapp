import Link from "next/link";
import { AppPageShell } from "@/components/AppPageShell";

export function PublicDocShell({
  title,
  eyebrow,
  intro,
  children,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <AppPageShell title={title} eyebrow={eyebrow} intro={intro}>
      <article className="space-y-8 pb-8">
        {children}
      </article>
    </AppPageShell>
  );
}

export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-zinc-600">{children}</div>
    </section>
  );
}

export function DocCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="app-card public-card p-5 sm:p-6">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-zinc-600">{children}</div>
    </article>
  );
}

export function DocNotice({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "amber" }) {
  const styles = tone === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-950"
    : "border-blue-200 bg-blue-50 text-blue-950";
  return <aside className={`rounded-2xl border p-5 text-sm leading-6 ${styles}`}>{children}</aside>;
}

export function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-600">{children}</Link>;
}

export function Checklist({ items }: { items: string[] }) {
  return <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{item}</li>)}</ul>;
}
