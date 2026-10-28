import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { analyzeImage } from "../src/lib/analysis/analyze";
import { AnalysisError, publicError } from "../src/lib/analysis/errors";

// Deliberately separate from `npm test`: one Spark + at most one SAM request.
// No user photos, provider errors, credentials, or raw request bodies are logged.
async function main() {
  loadEnvConfig(process.cwd());
  try {
    const svg = await readFile("tests/fixtures/contract-scene.svg");
    const png = await sharp(svg).png().toBuffer();
    console.log("Live smoke: authored synthetic diagram; budget = 1 Spark + at most 1 SAM request; automatic retries = 0.");
    const result = await analyzeImage(png, "image/png");
    if (!result.segmentation || result.segmentation.status !== "completed" || !result.segmentation.objects.some(object => object.areaPixels > 0)) {
      throw new AnalysisError("INVALID_OUTPUT");
    }
    const evidence = {
      performedAt: new Date().toISOString(),
      fixture: { path: "tests/fixtures/contract-scene.svg", sha256: createHash("sha256").update(svg).digest("hex"), license: "CC0-1.0", kind: "synthetic contract diagram" },
      requestBudget: { spark: 1, sam: 1, automaticRetries: 0 },
      result,
      limitations: "Contract evidence only; no real-room, physical geometry, or accessibility accuracy was evaluated.",
    };
    await mkdir("docs/evidence", { recursive: true });
    await writeFile("docs/evidence/meta-contract.json", `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify({
      status: "passed", sparkModel: result.provenance.resolvedModel,
      samModel: result.segmentation.provenance.resolvedModel, masksDecoded: result.segmentation.objects.length,
      sparkMs: result.provenance.elapsedMs, samMs: result.segmentation.provenance.elapsedMs,
      evidence: "docs/evidence/meta-contract.json",
    }, null, 2));
  } catch (error) {
    const safe = publicError(error);
    console.error(JSON.stringify({ status: "failed", code: safe.code, message: safe.message }));
    process.exitCode = 1;
  }
}

void main();
