import "server-only";
import OpenAI from "openai";
import { AnalysisError } from "../analysis/errors";

export const META_BASE_URL = "https://api.meta.ai/v1";
export const SPARK_MODEL = "muse-spark-1.3";
export const SAM_MODEL = "sam-3.1";
export const REQUEST_TIMEOUT_MS = 45_000;
export const MAX_PROVIDER_BYTES = 8 * 1024 * 1024;

/** Bound even a malformed/never-ending upstream body; do not cache image requests. */
export function boundedFetch(transport: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await transport(input, { ...init, cache: "no-store", redirect: "error" });
    if (!response.body) return response;
    let total = 0;
    const body = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength;
        if (total > MAX_PROVIDER_BYTES) throw new AnalysisError("INVALID_OUTPUT");
        controller.enqueue(chunk);
      },
    }));
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}

export function createMetaClient(apiKey = process.env.MODEL_API_KEY, transport?: typeof fetch): OpenAI {
  if (!apiKey?.trim() || /^(replace_|your_)/i.test(apiKey)) throw new AnalysisError("CONFIGURATION");
  return new OpenAI({
    apiKey: apiKey.trim(), baseURL: META_BASE_URL,
    maxRetries: 0, timeout: REQUEST_TIMEOUT_MS,
    fetch: boundedFetch(transport),
  });
}

export function providerError(error: unknown, signal?: AbortSignal): AnalysisError {
  if (signal?.aborted) {
    return new AnalysisError(signal.reason?.name === "TimeoutError" ? "TIMEOUT" : "CANCELLED");
  }
  if (error instanceof AnalysisError) return error;
  if (error instanceof OpenAI.APIConnectionTimeoutError) return new AnalysisError("TIMEOUT");
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return new AnalysisError("PROVIDER_AUTH");
    if (error.status === 429) return new AnalysisError("PROVIDER_RATE_LIMIT");
    if (error.status === 408 || error.status === 504) return new AnalysisError("TIMEOUT");
    if (error.status && error.status < 500) return new AnalysisError("PROVIDER_REJECTED");
  }
  return new AnalysisError("PROVIDER_UNAVAILABLE");
}

export function stageSignal(parent?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

export function safeIdentifier(value: unknown): string | null {
  return typeof value === "string" && /^[\w.:-]{1,160}$/.test(value) ? value : null;
}

export function tokenUsage(value: unknown): { inputTokens: number; outputTokens: number; totalTokens: number } | null {
  if (!value || typeof value !== "object") return null;
  const usage = value as Record<string, unknown>;
  const valid = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  if (!valid(usage.input_tokens) || !valid(usage.output_tokens) || !valid(usage.total_tokens)) return null;
  return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: usage.total_tokens };
}
