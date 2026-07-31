"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ParkingMap } from "@/components/ParkingMap";
import { BottomNav } from "@/components/BottomNav";
import { AdBanner } from "@/components/AdBanner";

export default function Home() {

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-black font-sans">
      {/* Nav */}
      <nav className="relative z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 py-3">
          <div className="text-xl font-bold tracking-tight">
            <span className="text-blue-600">Parking</span>
            <span className="text-blue-600">Meeters</span>
          </div>

          <div className="hidden sm:flex items-center gap-6">
            <a
              href="/support"
              className="text-sm font-medium text-zinc-500 hover:text-blue-600 transition-colors"
            >
              Support
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/auth/login"
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-colors"
            >
              Log In
            </a>
            <a
              href="/auth/signup"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>
      </nav>

      {/* Top ad banner */}
      <div className="relative z-30 px-4 py-2 max-w-6xl mx-auto w-full">
        <AdBanner />
      </div>

      {/* Hero + Map */}
      <main className="flex-1 relative">
        <Suspense fallback={<div className="h-full w-full bg-zinc-50 dark:bg-zinc-950 animate-pulse" />}>
          <ErrorBoundary>
            <ParkingMap fullHeight />
          </ErrorBoundary>
        </Suspense>

        {/* Hero text overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="relative h-full max-w-6xl mx-auto px-4 flex flex-col justify-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-black max-w-2xl">
              Meet Your Parking Match
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 font-medium mt-3 max-w-lg">
              Connecting drivers that are coming and going
            </p>

          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
