import "server-only";
import type OpenAI from "openai";
import { decodeMaskToRaster, decodeMaskToRLE, decodeMaskToSVGPath, parseImageStream, recordsOfKind, ResponsesStreamError, ResponsesStreamRefusalError } from "@meta-sam/parser";
import type { ResponsesEvent } from "@meta-sam/parser";
import { AnalysisError } from "../analysis/errors";
import type { PreparedImage } from "../analysis/image";
import { providerError, safeIdentifier, SAM_MODEL, stageSignal, tokenUsage } from "./client";

type WireEvent = { readonly type: string };
export interface ImageSize { width: number; height: number }
const MAX_SEGMENTATION_CHARACTERS = 2 * 1024 * 1024;

// The official parser decodes masks while reading. Check declared raster sizes
// before handing text to it, so a tiny payload cannot request a huge allocation.
async function* guardedEvents(events: AsyncIterable<WireEvent>, image: ImageSize): AsyncIterable<WireEvent> {
  let text = "";
  function validate(candidate: string) {
    if (candidate.length > MAX_SEGMENTATION_CHARACTERS) throw new AnalysisError("INVALID_OUTPUT");
    const headers = [...candidate.matchAll(/data=(\d+),(\d+),/g)];
    if (headers.length > 32) throw new AnalysisError("INVALID_OUTPUT");
    let totalPixels = 0;
    for (const header of headers) {
      const height = Number(header[1]);
      const width = Number(header[2]);
      totalPixels += height * width;
      if (!Number.isSafeInteger(height * width) || height < 1 || width < 1
        || height > image.height || width > image.width || height * width > image.width * image.height || totalPixels > 8_000_000) {
        throw new AnalysisError("INVALID_OUTPUT");
      }
    }
  }
  for await (const event of events) {
    const value = event as WireEvent & { delta?: unknown; text?: unknown; part?: { type?: unknown; text?: unknown } };
    if (value.type === "response.output_text.delta" && typeof value.delta === "string") {
      text += value.delta;
      validate(text);
    } else if (value.type === "response.output_text.done" && typeof value.text === "string") {
      validate(value.text);
    } else if (value.type === "response.content_part.done" && value.part?.type === "output_text" && typeof value.part.text === "string") {
      validate(value.part.text);
    }
    yield event;
  }
}

/** Validate image-coordinate evidence only. A decoded mask is never a floor footprint. */
export async function parseSegmentation(events: AsyncIterable<WireEvent>, image: ImageSize) {
  try {
    const parsed = await parseImageStream(guardedEvents(events, image)).finalResult;
    if (parsed.outcome.status !== "completed") throw new AnalysisError("INCOMPLETE_OUTPUT");
    if (parsed.diagnostics.length || recordsOfKind(parsed.records, "text").length) {
      throw new AnalysisError("INVALID_OUTPUT");
    }
    const boxes = recordsOfKind(parsed.records, "box");
    const masks = recordsOfKind(parsed.records, "mask");
    if (boxes.length !== masks.length || masks.length > 32) throw new AnalysisError("INVALID_OUTPUT");
    const sourceSizes = [...parsed.rawOutput.matchAll(/<\|box;[^|]*;w=(\d+);h=(\d+)(?:;c=[^|]+)?\|>/g)];
    if (sourceSizes.length !== boxes.length || sourceSizes.some(match => Number(match[1]) !== image.width || Number(match[2]) !== image.height)) {
      throw new AnalysisError("INVALID_OUTPUT");
    }
    const seen = new Set<string>();
    let totalPathCharacters = 0;
    const objects = masks.map(record => {
      const { mask, bounds, objectId } = record;
      if (seen.has(objectId) || (record.frame?.frameIndex ?? 0) !== 0) throw new AnalysisError("INVALID_OUTPUT");
      seen.add(objectId);
      if (![bounds.left, bounds.top, bounds.right, bounds.bottom, mask.width, mask.height].every(Number.isSafeInteger)
        || bounds.left < 0 || bounds.top < 0 || bounds.right > image.width || bounds.bottom > image.height
        || bounds.left >= bounds.right || bounds.top >= bounds.bottom
        || mask.width <= 0 || mask.height <= 0 || mask.width * mask.height > image.width * image.height
        || mask.width !== bounds.right - bounds.left || mask.height !== bounds.bottom - bounds.top
        || boxes.filter(box => box.objectId === objectId).length !== 1) {
        throw new AnalysisError("INVALID_OUTPUT");
      }
      const raster = decodeMaskToRaster(mask);
      let areaPixels = 0;
      for (const pixel of raster) areaPixels += pixel;
      const svgPath = decodeMaskToSVGPath(mask);
      totalPathCharacters += svgPath.length;
      if (totalPathCharacters > 1_000_000) throw new AnalysisError("INVALID_OUTPUT");
      return { objectId, bounds, confidence: record.confidence ?? null, areaPixels, mask: decodeMaskToRLE(mask), svgPath };
    });
    return { status: objects.length ? "completed" as const : "no_matches" as const, objects };
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    // Parser source wrappers preserve our quota error; keep its public category.
    if (error instanceof ResponsesStreamError && error.cause instanceof AnalysisError) throw error.cause;
    if (error instanceof ResponsesStreamRefusalError) throw new AnalysisError("REFUSED");
    if (error instanceof ResponsesStreamError) throw new AnalysisError("INVALID_OUTPUT");
    throw error;
  }
}

export async function segmentObject(client: OpenAI, image: PreparedImage, concept: string, parent?: AbortSignal) {
  const signal = stageSignal(parent);
  const started = performance.now();
  try {
    const { data: stream, response } = await client.responses.create({
      model: SAM_MODEL, store: false, stream: true, max_output_tokens: 16_000,
      metadata: { include_confidence: "true", mask_encoding: "one_bit" },
      input: [{ role: "user", content: [
        { type: "input_text", text: concept },
        { type: "input_image", image_url: image.dataUrl, detail: "original" },
      ] }],
    }, { signal }).withResponse();
    let responseId: string | null = null;
    let resolvedModel: string | null = null;
    let usage: ReturnType<typeof tokenUsage> = null;
    async function* trackedEvents(): AsyncIterable<WireEvent> {
      for await (const event of stream) {
        if (event.type === "response.completed" || event.type === "response.incomplete") {
          responseId = safeIdentifier(event.response.id);
          resolvedModel = safeIdentifier(event.response.model);
          usage = tokenUsage(event.response.usage);
        }
        yield event as ResponsesEvent;
      }
    }
    const result = await parseSegmentation(trackedEvents(), image);
    return {
      ...result, concept, coordinateSystem: "normalized-input-image-pixels" as const,
      provenance: {
        provider: "meta" as const, requestedModel: SAM_MODEL, resolvedModel, responseId,
        requestId: safeIdentifier(response.headers.get("x-request-id")), parser: "@meta-sam/parser@0.1.0",
        elapsedMs: Math.round(performance.now() - started), usage, storeRequested: false as const,
      },
    };
  } catch (error) { throw providerError(error, signal); }
}
