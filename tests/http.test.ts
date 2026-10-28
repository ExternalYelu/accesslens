import { test } from "node:test";
import assert from "node:assert/strict";
import { createAnalysisHandler } from "../src/lib/analysis/http";
import type { analyzeImage } from "../src/lib/analysis/analyze";

const stubResult = { status: "observations_only" } as Awaited<ReturnType<typeof analyzeImage>>;
const stub: typeof analyzeImage = async () => stubResult;

function request(consent = "true", origin = "http://localhost:3000") {
  const form = new FormData();
  form.append("consent", consent);
  form.append("image", new File([new Uint8Array([1, 2])], "test.png", { type: "image/png" }));
  return new Request("http://localhost:3000/api/analyze", { method: "POST", headers: { origin }, body: form });
}

test("development endpoint requires same-origin consent and disables production access", async () => {
  const handler = createAnalysisHandler(stub, () => true);
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request("false"))).status, 400);
  assert.equal((await handler(request("true", "https://elsewhere.test"))).status, 403);
  assert.equal((await createAnalysisHandler(stub, () => false)(request())).status, 503);
});

test("rejects duplicate/missing files and oversized streamed bodies before inference", async () => {
  let calls = 0;
  const handler = createAnalysisHandler(async () => { calls++; return stubResult; }, () => true);
  const form = new FormData();
  form.append("consent", "true");
  assert.equal((await handler(new Request("http://localhost:3000/api/analyze", {
    method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
  }))).status, 400);
  form.append("image", new File(["first"], "first.png", { type: "image/png" }));
  form.append("image", new File(["second"], "second.png", { type: "image/png" }));
  assert.equal((await handler(new Request("http://localhost:3000/api/analyze", {
    method: "POST", headers: { origin: "http://localhost:3000" }, body: form,
  }))).status, 400);
  const tooLarge = new Request("http://localhost:3000/api/analyze", {
    method: "POST", headers: { origin: "http://localhost:3000", "content-type": "multipart/form-data; boundary=x" },
    body: new Uint8Array(4 * 1024 * 1024 + 65537),
  });
  assert.equal((await handler(tooLarge)).status, 413);
  assert.equal(calls, 0);
});

test("bounds concurrency and releases the slot after a failure without leaking errors", async () => {
  let finish: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  const handler = createAnalysisHandler(async () => { await waiting; throw new Error("PRIVATE-PAYLOAD"); }, () => true);
  const first = handler(request());
  assert.equal((await handler(request())).status, 429);
  finish!();
  const response = await first;
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(!(await response.text()).includes("PRIVATE-PAYLOAD"));
  assert.equal((await handler(request())).status, 502);
});

test("handles Next's normalized loopback URL while retaining Host, scheme, and port checks", async () => {
  const handler = createAnalysisHandler(stub, () => true);
  const body = await request().formData();
  const normalized = (origin: string) => new Request("http://localhost:3000/api/analyze", {
    method: "POST", headers: { host: "127.0.0.1:3000", origin }, body,
  });
  assert.equal((await handler(normalized("http://127.0.0.1:3000"))).status, 200);
  assert.equal((await handler(normalized("http://127.0.0.1:4000"))).status, 403);
  assert.equal((await handler(normalized("https://127.0.0.1:3000"))).status, 403);
});

test("streamed analysis reports genuine stages and keeps the slot until inference ends", async () => {
  let finish: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => { finish = resolve; });
  const handler = createAnalysisHandler(async (_bytes, _type, _signal, _client, options) => {
    options?.onStage?.("observing"); await waiting; return stubResult;
  }, () => true);
  const incoming = request(); incoming.headers.set("accept", "application/x-ndjson");
  const response = await handler(incoming);
  const reader = response.body!.getReader();
  assert.equal(response.headers.get("content-type"), "application/x-ndjson");
  assert.match(new TextDecoder().decode((await reader.read()).value), /observing/);
  assert.equal((await handler(request())).status, 429);
  finish!();
  assert.match(new TextDecoder().decode((await reader.read()).value), /result/);
  await reader.read();
  assert.equal((await handler(request())).status, 200);
});

test("invalid mobility inputs fail before inference; stream errors are sanitized", async () => {
  let calls = 0;
  const handler = createAnalysisHandler(async () => { calls++; throw new Error("PRIVATE-DETAIL"); }, () => true);
  const original = request(); const form = await original.formData();
  form.append("profile", JSON.stringify({ kind: "wheelchair", measuredWidthCm: -1 }));
  assert.equal((await handler(new Request(original.url, { method: "POST", headers: { origin: "http://localhost:3000" }, body: form }))).status, 400);
  assert.equal(calls, 0);
  const streamed = request(); streamed.headers.set("accept", "application/x-ndjson");
  const text = await (await handler(streamed)).text();
  assert.match(text, /PROVIDER_UNAVAILABLE/);
  assert.ok(!text.includes("PRIVATE-DETAIL"));
});

test("cancelling the response stream aborts upstream before freeing its slot", async () => {
  let sawAbort = false;
  const handler = createAnalysisHandler(async (_bytes, _type, signal, _client, options) => {
    options?.onStage?.("observing");
    await new Promise<void>(resolve => signal!.addEventListener("abort", () => { sawAbort = true; resolve(); }, { once: true }));
    return stubResult;
  }, () => true);
  const incoming = request(); incoming.headers.set("accept", "application/x-ndjson");
  const response = await handler(incoming);
  const reader = response.body!.getReader();
  await reader.read(); await reader.cancel();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sawAbort, true);
});
