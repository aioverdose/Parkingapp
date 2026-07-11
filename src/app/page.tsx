"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ParkingMap } from "@/components/ParkingMap";
import { BottomNav } from "@/components/BottomNav";

export default function Home() {

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-black font-sans">
      {/* Nav */}
      <nav className="relative z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 py-3">
          <div className="text-xl font-bold tracking-tight">
            <span className="text-blue-600">Spot</span>
            <span className="text-green-600">Match</span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            {["How it works", "Find a Spot", "Support"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          <a
            href="/auth/signup"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Find a Match
          </a>
        </div>
      </nav>

      {/* Hero + Map */}
      <main className="flex-1 relative">
        <ErrorBoundary>
          <ParkingMap fullHeight />
        </ErrorBoundary>

        {/* Hero text overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="h-full max-w-6xl mx-auto px-4 flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-lg max-w-2xl">
              Match with your perfect{" "}
              <span className="text-blue-400">parking spot</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 font-medium mt-3 max-w-lg drop-shadow">
              Set your schedule, pick your spot, and get matched with compatible drivers — all in one simple app.
            </p>
            <div className="flex gap-3 mt-6 pointer-events-auto">
              <a
                href="/auth/signup"
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-base shadow-lg hover:bg-green-700 transition-colors"
              >
                Get Started
              </a>
              <a
                href="#how-it-works"
                className="bg-white/20 backdrop-blur text-white border border-white/30 px-6 py-3 rounded-xl font-semibold text-base shadow-lg hover:bg-white/30 transition-colors"
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
