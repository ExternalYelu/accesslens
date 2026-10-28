import { test } from "node:test";
import assert from "node:assert/strict";
import { AnalysisError } from "../src/lib/analysis/errors";
import { analyzeImage } from "../src/lib/analysis/analyze";
import { boundedFetch, createMetaClient, MAX_PROVIDER_BYTES, providerError, stageSignal } from "../src/lib/meta/client";
import { observeScene } from "../src/lib/meta/observe";
import { parseSegmentation, segmentObject } from "../src/lib/meta/segment";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { asEvents, fakeClient, hasCode, lane, maskText, sceneResponse, segmentationEvents, sse, syntheticScene } from "./helpers";

const image = { bytes: Buffer.alloc(0), dataUrl: "data:image/jpeg;base64,synthetic", width: 4, height: 4, sha256: "synthetic" };

test("missing credentials fail without a provider call", () => {
  assert.throws(() => createMetaClient(""), hasCode("CONFIGURATION"));
});

test("Spark requests strict schema, no storage, and returns validated provenance", async () => {
  const { client, requests } = fakeClient(() => sceneResponse());
  const result = await observeScene(client, image);
  assert.deepEqual(result.scene, syntheticScene);
  assert.equal(result.provenance.outputMode, "json_schema");
  assert.equal(result.provenance.usage?.totalTokens, 150);
  assert.equal(requests[0].store, false);
  assert.equal(requests[0].model, "muse-spark-1.3");
  assert.deepEqual(requests[0].reasoning, { effort: "minimal" });
});

test("invalid/truncated Spark output never becomes accepted evidence", async () => {
  const invalid = fakeClient(() => sceneResponse("{broken"));
  await assert.rejects(observeScene(invalid.client, image), hasCode("INVALID_OUTPUT"));
  const incomplete = fakeClient(() => sceneResponse(JSON.stringify(syntheticScene), "incomplete"));
  await assert.rejects(observeScene(incomplete.client, image), hasCode("INCOMPLETE_OUTPUT"));
});

test("provider failures are sanitized, with no automatic retry", async () => {
  const cases = [[401, "PROVIDER_AUTH"], [403, "PROVIDER_AUTH"], [429, "PROVIDER_RATE_LIMIT"],
    [500, "PROVIDER_UNAVAILABLE"], [400, "PROVIDER_REJECTED"], [408, "TIMEOUT"]] as const;
  for (const [status, code] of cases) {
    const { client, requests } = fakeClient(() => Response.json({ error: { message: "SECRET-MUST-NOT-LEAK", type: "test" } }, { status }));
    await assert.rejects(observeScene(client, image), error => {
      assert.ok(error instanceof AnalysisError);
      assert.equal(error.code, code);
      assert.ok(!error.message.includes("SECRET-MUST-NOT-LEAK"));
      return true;
    });
    assert.equal(requests.length, 1);
  }
});

test("cancellation and deadlines remain distinct", async () => {
  const cancelled = AbortSignal.abort();
  const { client, requests } = fakeClient(() => sceneResponse());
  await assert.rejects(observeScene(client, image, cancelled), hasCode("CANCELLED"));
  assert.equal(requests.length, 0);
  const timeout = AbortSignal.abort(new DOMException("not public", "TimeoutError"));
  assert.equal(providerError(new Error("private"), timeout).code, "TIMEOUT");
  assert.equal(stageSignal(cancelled).aborted, true);
});

test("upstream body is bounded even when headers advertise no length", async () => {
  const transport: typeof fetch = async () => new Response(new Uint8Array(MAX_PROVIDER_BYTES + 1));
  const response = await boundedFetch(transport)("https://example.test");
  await assert.rejects(response.arrayBuffer(), hasCode("INVALID_OUTPUT"));
});

test("official parser accepts arbitrarily split mask deltas and Meta's lane finalizer", async () => {
  const result = await parseSegmentation(asEvents(segmentationEvents()), image);
  assert.equal(result.status, "completed");
  assert.equal(result.objects[0].objectId, "7");
  assert.equal(result.objects[0].areaPixels, 2);
  assert.deepEqual(result.objects[0].bounds, { left: 1, top: 1, right: 3, bottom: 3 });
  assert.deepEqual(result.objects[0].mask.size, [2, 2]);
});

test("a completed empty lane is no_matches, never a clear-floor assertion", async () => {
  const result = await parseSegmentation(asEvents(segmentationEvents("")), image);
  assert.equal(result.status, "no_matches");
  assert.deepEqual(result.objects, []);
});

test("partial, malformed, out-of-bounds, wrong-size, or refused segmentation is rejected", async () => {
  await assert.rejects(parseSegmentation(asEvents(segmentationEvents(maskText, false)), image), hasCode("INCOMPLETE_OUTPUT"));
  await assert.rejects(parseSegmentation(asEvents(segmentationEvents("garbage")), image), hasCode("INVALID_OUTPUT"));
  await assert.rejects(parseSegmentation(asEvents(segmentationEvents(maskText)), { width: 2, height: 2 }), hasCode("INVALID_OUTPUT"));
  await assert.rejects(parseSegmentation(asEvents(segmentationEvents(maskText.replace("w=4;h=4", "w=8;h=8"))), image), hasCode("INVALID_OUTPUT"));
  await assert.rejects(parseSegmentation(asEvents([{ type: "response.refusal.done", ...lane, refusal: "private" }]), image), hasCode("REFUSED"));
});

test("SAM transport preserves model, concept, no-storage setting, and decoded masks", async () => {
  const { client, requests } = fakeClient(() => sse(segmentationEvents()));
  const result = await segmentObject(client, image, "red square");
  assert.equal(requests[0].model, "sam-3.1");
  assert.equal(requests[0].store, false);
  assert.equal(result.objects[0].areaPixels, 2);
  assert.equal(result.provenance.responseId, "resp_sam_synthetic");
});

test("linked pipeline sends at most one SAM concept and never returns image bytes", async () => {
  const svg = await readFile(new URL("./fixtures/contract-scene.svg", import.meta.url));
  const png = await sharp(svg).resize(4, 4).png().toBuffer();
  const { client, requests } = fakeClient(body => body.stream ? sse(segmentationEvents()) : sceneResponse());
  const result = await analyzeImage(png, "image/png", undefined, client);
  assert.equal(requests.length, 2);
  assert.equal(result.segmentation?.sourceObservationId, "object-1");
  assert.equal(result.segmentation?.association, "concept-query-source-only");
  assert.equal(result.status, "observations_only");
  assert.ok(!JSON.stringify(result).includes("base64"));
});

test("rejects declared mask allocation beyond input dimensions before decoding", async () => {
  const oversized = maskText.replace("data=2,2,", "data=20000,20000,");
  await assert.rejects(parseSegmentation(asEvents(segmentationEvents(oversized)), image), hasCode("INVALID_OUTPUT"));
});

test("explicit incomplete completion and a transport abort cannot become no_matches", async () => {
  const events = segmentationEvents(maskText, false);
  events.push({ type: "response.incomplete", response: { incomplete_details: { reason: "max_output_tokens" } } });
  await assert.rejects(parseSegmentation(asEvents(events), image), hasCode("INCOMPLETE_OUTPUT"));
  const controller = new AbortController();
  const { client } = fakeClient(() => {
    const events = segmentationEvents();
    return new Response(new ReadableStream({
      start(stream) {
        stream.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(events[0])}\n\n`));
        controller.abort();
        stream.error(new Error("private transport detail"));
      },
    }), { headers: { "content-type": "text/event-stream" } });
  });
  await assert.rejects(segmentObject(client, image, "red square", controller.signal), hasCode("CANCELLED"));
});

test("an empty scene makes no segmentation request and retains limitations", async () => {
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "white" } }).png().toBuffer();
  const { client, requests } = fakeClient(() => sceneResponse(JSON.stringify({ ...syntheticScene, objects: [] })));
  const result = await analyzeImage(png, "image/png", undefined, client);
  assert.equal(requests.length, 1);
  assert.equal(result.segmentation, null);
  assert.ok(result.limits.length > 0);
});
