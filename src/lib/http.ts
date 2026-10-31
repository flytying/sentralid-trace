import { AppError } from "./errors";

/**
 * Read a multipart body with a hard byte cap. The Content-Length check alone is not enough: a
 * chunked request has no Content-Length, and req.formData() would buffer it without limit.
 */
export async function readFormCapped(req: Request, maxBytes: number, tooLarge: string): Promise<FormData> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new AppError("PAYLOAD_TOO_LARGE", tooLarge, 413);
  if (!req.body) throw new AppError("NO_EVIDENCE", "We couldn't read what you sent. Please try again.", 400);

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new AppError("PAYLOAD_TOO_LARGE", tooLarge, 413);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return await new Response(body, { headers: { "content-type": req.headers.get("content-type") ?? "" } }).formData();
  } catch {
    throw new AppError("NO_EVIDENCE", "We couldn't read what you sent. Please try again.", 400);
  }
}
