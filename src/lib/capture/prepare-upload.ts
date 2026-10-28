export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_PIXELS = 16_000_000;
export const MAX_UPLOAD_EDGE = 1600;

export function validateUpload(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPEG, PNG, or WebP image. HEIC and other formats are not supported yet.",
    );
  if (!file.size) throw new Error("This file is empty. Choose another photo.");
  if (file.size > MAX_UPLOAD_BYTES)
    throw new Error("Choose an image smaller than 20 MB.");
}

/** Detect animation control chunks, not incidental strings inside compressed data. */
export function isAnimated(bytes: ArrayBuffer, type: string): boolean {
  const data = new DataView(bytes);
  const tag = (offset: number) =>
    String.fromCharCode(...new Uint8Array(bytes, offset, 4));
  if (type === "image/png") {
    for (let offset = 8; offset + 12 <= data.byteLength;) {
      const size = data.getUint32(offset);
      if (tag(offset + 4) === "acTL") return true;
      offset += size + 12;
    }
  } else if (type === "image/webp") {
    for (let offset = 12; offset + 8 <= data.byteLength;) {
      const size = data.getUint32(offset + 4, true);
      if (tag(offset) === "ANIM" || tag(offset) === "ANMF") return true;
      offset += 8 + size + (size % 2);
    }
  }
  return false;
}

export function normalizedSize(width: number, height: number) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  )
    throw new Error("This image could not be decoded. Choose another photo.");
  if (width * height > MAX_UPLOAD_PIXELS)
    throw new Error("Choose a photo with 16 million pixels or fewer.");
  const ratio = Math.min(1, MAX_UPLOAD_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function prepareUpload(file: File) {
  validateUpload(file);
  if (isAnimated(await file.arrayBuffer(), file.type))
    throw new Error("Animated images are not supported. Choose a still photo.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "This image could not be decoded. Try a different JPEG, PNG, or WebP image.",
    );
  }
  try {
    const size = normalizedSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Image preparation is unavailable in this browser. Try another browser.",
      );
    context.fillStyle = "white";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    canvas.width = canvas.height = 0;
    if (!blob || blob.size > 4 * 1024 * 1024)
      throw new Error("The processed image is too large. Try a smaller photo.");
    return {
      ...size,
      file: new File([blob], "scene.jpg", { type: "image/jpeg" }),
    };
  } finally {
    bitmap.close();
  }
}
