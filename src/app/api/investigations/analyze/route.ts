import { NextResponse, type NextRequest } from "next/server";
import { analyzeCase } from "@/lib/case/analyze";
import { ConfigError } from "@/lib/env";
import { AppError, errorBody } from "@/lib/errors";
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
    const declared = Number(req.headers.get("content-length") ?? "0");
    if (declared > MAX_REQUEST_BYTES) {
      throw new AppError("PAYLOAD_TOO_LARGE", "Your screenshots are too large together. Remove one or use smaller images.", 413);
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("NO_EVIDENCE", "We couldn't read what you sent. Please try again.", 400);
    }
    const result = await analyzeCase(form, (entry) => console.info(JSON.stringify({ evt: "analyze", ...entry, totalMs: Date.now() - started })), requestId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const appErr =
      err instanceof AppError
        ? err
        : err instanceof ConfigError
          ? new AppError("CONFIG_INVALID", "Live analysis isn't configured on this server. See the README to add a Meta API key.", 500)
          : new AppError("MODEL_UNAVAILABLE", "Something went wrong on our side. Please try again.", 500);
    // Log only the error class — never request contents.
    console.warn(JSON.stringify({ evt: "analyze_error", requestId, code: appErr.code, totalMs: Date.now() - started }));
    const retryAfter = (appErr as AppError & { retryAfter?: number }).retryAfter;
    return NextResponse.json(errorBody(appErr, requestId), {
      status: appErr.status,
      headers: { "Cache-Control": "no-store", ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) },
    });
  }
}
