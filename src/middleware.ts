import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit POST requests to auth endpoints and pages (signin & signup)
  if (
    pathname === "/auth" ||
    pathname.startsWith("/api/auth/callback/credentials") ||
    pathname.startsWith("/api/auth/signin")
  ) {
    if (req.method === "POST") {
      const clientIp = getClientIp(req);
      const limitResult = checkRateLimit(`auth-middleware:${clientIp}`, 10, 15 * 60 * 1000);
      if (!limitResult.success) {
        return createRateLimitResponse(limitResult);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/auth", "/api/auth/:path*"],
};
