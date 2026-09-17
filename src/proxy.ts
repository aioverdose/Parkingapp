import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

const PUBLIC_API_ROUTES = [
  "/api/courses",
  "/api/ads",
  "/api/directory/resolve",
  "/api/explore/categories",
  "/api/experience/profile",
  "/api/parking-information",
];

const AGENT_ROUTES = [
  "/api/agents",
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route) && !pathname.includes("submit"));
}

function isAgentRoute(pathname: string): boolean {
  return AGENT_ROUTES.some((route) => pathname.startsWith(route));
}

function isProtectedAgentRoute(pathname: string): boolean {
  return isAgentRoute(pathname) && !pathname.startsWith("/api/agents/chat") && !pathname.startsWith("/api/agents/parking-research");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isProtectedAgentRoute(pathname)) {
      const secret = request.headers.get("x-agent-secret");
      if (secret !== process.env.AGENT_SECRET_KEY) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!isPublicApiRoute(pathname) && !pathname.startsWith("/api/admin")) {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), geolocation=(self), microphone=(self), payment=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
  ],
};
