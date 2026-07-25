import { NextResponse } from "next/server";

interface RateLimitOptions {
  intervalMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class MemoryRateLimiter {
  private hits = new Map<string, number[]>();

  constructor() {
    // Periodically clean up stale entries every 5 minutes
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  public check(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = this.hits.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= limit) {
      const oldestInWindow = validTimestamps[0];
      const reset = Math.ceil((oldestInWindow + windowMs - now) / 1000);

      this.hits.set(key, validTimestamps);
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.max(1, reset),
      };
    }

    validTimestamps.push(now);
    this.hits.set(key, validTimestamps);

    return {
      success: true,
      limit,
      remaining: limit - validTimestamps.length,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((ts) => now - ts < 60 * 60 * 1000);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }
}

const rateLimiter = new MemoryRateLimiter();

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return rateLimiter.check(key, limit, windowMs);
}

export function getClientIp(req: Request): string {
  // Cloudflare sets CF-Connecting-IP as the true client IP (cannot be spoofed by client header)
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.reset),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}
