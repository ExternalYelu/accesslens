import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { AnalysisError } from "./errors";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const MAX_IMAGE_EDGE = 1600;

export interface PreparedImage {
  bytes: Buffer;
  dataUrl: string;
  width: number;
  height: number;
  sha256: string;
}

export async function prepareImage(bytes: Uint8Array, declaredType: string): Promise<PreparedImage> {
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new AnalysisError("IMAGE_TOO_LARGE");
  if (!bytes.byteLength) throw new AnalysisError("INVALID_INPUT");
  const expectedFormats: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp",
  };
  if (!expectedFormats[declaredType]) throw new AnalysisError("INVALID_INPUT");
  try {
    const metadata = await sharp(bytes, { limitInputPixels: false }).metadata();
    if (!metadata.width || !metadata.height) throw new AnalysisError("INVALID_INPUT");
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) throw new AnalysisError("IMAGE_TOO_LARGE");
    if (metadata.format !== expectedFormats[declaredType] || (metadata.pages ?? 1) !== 1) {
      throw new AnalysisError("INVALID_INPUT");
    }
    // Force a complete decode, honor EXIF orientation, bound size, drop metadata.
    const result = await sharp(bytes, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "warning" })
      .rotate().resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
    if (result.data.byteLength > MAX_IMAGE_BYTES) throw new AnalysisError("IMAGE_TOO_LARGE");
    return {
      bytes: result.data,
      dataUrl: `data:image/jpeg;base64,${result.data.toString("base64")}`,
      width: result.info.width,
      height: result.info.height,
      sha256: createHash("sha256").update(result.data).digest("hex"),
    };
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError("INVALID_INPUT");
  }
}
