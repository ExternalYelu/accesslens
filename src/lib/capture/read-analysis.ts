import { AnalysisError, errorFromCode } from "../analysis/errors";
import {
  parseAnalysisResult,
  stages,
  type AnalysisResult,
  type AnalysisStage,
} from "../analysis/contract";

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

/** A final validated event is mandatory; a truncated stream is never a result. */
export async function readAnalysis(
  response: Response,
  onStage: (stage: AnalysisStage) => void,
): Promise<AnalysisResult> {
  if (!response.ok) {
    let code: unknown;
    try {
      code = (await response.json()).error?.code;
    } catch {
      /* Return an application-owned message only. */
    }
    throw errorFromCode(code);
  }
  if (
    !response.body ||
    !response.headers.get("content-type")?.startsWith("application/x-ndjson")
  )
    throw new AnalysisError("INVALID_OUTPUT");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let buffer = "";
  let result: AnalysisResult | null = null;
  function accept(line: string) {
    if (!line.trim()) return;
    if (result) throw new AnalysisError("INVALID_OUTPUT");
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      throw new AnalysisError("INVALID_OUTPUT");
    }
    if (!event || typeof event !== "object")
      throw new AnalysisError("INVALID_OUTPUT");
    if (event.type === "stage" && stages.includes(event.stage as AnalysisStage))
      onStage(event.stage as AnalysisStage);
    else if (event.type === "result")
      result = parseAnalysisResult(event.result);
    else if (event.type === "error") {
      // Reuse the same public error-code boundary; never trust a remote message.
      throw errorFromCode(event.code);
    } else throw new AnalysisError("INVALID_OUTPUT");
  }
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new AnalysisError("INVALID_OUTPUT");
      buffer += decoder.decode(item.value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        accept(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) accept(buffer);
    if (!result) throw new AnalysisError("INCOMPLETE_OUTPUT");
    return result;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
