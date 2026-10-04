import { createHash } from "node:crypto";
import sharp from "sharp";
import exifr from "exifr";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export interface ImageAnalysis {
  sha256: string;
  perceptualHash: string;
  width: number;
  height: number;
  format: string;
  exif: Record<string, string | number>;
}
export async function analyzeImage(bytes: Buffer, declaredType: string): Promise<ImageAnalysis> {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw Object.assign(new Error("Image must be between 1 byte and 5 MB"), { status: 413 });
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if ((!png && !jpeg) || declaredType !== (png ? "image/png" : "image/jpeg")) throw Object.assign(new Error("Upload a valid JPG or PNG; file type and contents must match"), { status: 415 });
  try {
    const decoder = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await decoder.metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error("unsupported_image");
    const pixels = await decoder.rotate().flatten({ background: "#ffffff" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
    let bits = BigInt(0);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits = (bits << BigInt(1)) | BigInt(pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? 1 : 0);
    // Allowlist excludes GPS, owner names, serial numbers and arbitrary EXIF text.
    const raw: unknown = await exifr.parse(bytes, { pick: ["Make", "Model", "Orientation", "DateTimeOriginal"], gps: false });
    const exif: Record<string, string | number> = {};
    if (raw && typeof raw === "object") for (const key of ["Make", "Model", "Orientation", "DateTimeOriginal"]) {
      const value: unknown = (raw as Record<string, unknown>)[key];
      if (value instanceof Date && Number.isFinite(value.getTime())) exif[key] = value.toISOString();
      else if (typeof value === "string") exif[key] = value.slice(0, 160);
      else if (typeof value === "number" && Number.isFinite(value)) exif[key] = value;
    }
    return { sha256: createHash("sha256").update(bytes).digest("hex"), perceptualHash: bits.toString(16).padStart(16, "0"), width: metadata.width, height: metadata.height, format: png ? "png" : "jpeg", exif };
  } catch {
    throw Object.assign(new Error("Image cannot be safely decoded (maximum 25 megapixels)"), { status: 422 });
  }
}
