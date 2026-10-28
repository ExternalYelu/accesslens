import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { isAnimated, normalizedSize, validateUpload } from "../src/lib/capture/prepare-upload";
import { readAnalysis } from "../src/lib/capture/read-analysis";
import { parseAnalysisResult } from "../src/lib/analysis/contract";
import { analyzeImage } from "../src/lib/analysis/analyze";
import { asEvents, fakeClient, hasCode, sceneResponse, segmentationEvents, sse } from "./helpers";
import { parseSegmentation } from "../src/lib/meta/segment";

async function evidence() {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).png().toBuffer();
  const { client } = fakeClient(body => body.stream ? sse(segmentationEvents()) : sceneResponse());
  return analyzeImage(png, "image/png", undefined, client);
}

function ndjson(events: unknown[], split = 13) {
  const bytes = new TextEncoder().encode(events.map(event => JSON.stringify(event)).join("\n") + "\n");
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += split) controller.enqueue(bytes.slice(i, i + split));
    controller.close();
  } }), { headers: { "Content-Type": "application/x-ndjson" } });
}

test("local upload limits accept supported still formats and preserve image proportions", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.doesNotThrow(() => validateUpload({ type, size: 100 }));
  for (const file of [{ type: "image/heic", size: 100 }, { type: "image/png", size: 0 }, { type: "image/jpeg", size: 21 * 1024 * 1024 }]) assert.throws(() => validateUpload(file));
  assert.deepEqual(normalizedSize(4000, 3000), { width: 1600, height: 1200 });
  assert.deepEqual(normalizedSize(3000, 4000), { width: 1200, height: 1600 });
  assert.deepEqual(normalizedSize(30, 20), { width: 30, height: 20 });
  assert.throws(() => normalizedSize(5000, 5000));
  assert.throws(() => normalizedSize(0, 20));
});

test("animation control chunks are rejected without matching incidental compressed text", () => {
  const png = new Uint8Array(20); png.set(new TextEncoder().encode("acTL"), 12);
  assert.equal(isAnimated(png.buffer, "image/png"), true);
  const webp = new Uint8Array(20); webp.set(new TextEncoder().encode("ANIM"), 12);
  assert.equal(isAnimated(webp.buffer, "image/webp"), true);
  assert.equal(isAnimated(new ArrayBuffer(10), "image/png"), false);
});

test("client consumes split UTF-8 progress and requires a validated terminal result", async () => {
  const result = await evidence();
  result.scene.summary = "Un schéma synthétique.";
  const stages: string[] = [];
  const parsed = await readAnalysis(ndjson([{ type: "stage", stage: "validating" }, { type: "stage", stage: "observing" }, { type: "result", result }], 1), stage => stages.push(stage));
  assert.deepEqual(stages, ["validating", "observing"]);
  assert.equal(parsed.scene.summary, result.scene.summary);
  await assert.rejects(readAnalysis(ndjson([{ type: "stage", stage: "observing" }]), () => {}), hasCode("INCOMPLETE_OUTPUT"));
  await assert.rejects(readAnalysis(ndjson([{ type: "result", result }, { type: "stage", stage: "segmenting" }]), () => {}), hasCode("INVALID_OUTPUT"));
});

test("client refuses arbitrary formats, response quotas, and raw server error messages", async () => {
  await assert.rejects(readAnalysis(new Response("<html>"), () => {}), hasCode("INVALID_OUTPUT"));
  await assert.rejects(readAnalysis(ndjson([{ type: "error", code: "PROVIDER_AUTH", message: "SECRET-NOT-PUBLIC" }]), () => {}), error => {
    assert.ok(hasCode("PROVIDER_AUTH")(error));
    assert.ok(!(error as Error).message.includes("SECRET-NOT-PUBLIC")); return true;
  });
  await assert.rejects(readAnalysis(ndjson([{ type: "error", code: "constructor" }]), () => {}), hasCode("PROVIDER_UNAVAILABLE"));
  await assert.rejects(readAnalysis(new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { "content-type": "application/x-ndjson" } }), () => {}), hasCode("INVALID_OUTPUT"));
});

test("shared result contract rejects invalid masks, injected SVG, and ungrounded associations", async () => {
  const result = await evidence();
  assert.doesNotThrow(() => parseAnalysisResult(result));
  for (const mutate of [
    (copy: typeof result) => { copy.segmentation!.objects[0].svgPath = '<script>alert(1)</script>'; },
    (copy: typeof result) => { copy.segmentation!.objects[0].bounds.right = 9999; },
    (copy: typeof result) => { copy.segmentation!.sourceObservationId = "missing"; },
    (copy: typeof result) => { copy.segmentation!.status = "no_matches"; },
    (copy: typeof result) => { copy.mobilityProfile.measuredWidthCm = -10; },
  ]) {
    const copy = structuredClone(result); mutate(copy);
    assert.throws(() => parseAnalysisResult(copy), hasCode("INVALID_OUTPUT"));
  }
});

test("pixel contours are local to the mask bounds and never replace image boxes", async () => {
  const result = await parseSegmentation(asEvents(segmentationEvents()), { width: 4, height: 4 });
  assert.match(result.objects[0].svgPath, /^M/);
  assert.match(result.objects[0].svgPath, /Z$/);
  assert.equal(result.objects[0].areaPixels, 2);
  assert.deepEqual(result.objects[0].bounds, { left: 1, top: 1, right: 3, bottom: 3 });
});
