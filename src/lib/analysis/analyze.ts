import "server-only";
import type OpenAI from "openai";
import { createMetaClient } from "../meta/client";
import { observeScene } from "../meta/observe";
import { segmentObject } from "../meta/segment";
import { prepareImage } from "./image";

export async function analyzeImage(bytes: Uint8Array, contentType: string, signal?: AbortSignal, client?: OpenAI) {
  const image = await prepareImage(bytes, contentType);
  const meta = client ?? createMetaClient();
  const observation = await observeScene(meta, image, signal);
  // M1 deliberately limits fan-out to a single, visibly identified object concept.
  const target = observation.scene.objects.find(object => object.box !== null) ?? observation.scene.objects[0];
  const segmentation = target ? {
    sourceObservationId: target.id,
    association: "concept-query-source-only" as const,
    ...await segmentObject(meta, image, target.concept, signal),
  } : null;
  return {
    version: "accesslens-evidence-v1" as const,
    mode: "live" as const,
    status: "observations_only" as const,
    image: { width: image.width, height: image.height, sha256: image.sha256, normalizedType: "image/jpeg" },
    ...observation,
    segmentation,
    limits: [
      "This result contains image evidence, not a measured floor plan or route.",
      "Object movability and ground footprints require user review.",
      "No matches or missing evidence does not establish clear floor.",
      "No physical dimensions, safe passage, or accessibility compliance were determined.",
    ],
  };
}
