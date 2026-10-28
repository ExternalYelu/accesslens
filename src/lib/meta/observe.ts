import "server-only";
import type OpenAI from "openai";
import { AnalysisError } from "../analysis/errors";
import type { PreparedImage } from "../analysis/image";
import { OBSERVATION_INSTRUCTIONS, parseScene, PROMPT_VERSION, SCHEMA_VERSION, sceneJsonSchema } from "../analysis/schema";
import { providerError, safeIdentifier, SPARK_MODEL, stageSignal, tokenUsage } from "./client";

export async function observeScene(client: OpenAI, image: PreparedImage, parent?: AbortSignal) {
  const signal = stageSignal(parent);
  const started = performance.now();
  try {
    const { data, response } = await client.responses.create({
      model: SPARK_MODEL, store: false, max_output_tokens: 2500,
      reasoning: { effort: "minimal" },
      instructions: OBSERVATION_INSTRUCTIONS,
      input: [{ role: "user", content: [
        { type: "input_text", text: "Describe only the visible evidence in this image for a later user-reviewed plan." },
        { type: "input_image", image_url: image.dataUrl, detail: "high" },
      ] }],
      text: { format: { type: "json_schema", name: "accesslens_scene_v1", strict: true, schema: sceneJsonSchema } },
    }, { signal }).withResponse();
    if (data.status !== "completed") throw new AnalysisError("INCOMPLETE_OUTPUT");
    if (!Array.isArray(data.output) || typeof data.output_text !== "string") throw new AnalysisError("INVALID_OUTPUT");
    if (data.output.some(item => item.type === "message" && item.content.some(part => part.type === "refusal"))) {
      throw new AnalysisError("REFUSED");
    }
    const scene = parseScene(data.output_text);
    return {
      scene,
      provenance: {
        provider: "meta" as const, requestedModel: SPARK_MODEL, resolvedModel: safeIdentifier(data.model),
        responseId: safeIdentifier(data.id), requestId: safeIdentifier(response.headers.get("x-request-id")),
        schemaVersion: SCHEMA_VERSION, promptVersion: PROMPT_VERSION,
        elapsedMs: Math.round(performance.now() - started), usage: tokenUsage(data.usage),
        outputMode: "json_schema" as const, storeRequested: false as const,
      },
    };
  } catch (error) { throw providerError(error, signal); }
}
