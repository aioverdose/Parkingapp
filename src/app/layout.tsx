import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PWARegistration } from "@/components/PWARegistration";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PresenceTracker } from "@/components/PresenceTracker";
import { BottomNav } from "@/components/BottomNav";
import { AppAppearanceProvider } from "@/components/AppAppearanceProvider";
import { PendingMatchBanner } from "@/components/PendingMatchBanner";
import { PotentialMatchBanner } from "@/components/PotentialMatchBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Parking Meeters | Better parking together",
  applicationName: "Parking Meeters",
  description: "Private parking coordination for restaurants, bars, and operators on Belmont Shore and 2nd Street.",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  appleWebApp: {
    capable: true,
    title: "Parking Meeters",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f3f7f3] text-[#13231d]">
        <PWARegistration />
        <PWAInstallBanner />
        <PresenceTracker />
        <AppAppearanceProvider />
        <PotentialMatchBanner />
        <PendingMatchBanner />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
