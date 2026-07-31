"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Eye, FileText, FolderOpen, Beaker, Terminal, Command } from "lucide-react";

const COMMANDS = [
  {
    icon: Play,
    title: "Run all tests",
    cmd: "npm test",
    desc: "Runs the full test suite once — used in CI and before pushing.",
  },
  {
    icon: Eye,
    title: "Watch mode",
    cmd: "npm run test:watch",
    desc: "Runs tests in watch mode. Tests re-run automatically when files change — ideal during development.",
  },
];

const SECTIONS = [
  {
    icon: FolderOpen,
    title: "Where tests live",
    items: [
      "Tests sit in __tests__ folders next to the source file they test.",
      "Example: src/lib/utils.ts → src/lib/__tests__/utils.test.ts",
      "Name files *.test.ts or *.test.tsx.",
    ],
  },
  {
    icon: FileText,
    title: "Writing a test",
    items: [
      "Use describe / it / expect from vitest (imported automatically via globals: true in config).",
      "Tests run in a Node.js environment (no browser DOM by default).",
      "Use the @ alias to import source files: import { cn } from '@/lib/utils'.",
    ],
  },
  {
    icon: Beaker,
    title: "Existing tests",
    items: [
      "src/lib/__tests__/utils.test.ts — tests the cn() class name utility",
      "src/lib/__tests__/rate-limit.test.ts — tests the API rate limiter",
    ],
  },
];

const SAMPLE_CODE = `import { describe, it, expect } from "vitest";
import { myFunction } from "@/path/to/module";

describe("myFunction", () => {
  it("returns expected output", () => {
    expect(myFunction("input")).toBe("output");
  });

  it("handles edge cases", () => {
    expect(myFunction(null)).toBeNull();
  });
});`;

const CONFIG = `import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});`;

export default function TestingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/support")} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Testing Guide</h1>
        </div>

        {/* Commands */}
        <h2 className="text-lg font-bold mb-3">Commands</h2>
        <div className="grid gap-3 mb-8">
          {COMMANDS.map((item) => (
            <div key={item.cmd} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <item.icon size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
              </div>
              <div className="ml-13 mt-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5">
                <code className="text-sm font-mono text-zinc-800 dark:text-zinc-200">{item.cmd}</code>
              </div>
            </div>
          ))}
        </div>

        {/* Structure */}
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <section.icon size={18} className="text-purple-600" />
              </div>
              <h2 className="text-lg font-bold">{section.title}</h2>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {/* Sample test */}
        <h2 className="text-lg font-bold mb-3">Sample test</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
          <pre className="text-sm font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre">{SAMPLE_CODE}</pre>
        </div>

        {/* Config */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Command size={18} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold">Vitest Config</h2>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 mb-8">
          <pre className="text-sm font-mono text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre">{CONFIG}</pre>
        </div>

        {/* Link to vitest docs */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="font-bold mb-2">Learn More</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Vitest is the test runner. See the official docs for matchers, mocking, and advanced features.
          </p>
          <a
            href="https://vitest.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
          >
            <Terminal size={16} />
            vitest.dev
          </a>
        </div>
      </div>
    </div>
  );
}
