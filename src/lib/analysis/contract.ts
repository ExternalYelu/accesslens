import { z } from "zod";
import { AnalysisError } from "./errors";
import { sceneSchema } from "./schema";

export const mobilityProfileSchema = z.strictObject({
  kind: z.enum(["wheelchair", "walker", "crutches", "general"]),
  measuredWidthCm: z.number().min(1).max(300).nullable(),
});
export type MobilityProfile = z.infer<typeof mobilityProfileSchema>;
export const DEFAULT_PROFILE: MobilityProfile = {
  kind: "general",
  measuredWidthCm: null,
};
export const stages = ["validating", "observing", "segmenting"] as const;
export type AnalysisStage = (typeof stages)[number];

const identifier = z
  .string()
  .regex(/^[\w.:-]{1,160}$/)
  .nullable();
const usage = z
  .strictObject({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  })
  .nullable();
const baseProvenance = {
  provider: z.literal("meta"),
  requestedModel: z.string().max(100),
  resolvedModel: identifier,
  responseId: identifier,
  requestId: identifier,
  elapsedMs: z.number().int().nonnegative(),
  usage,
  storeRequested: z.literal(false),
};
const maskSchema = z.strictObject({
  objectId: z.string().regex(/^\d+$/),
  bounds: z.strictObject({
    left: z.number().int().nonnegative(),
    top: z.number().int().nonnegative(),
    right: z.number().int().positive(),
    bottom: z.number().int().positive(),
  }),
  confidence: z.number().min(0).max(1).nullable(),
  areaPixels: z.number().int().nonnegative(),
  mask: z.strictObject({
    size: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    counts: z.string().max(2_000_000),
  }),
  svgPath: z
    .string()
    .max(1_000_000)
    .regex(/^[MLZ\d\s.,-]*$/),
});

export const analysisResultSchema = z.strictObject({
  version: z.literal("accesslens-evidence-v2"),
  mode: z.literal("live"),
  status: z.literal("observations_only"),
  image: z.strictObject({
    width: z.number().int().positive().max(1600),
    height: z.number().int().positive().max(1600),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    normalizedType: z.literal("image/jpeg"),
  }),
  mobilityProfile: mobilityProfileSchema,
  scene: sceneSchema,
  provenance: z.strictObject({
    ...baseProvenance,
    schemaVersion: z.string().max(100),
    promptVersion: z.string().max(100),
    outputMode: z.literal("json_schema"),
  }),
  segmentation: z
    .strictObject({
      sourceObservationId: z.string(),
      association: z.literal("concept-query-source-only"),
      status: z.enum(["completed", "no_matches"]),
      objects: z.array(maskSchema).max(32),
      concept: z.string().max(60),
      coordinateSystem: z.literal("normalized-input-image-pixels"),
      provenance: z.strictObject({
        ...baseProvenance,
        parser: z.string().max(100),
      }),
    })
    .nullable(),
  limits: z.array(z.string().max(600)).min(1).max(10),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export function parseAnalysisResult(value: unknown): AnalysisResult {
  const parsed = analysisResultSchema.safeParse(value);
  if (!parsed.success) throw new AnalysisError("INVALID_OUTPUT");
  const result = parsed.data;
  const ids = new Set(result.scene.objects.map((object) => object.id));
  if (ids.size !== result.scene.objects.length)
    throw new AnalysisError("INVALID_OUTPUT");
  for (const object of result.scene.objects) {
    if (
      object.box &&
      (object.box.xMin >= object.box.xMax || object.box.yMin >= object.box.yMax)
    )
      throw new AnalysisError("INVALID_OUTPUT");
  }
  const seg = result.segmentation;
  if (seg) {
    if (
      !ids.has(seg.sourceObservationId) ||
      (seg.status === "no_matches") !== (seg.objects.length === 0)
    )
      throw new AnalysisError("INVALID_OUTPUT");
    if (
      new Set(seg.objects.map((object) => object.objectId)).size !==
      seg.objects.length
    )
      throw new AnalysisError("INVALID_OUTPUT");
    for (const object of seg.objects) {
      const b = object.bounds;
      if (
        b.right > result.image.width ||
        b.bottom > result.image.height ||
        b.left >= b.right ||
        b.top >= b.bottom ||
        object.mask.size[0] !== b.bottom - b.top ||
        object.mask.size[1] !== b.right - b.left ||
        object.areaPixels > object.mask.size[0] * object.mask.size[1]
      )
        throw new AnalysisError("INVALID_OUTPUT");
    }
  }
  return result;
}

export type AnalysisEvent =
  | { type: "stage"; stage: AnalysisStage }
  | { type: "result"; result: AnalysisResult }
  | { type: "error"; code: string; message: string };
