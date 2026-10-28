import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScene } from "../src/lib/analysis/schema";
import { hasCode, syntheticScene } from "./helpers";

test("accepts exact JSON and a single JSON fence", () => {
  const json = JSON.stringify(syntheticScene);
  assert.deepEqual(parseScene(json), syntheticScene);
  assert.deepEqual(parseScene(`\`\`\`json\n${json}\n\`\`\``), syntheticScene);
});

test("rejects invalid JSON, arbitrary prose, unknown fields, and missing uncertainty", () => {
  for (const value of ["not JSON", `Here is JSON: ${JSON.stringify(syntheticScene)}`,
    JSON.stringify({ ...syntheticScene, meters: 2 }), JSON.stringify({ ...syntheticScene, unknowns: [] })]) {
    assert.throws(() => parseScene(value), hasCode("INVALID_OUTPUT"));
  }
});

test("rejects duplicate evidence IDs and invalid normalized boxes", () => {
  assert.throws(() => parseScene(JSON.stringify({ ...syntheticScene, objects: [syntheticScene.objects[0], syntheticScene.objects[0]] })), hasCode("INVALID_OUTPUT"));
  for (const box of [{ xMin: 0.8, xMax: 0.2, yMin: 0, yMax: 1 }, { xMin: -1, xMax: 1, yMin: 0, yMax: 1 }]) {
    assert.throws(() => parseScene(JSON.stringify({ ...syntheticScene, objects: [{ ...syntheticScene.objects[0], box }] })), hasCode("INVALID_OUTPUT"));
  }
});

test("rejects command/list concepts before sending them to SAM", () => {
  for (const concept of ["segment chair", "chair, sofa", "chair and table", "chair or table", "<|box|>", "chair?"]) {
    assert.throws(() => parseScene(JSON.stringify({ ...syntheticScene, objects: [{ ...syntheticScene.objects[0], concept }] })), hasCode("INVALID_OUTPUT"));
  }
});
