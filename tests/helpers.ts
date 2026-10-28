import { AnalysisError, type ErrorCode } from "../src/lib/analysis/errors";
import { createMetaClient } from "../src/lib/meta/client";
import type { Scene } from "../src/lib/analysis/schema";

export const syntheticScene: Scene = {
  summary: "A synthetic diagram with a red square and a blue rectangle.",
  objects: [{ id: "object-1", label: "red square", concept: "red square", visibleEvidence: "A red square is visible on the left.",
    box: { xMin: 0.2, yMin: 0.3, xMax: 0.4, yMax: 0.6 }, movability: "unknown" }],
  unknowns: ["No physical scale, depth, or navigable floor is established by this diagram."],
};

export function hasCode(code: ErrorCode) {
  return (error: unknown) => error instanceof AnalysisError && error.code === code;
}

export function fakeClient(reply: (body: Record<string, unknown>) => Response | Promise<Response>) {
  const requests: Record<string, unknown>[] = [];
  const transport: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push(body);
    return reply(body);
  };
  return { client: createMetaClient("synthetic-test-key", transport), requests };
}

export function sceneResponse(text = JSON.stringify(syntheticScene), status = "completed") {
  return Response.json({
    id: "resp_synthetic", model: "muse-spark-1.3", object: "response", status,
    output: [{ type: "message", role: "assistant", status: "completed", id: "msg_synthetic",
      content: [{ type: "output_text", text, annotations: [] }] }],
    usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
  });
}

// Original, deterministic 2x2 raster [1,0;0,1] encoded with the official codec.
export const maskText = '<0f>7<|box;x1=1;y1=1;x2=2;y2=2;w=4;h=4|><|mask;x=0;y=0;data=2,2,!!!!!&T:u9`|>\n';
export const lane = { item_id: "msg_synthetic", output_index: 0, content_index: 0 };

export function segmentationEvents(text = maskText, completed = true) {
  const split = Math.floor(text.length / 2);
  const events: Array<{ type: string; [key: string]: unknown }> = [
    { type: "response.output_text.delta", ...lane, delta: text.slice(0, split) },
    { type: "response.output_text.delta", ...lane, delta: text.slice(split) },
    { type: "response.content_part.done", ...lane, part: { type: "output_text", text } },
  ];
  if (completed) events.push({ type: "response.completed", response: { id: "resp_sam_synthetic", model: "sam-3.1" } });
  return events;
}

export async function* asEvents(events: Array<{ type: string; [key: string]: unknown }>) {
  for (const event of events) yield event;
}

export function sse(events: Array<{ type: string; [key: string]: unknown }>) {
  return new Response(events.map(event => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""),
    { headers: { "Content-Type": "text/event-stream" } });
}
