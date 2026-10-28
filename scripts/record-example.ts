import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { analyzeImage } from "../src/lib/analysis/analyze";
import { prepareImage } from "../src/lib/analysis/image";
import { publicError } from "../src/lib/analysis/errors";

async function main() {
  loadEnvConfig(process.cwd());
  try {
    console.log("Recording original CC0 diagram: 1 Spark request and at most 1 SAM request; no private images.");
    const png = await sharp(await readFile("tests/fixtures/contract-scene.svg")).png().toBuffer();
    const image = await prepareImage(png, "image/png");
    const result = await analyzeImage(png, "image/png");
    const record = { recordedAt: new Date().toISOString(), fixture: "Original synthetic contract diagram, CC0-1.0", result,
      limits: "Recorded API evidence. Not a real-room or accessibility evaluation. Loading it makes no API request." };
    await mkdir("public/examples", { recursive: true });
    await mkdir("docs/evidence", { recursive: true });
    await writeFile("public/examples/contract-scene.jpg", image.bytes);
    await writeFile("public/examples/contract-evidence.json", `${JSON.stringify(record, null, 2)}\n`);
    await writeFile("docs/evidence/m2-contract.json", `${JSON.stringify(record, null, 2)}\n`);
    console.log(JSON.stringify({ status: "recorded", masks: result.segmentation?.objects.length ?? 0, schema: result.version }));
  } catch (error) {
    const safe = publicError(error);
    console.error(JSON.stringify({ status: "failed", code: safe.code, message: safe.message }));
    process.exitCode = 1;
  }
}
void main();
