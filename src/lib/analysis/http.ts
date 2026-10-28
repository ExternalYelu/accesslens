import "server-only";
import { analyzeImage } from "./analyze";
import { AnalysisError, publicError } from "./errors";
import { MAX_IMAGE_BYTES } from "./image";
import { DEFAULT_PROFILE, mobilityProfileSchema, type AnalysisEvent } from "./contract";

const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

async function boundedForm(request: Request): Promise<FormData> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new AnalysisError("IMAGE_TOO_LARGE");
  }
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    throw new AnalysisError("INVALID_INPUT");
  }
  if (!request.body) throw new AnalysisError("INVALID_INPUT");
  const reader = request.body.getReader();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]);
  const cancelRead = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancelRead, { once: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (signal.aborted) throw new AnalysisError(signal.reason?.name === "TimeoutError" ? "TIMEOUT" : "CANCELLED");
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AnalysisError("IMAGE_TOO_LARGE");
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks, total);
    return await new Response(body, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError(request.signal.aborted ? "CANCELLED" : "INVALID_INPUT");
  } finally {
    signal.removeEventListener("abort", cancelRead);
    reader.releaseLock();
  }
}

/** Development-only until distributed resource controls/auth are implemented. */
export function createAnalysisHandler(
  analyze: typeof analyzeImage = analyzeImage,
  isEnabled = () => process.env.NODE_ENV === "development",
) {
  let active = false;
  return async function POST(request: Request): Promise<Response> {
    let acquired = false;
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
    try {
      if (!isEnabled()) throw new AnalysisError("DISABLED");
      const url = new URL(request.url);
      // Next's development server can normalize request.url's loopback hostname.
      // Compare the browser Origin with the actual Host header, retaining protocol
      // and port; never accept a forwarded-host header supplied by a caller.
      const expectedOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
      if (request.headers.get("origin") !== expectedOrigin) throw new AnalysisError("ORIGIN");
      if (request.signal.aborted) throw new AnalysisError("CANCELLED");
      if (active) throw new AnalysisError("BUSY");
      active = true;
      acquired = true;
      const form = await boundedForm(request);
      if (form.get("consent") !== "true") throw new AnalysisError("CONSENT_REQUIRED");
      const file = form.get("image");
      if (!(file instanceof File) || form.getAll("image").length !== 1 || form.getAll("consent").length !== 1) {
        throw new AnalysisError("INVALID_INPUT");
      }
      let profile = DEFAULT_PROFILE;
      if (form.has("profile")) {
        try {
          if (form.getAll("profile").length !== 1 || typeof form.get("profile") !== "string") throw new Error();
          profile = mobilityProfileSchema.parse(JSON.parse(String(form.get("profile"))));
        } catch { throw new AnalysisError("INVALID_INPUT"); }
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (request.headers.get("accept") === "application/x-ndjson") {
        const abort = new AbortController();
        const signal = AbortSignal.any([request.signal, abort.signal]);
        let closed = false;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (event: AnalysisEvent) => {
              if (!closed && !signal.aborted) controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`));
            };
            void analyze(bytes, file.type, signal, undefined, { mobilityProfile: profile, onStage: stage => send({ type: "stage", stage }) })
              .then(result => send({ type: "result", result }))
              .catch(error => {
                const safe = publicError(error);
                send({ type: "error", code: safe.code, message: safe.message });
              }).finally(() => {
                active = false;
                if (!closed) { closed = true; controller.close(); }
              });
          },
          cancel() { closed = true; abort.abort(); },
        });
        acquired = false; // Stream owns the concurrency slot until upstream stops.
        return new Response(body, { headers: { ...headers, "Content-Type": "application/x-ndjson", "X-Accel-Buffering": "no" } });
      }
      const result = await analyze(bytes, file.type, request.signal, undefined, { mobilityProfile: profile });
      return Response.json(result, { headers });
    } catch (error) {
      const safe = publicError(error);
      return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status, headers });
    } finally { if (acquired) active = false; }
  };
}
