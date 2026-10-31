// Browser-side image preparation: type check, then downscale/re-encode so text stays readable
// while the whole request stays under the server's limits. Images never leave memory otherwise.

export const CLIENT_MAX_IMAGE_BYTES = 1_500_000;
export const CLIENT_MAX_TOTAL_BYTES = 3_800_000;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIDE = 2000;
const KEEP_AS_IS_BYTES = 900_000;

export class PrepareError extends Error {}

export async function prepareImage(file: File): Promise<File> {
  if (!ACCEPTED.includes(file.type)) {
    throw new PrepareError("Use a PNG, JPG or WebP screenshot.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PrepareError("We couldn't open that image. Try another screenshot.");
  }
  const { width, height } = bitmap;
  if (Math.min(width, height) < 120) {
    bitmap.close();
    throw new PrepareError("That image is too small to read. Use a full screenshot.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PrepareError("We couldn't prepare that image. Try another screenshot.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= CLIENT_MAX_IMAGE_BYTES) {
      return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
    }
  }
  throw new PrepareError("That image is too large even after shrinking. Crop it and try again.");
}
