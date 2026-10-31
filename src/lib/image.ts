// Server-side image checks: content sniffing (never trust the declared type), dimensions and size.
import { AppError } from "./errors";

export const MAX_IMAGE_BYTES = 1_600_000;
export const MAX_TOTAL_BYTES = 4_000_000;
const MIN_SIDE = 120;
const MAX_SIDE = 8000;

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export function sniffImage(b: Buffer): ImageMime | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function imageSize(b: Buffer, mime: ImageMime): { width: number; height: number } | null {
  try {
    if (mime === "image/png") {
      if (b.toString("ascii", 12, 16) !== "IHDR") return null;
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    if (mime === "image/webp") {
      const chunk = b.toString("ascii", 12, 16);
      if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = b.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
      return null;
    }
    // JPEG: walk segments to the first start-of-frame marker.
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  } catch {
    return null;
  }
}

export async function readImage(file: File, label: string): Promise<{ mime: ImageMime; bytes: Buffer }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", `${label} is too large. Use a screenshot under 1.5 MB.`, 413);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) throw new AppError("FILE_TYPE_UNSUPPORTED", `${label} isn't a PNG, JPEG or WebP image.`, 415);
  const size = imageSize(bytes, mime);
  if (!size) throw new AppError("FILE_TYPE_UNSUPPORTED", `${label} couldn't be opened as an image.`, 415);
  if (Math.min(size.width, size.height) < MIN_SIDE) {
    throw new AppError("SCREENSHOT_UNREADABLE", `${label} is too small to read. Use a larger screenshot.`, 422);
  }
  if (Math.max(size.width, size.height) > MAX_SIDE) {
    throw new AppError("PAYLOAD_TOO_LARGE", `${label} is too large. Use a normal phone or desktop screenshot.`, 413);
  }
  return { mime, bytes };
}
