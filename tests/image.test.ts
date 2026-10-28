import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareImage, MAX_IMAGE_BYTES } from "../src/lib/analysis/image";
import { hasCode } from "./helpers";

const png = () => sharp({ create: { width: 32, height: 24, channels: 3, background: "red" } }).png().toBuffer();

test("fully decodes, normalizes, and hashes image bytes", async () => {
  const result = await prepareImage(await png(), "image/png");
  assert.equal(result.width, 32);
  assert.equal(result.height, 24);
  assert.match(result.dataUrl, /^data:image\/jpeg;base64,/);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal((await sharp(result.bytes).metadata()).format, "jpeg");
});

test("rejects MIME spoofing, malformed bytes, unsupported input, and excess size", async () => {
  await assert.rejects(prepareImage(await png(), "image/jpeg"), hasCode("INVALID_INPUT"));
  await assert.rejects(prepareImage(Buffer.from("<svg/>"), "image/png"), hasCode("INVALID_INPUT"));
  await assert.rejects(prepareImage(await png(), "image/heic"), hasCode("INVALID_INPUT"));
  await assert.rejects(prepareImage(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/png"), hasCode("IMAGE_TOO_LARGE"));
});

test("bounds decoded pixels and longest edge", async () => {
  const large = await sharp({ create: { width: 4100, height: 4100, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(prepareImage(large, "image/png"), hasCode("IMAGE_TOO_LARGE"));
  const wide = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "white" } }).png().toBuffer();
  const result = await prepareImage(wide, "image/png");
  assert.deepEqual([result.width, result.height], [1600, 800]);
});

test("applies EXIF orientation and drops metadata", async () => {
  const source = await sharp(await png()).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const result = await prepareImage(source, "image/jpeg");
  assert.deepEqual([result.width, result.height], [24, 32]);
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
});
