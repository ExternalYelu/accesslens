import "server-only";
import type OpenAI from "openai";
import { createMetaClient } from "../meta/client";
import { observeScene } from "../meta/observe";
import { segmentObject } from "../meta/segment";
import { prepareImage } from "./image";
import { DEFAULT_PROFILE, parseAnalysisResult, type AnalysisStage, type MobilityProfile } from "./contract";

export interface AnalysisOptions { onStage?: (stage: AnalysisStage) => void; mobilityProfile?: MobilityProfile }

export async function analyzeImage(bytes: Uint8Array, contentType: string, signal?: AbortSignal, client?: OpenAI, options?: AnalysisOptions) {
  options?.onStage?.("validating");
  const image = await prepareImage(bytes, contentType);
  const meta = client ?? createMetaClient();
  options?.onStage?.("observing");
  const observation = await observeScene(meta, image, signal);
  // M1 deliberately limits fan-out to a single, visibly identified object concept.
  const target = observation.scene.objects.find(object => object.box !== null) ?? observation.scene.objects[0];
  if (target) options?.onStage?.("segmenting");
  const segmentation = target ? {
    sourceObservationId: target.id,
    association: "concept-query-source-only" as const,
    ...await segmentObject(meta, image, target.concept, signal),
  } : null;
  return parseAnalysisResult({
    version: "accesslens-evidence-v2" as const,
    mode: "live" as const,
    status: "observations_only" as const,
    image: { width: image.width, height: image.height, sha256: image.sha256, normalizedType: "image/jpeg" },
    mobilityProfile: options?.mobilityProfile ?? DEFAULT_PROFILE,
    ...observation,
    segmentation,
    limits: [
      "This result contains image evidence, not a measured floor plan or route.",
      "Object movability and ground footprints require user review.",
      "No matches or missing evidence does not establish clear floor.",
      "No physical dimensions, safe passage, or accessibility compliance were determined.",
    ],
  });
}
