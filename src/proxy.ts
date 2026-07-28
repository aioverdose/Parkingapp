import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

const ADMIN_EMAIL = "spotimization@proton.me";

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

async function isAdminSession(req: NextRequest, res: NextResponse): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email === ADMIN_EMAIL;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isAgentRoute(pathname)) {
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

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const res = NextResponse.next();
    const authorized = await isAdminSession(request, res);
    if (!authorized) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    return res;
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
    "/admin/:path*",
  ],
};
