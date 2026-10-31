import { NextResponse, type NextRequest } from "next/server";
import { reassessCase } from "@/lib/case/reassessCase";
import { ConfigError } from "@/lib/env";
import { AppError, errorBody } from "@/lib/errors";
import { readFormCapped } from "@/lib/http";
import { checkRateLimit, clientKey, limitsFromEnv } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Comfortably under Vercel's 4.5 MB function request limit.
const MAX_REQUEST_BYTES = 4_400_000;

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const started = Date.now();
  try {
    checkRateLimit(clientKey(req.headers), limitsFromEnv());
    const form = await readFormCapped(req, MAX_REQUEST_BYTES, "Your screenshots are too large together. Remove one or use smaller images.");
    const result = await reassessCase(form, (entry) => console.info(JSON.stringify({ evt: "reassess", ...entry, totalMs: Date.now() - started })), requestId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const appErr =
      err instanceof AppError
        ? err
        : err instanceof ConfigError
          ? new AppError("CONFIG_INVALID", "Live analysis isn't configured on this server. See the README to add a Meta API key.", 500)
          : new AppError("MODEL_UNAVAILABLE", "Something went wrong on our side. Please try again.", 500);
    // Log only the error class — never request contents.
    console.warn(JSON.stringify({ evt: "reassess_error", requestId, code: appErr.code, totalMs: Date.now() - started }));
    const retryAfter = (appErr as AppError & { retryAfter?: number }).retryAfter;
    return NextResponse.json(errorBody(appErr, requestId), {
      status: appErr.status,
      headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
    });
  }
}
