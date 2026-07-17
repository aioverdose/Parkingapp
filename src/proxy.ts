import { NextRequest, NextResponse } from "next/server";

const PUBLIC_API_ROUTES = [
  "/api/courses",
  "/api/ads",
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isAgentRoute(pathname)) {
      const secret = request.headers.get("x-agent-secret");
      if (secret !== process.env.AGENT_SECRET_KEY) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!isPublicApiRoute(pathname)) {
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

  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
