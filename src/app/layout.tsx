import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PWARegistration } from "@/components/PWARegistration";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
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
  title: "SpotMatch",
  description: "Find your perfect parking spot match",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SpotMatch",
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
      <body className="min-h-full flex flex-col">
        <PWARegistration />
        <PWAInstallBanner />
        {children}
      </body>
    </html>
  );
}
