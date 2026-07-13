import { TOS_CONTENT } from "@/lib/tos";

export default function TOSPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <a href="/" className="text-sm text-blue-600 hover:underline mb-1 inline-block">&larr; Back to App</a>
        <h1 className="text-xl font-bold">Terms of Service</h1>
        <p className="text-sm text-zinc-500">Version 1.0 &middot; Neighbor Parking Handoff</p>
      </header>
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {TOS_CONTENT}
        </pre>
      </div>
    </div>
  );
}
