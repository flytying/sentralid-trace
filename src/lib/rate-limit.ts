// Spend guard for model-calling routes (TDD §7.2).
// This is a PER-INSTANCE, in-memory limiter: it protects a local or single-server run and slows
// down a single client, but it does NOT coordinate across serverless instances. A hosted public
// deployment must add platform-level rate limiting as well (see README "Hosting").
import { AppError } from "./errors";

interface Window {
  hits: number[];
}

const perClient = new Map<string, Window>();
const global: Window = { hits: [] };

export interface Limits {
  perClientPerMinute: number;
  perInstancePerHour: number;
}

export function limitsFromEnv(env: Record<string, string | undefined> = process.env): Limits {
  const num = (v: string | undefined, d: number) => (v && /^\d+$/.test(v) ? Number(v) : d);
  return {
    perClientPerMinute: num(env.RATE_LIMIT_PER_MINUTE, 8),
    perInstancePerHour: num(env.MODEL_CALLS_PER_HOUR, 300),
  };
}

export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "local";
}

/** Throws MODEL_RATE_LIMITED (with seconds to wait) when a limit is exceeded; otherwise records the hit. */
export function checkRateLimit(key: string, limits: Limits, now = Date.now()): void {
  const w = perClient.get(key) ?? { hits: [] };
  w.hits = w.hits.filter((t) => now - t < 60_000);
  global.hits = global.hits.filter((t) => now - t < 3_600_000);
  if (w.hits.length >= limits.perClientPerMinute) {
    const wait = Math.ceil((60_000 - (now - w.hits[0])) / 1000);
    throw Object.assign(new AppError("MODEL_RATE_LIMITED", `Too many checks from this connection. Please wait about ${wait} seconds and try again.`, 429), { retryAfter: wait });
  }
  if (global.hits.length >= limits.perInstancePerHour) {
    throw Object.assign(new AppError("MODEL_RATE_LIMITED", "Live analysis has reached its hourly limit on this server. Please try again later.", 429), { retryAfter: 600 });
  }
  w.hits.push(now);
  global.hits.push(now);
  perClient.set(key, w);
  // Keep the map bounded.
  if (perClient.size > 5000) perClient.delete(perClient.keys().next().value!);
}

export function resetRateLimits(): void {
  perClient.clear();
  global.hits = [];
}
