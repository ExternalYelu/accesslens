# AccessLens project brief

Planning snapshot and M2 update: October 27, 2026, America/Detroit. M1 is verified; M2 capture/review is implemented and browser-tested. Physical-phone and assistive-technology checks remain pending. See [M1](M1_CHECKPOINT.md) and [M2](M2_CHECKPOINT.md) checkpoints for evidence and limitations.

## Mission

Help people with mobility limitations inspect a physical environment, identify visible obstacles, and explore how a proposed rearrangement changes a modeled route. The core demonstration is an evidence-linked loop: photograph → Meta observations → SAM object masks → user-reviewed plan → deterministic route → hypothetical change → recomputed comparison.

Target users include people using wheelchairs, walkers, crutches, or general mobility assistance and people helping them arrange a room. The developer's background in computer science, healthcare technology, visualization, and robotics informs the project; no user research or accessibility expertise has yet been independently validated.

Primary theme: Build for Your World. Secondary alignment: Push the Frontier. Proposed track: Indie Developer; registration still needs confirmation. Success means a useful, credible, reproducible system. Competition placement cannot be guaranteed.

## Initial repository audit (M0 historical snapshot)

| Item | Observed status |
| --- | --- |
| Repository | `https://github.com/ExternalYelu/accesslens`; GitHub API reports PUBLIC |
| Branch | `main`, tracking `origin/main`; clean before onboarding changes |
| Baseline | `6fbc1a9` starter, then `1b8524f` dependency foundation |
| Existing UI | Unmodified Next.js starter page, layout, styling, and stock icons |
| Stack | Next.js 16.4.3, React 19.3.0, TypeScript, Tailwind CSS 4 |
| Installed libraries | OpenAI SDK 7.43.0 range, Zod 4.6.7 range, Lucide, `@meta-sam/parser` 0.1.0 range; lockfile retained |
| Backend/product | No provider adapter, route handlers, capture flow, segmentation UI, planner, simulation, or report |
| Baseline checks | `npm run lint` and `npx tsc --noEmit` pass; production build not run in documentation milestone |
| Local credentials | No root environment file observed; inherited credentials and provider accounts not inspected |
| CLI availability | `gh` available; `muse` and `modal` not found on PATH |

`package.json` setting `private: true` prevents npm package publication; it does not make the GitHub repository private.

Both baseline commits occurred before the October 26 noon kickoff. See the provenance note in [Hackathon rules](HACKATHON_RULES.md); do not describe the scaffold as original event functionality.

## Planned experience

1. Select a mobility preference and choose an owned example or capture/upload a room image. Explain provider transfer before analysis.
2. Receive bounded visual observations with referenced objects and missing information. Show processing stages and recoverable errors.
3. Inspect segmented objects on the original image, with an accessible text object list. Correct names and matches rather than treating model output as ground truth.
4. Create or review a simple top-down floor plan: room boundary, known floor, unknown regions, obstacle footprints, entry, and destination. Start with explicit user inputs; segmentation supports evidence and suggestions.
5. Select relative exploration or supply measurements for a calibrated plan. Require enough geometry to support the selected mode; reject incomplete/degenerate calibration.
6. Compute a route for an explicitly labeled profile footprint. Report modeled connectivity or insufficient information, with units and assumptions.
7. Move one user-confirmed movable object using drag or keyboard controls. Validate placement, recompute, compare, undo, and reset. Keep hidden floor unknown until reviewed.
8. Export an understandable report containing evidence, assumptions, before/after modeled results, model provenance, and remaining questions.

The compelling demo is a blocked modeled route becoming connected after a legitimate footprint move, followed by an uncertain scene where the product correctly withholds a physical conclusion. The image and editable plan remain visibly linked.

## Implemented through M1

The development-only `POST /api/analyze` endpoint validates consent/origin and images, calls Muse Spark with strict JSON Schema output, validates observations locally, and queries SAM once for an observed concept. It returns decoded image masks, provenance, and limitations. Live access, image transport, the dotted SAM ID, and strict Spark output are verified. Tests and production build pass. Raw images/provider errors are not logged or retained by application code; provider-side retention remains a separate policy question.

The concept query records its source observation without claiming one-to-one identity for all returned masks. M2 now adds local capture/upload preparation, mobility preferences, explicit consent, real streamed stages, image/mask overlays, local corrections, and recorded-example exploration. User mask associations are explicit and do not replace raw evidence. Reviewed-plan geometry, route computation, and simulation remain unimplemented. The original audit table records the pre-implementation state.

## Architecture

```text
Phone/browser
  capture/upload + consent + mobility preference
        |
        v
Next.js server route handlers
  validation -> Meta client -> Muse scene observations
                          -> bounded SAM requests -> official parser
        |
        v
Validated evidence graph (image coordinates + provenance)
        |
        v
User-reviewed floor plan (separate coordinates + units + unknowns)
        |
        v
Pure geometry engine -> occupancy/configuration space -> path search
        ^                                                |
        |       validated object edit / undo              v
        +------------------------------------- comparison + report

Optional, later: Baseten comparison; Modal bounded batch evaluation
```

Frontend: mobile-first React/TypeScript with Tailwind; server rendering for the shell and narrow client components for capture and interactive geometry. Start without accounts, a database, or persistent room-photo storage. A durable job service is a later choice only if measured request duration requires it.

Backend: App Router handlers under `src/app/api`, server-only provider configuration, Zod request/response schemas, bounded streaming and cancellation. Installed Next.js docs govern implementation; read the route-handler, server/client, environment, and data-security guides first. Never cache private analyses across users.

## Provider decisions and evidence

| Provider | Planned role | Configuration | Verification status |
| --- | --- | --- | --- |
| Meta Model API | Primary multimodal observations and segmentation | `https://api.meta.ai/v1`; server `MODEL_API_KEY` | Verified live; [Meta quickstart](https://dev.meta.ai/docs/quickstart) |
| Muse Spark | Scene observations and segmentation concepts | `muse-spark-1.3` | Base64 input and strict JSON Schema verified live; reasoning effort `minimal` |
| SAM 3.1 | Image masks and bounding boxes | `sam-3.1` | Dotted identifier verified live; [API guide](https://dev.meta.ai/docs/sam/segmenting) matches |
| SAM parser | Streaming output and mask decoding | Installed `@meta-sam/parser` | Genuine SAM mask decoded; malformed/partial/empty cases covered offline |
| Muse Code | Optional independent review at milestone checkpoints | Separate developer CLI login | [CLI overview](https://dev.meta.ai/docs/muse-code); not installed on PATH |
| Baseten | Compare Muse Spark Open against the primary model | `https://inference.baseten.co/v1`; `BASETEN_API_KEY`; `meta-models/muse-spark-open-1026` per supplied event guide | Endpoint checked against [Baseten reference](https://docs.baseten.co/reference/inference-api/chat-completions); event alias/account access not tested |
| Modal | Optional reproducible batch evaluation or justified open-model inference | User-reported workspace `externalyelu`, environment `main` | [Endpoint docs](https://modal.com/docs/guide/endpoints) reviewed; workspace/auth and need not validated |

SAM should receive concise object concepts with bounded fan-out, rather than an unconstrained scene prompt. An interrupted result must retain its incomplete status. The parser interprets events; the application still owns transport and request construction.

Muse Wonder, Hugging Face datasets, and other services are optional experiments after the core works. No fine-tuning or dedicated GPU is required for the primary path.

Credit status: user reports $150 Meta credits available and both Baseten and Modal credits approved. The supplied guide advertises $100 per partner; actual awarded amounts, posted balances, expiration, and limits remain unverified. M0 performed no inference; M1 made the bounded calls recorded in its checkpoint. No partner resource deployment occurred.

## Spatial model and scientific limits

### Evidence and plan are separate

An image silhouette can include a chair back, legs, or occluded floor; it cannot be treated as its ground-plane footprint. Keep image masks/boxes separate from manually reviewed plan polygons. Link them by stable object identifiers and provenance. A single photograph has no reliable global pixels-per-meter conversion.

The first useful planner operates on a user-reviewed top-down schematic. Relative mode uses arbitrary plan units and explicitly cannot judge physical clearance. Metric mode requires measured dimensions or a supported ground-plane mapping, such as four non-collinear coplanar image points paired with measured plan points. A homography only applies to points on that plane. Elevated silhouettes, hidden contact points, lens distortion, and non-planar floors remain limitations; allow manual footprint entry and correction.

Record measurements as user supplied with source and uncertainty. Validate the mapping and its residuals; residuals alone do not prove real-world accuracy. If geometry is inadequate, return insufficient information rather than fabricated dimensions. Keep unknown areas blocked for conservative planning; a blocked route may mean missing information rather than a physical obstruction.

### Deterministic simulation

Use obstacle polygons and room boundaries to build a grid or equivalent configuration space. Inflate obstacles and shrink navigable boundaries by the chosen footprint plus explicit margin; search with A* or a comparable documented algorithm. Choose grid resolution deliberately, explain quantization, and check both nodes and edges. A diagonal must not pass between touching obstacles. Any simplified display path must remain collision-free.

Initial footprint model: a configurable circular envelope. Mobility labels select editable illustrative defaults, not clinically appropriate prescriptions. Metric widths are user supplied; relative footprints are arbitrary. A circle is a translational approximation and does not model orientation-dependent turning or transfers. Do not infer slopes, thresholds, surface traction, stability, reach, door swing clearance, or safe passage.

Compare the same endpoints, profile, units, uncertainty policy, and planner version before and after a move. Report modeled route availability, route length in supported units, limiting modeled clearance if implemented, and sensitivity to margins. If endpoints are inside obstacles or outside known floor, explain the error. A simulation proposes an arrangement; it does not verify a physical move or hidden floor.

## Proposed data contracts

- Capture: image dimensions/orientation, content type, ephemeral image handle, provider-transfer consent, optional owned-demo provenance.
- Observation: stable ID, category, evidence reference, bounding region, confidence when available, uncertainty, suggested movability requiring user confirmation.
- Segmentation: model/request ID, concept or object prompt, parser version, source dimensions, masks/boxes, completion status, diagnostics.
- Plan: coordinate system, units, boundary, known/unknown floor polygons, object footprints, fixed/movable confirmation, calibration inputs and provenance.
- Scenario: immutable base plan revision, profile envelope/margin, endpoints, edits, solver version/resolution.
- Result: connected/blocked/insufficient-information, supported metrics, assumptions, evidence links, and before/after scenario IDs.
- Run metadata: model/provider, prompt/schema versions, sanitized request identifier, elapsed time, usage when reported, outcome. No raw private payload logging.

The image-evidence and mobility-preference contracts are implemented as `accesslens-evidence-v2` in `src/lib/analysis/contract.ts`, with shared server/client validation. Plan/scenario/route contracts remain planned. Final geometry schemas must follow explicit inputs and meaningful tests.

## Scope priorities

Required: real Meta analysis and SAM masks; corrected evidence; editable plan; tested route engine; meaningful before/after simulation; uncertainty; mobile/keyboard use; error handling; reproducible examples; public deployment; submission artifacts.

Next: structured export; sensitivity controls; measured Baseten comparison; small batch evaluation on Modal if useful.

Defer: full 3D reconstruction, autonomous room scanning, video tracking, AR overlays, medical recommendations, certified compliance checks, marketplace, accounts, social features, and fine-tuning. Technical depth should come from reliable perception-to-simulation integration and evaluation.

## Quality and unresolved dependencies

Acceptance tests and schedule live in [Roadmap](ROADMAP.md); user actions and exact review prompts live in [Operations](OPERATIONS.md). Targets are internal engineering goals, never invented judging criteria.

Open items: track/representative registration, full rubric, baseline eligibility clarification, remaining Meta balance/spend controls, real-room media, calibration usability, deployment host/limits, partner balances, and direct accessibility-user feedback. Meta model access and M1 SAM/structured-output contracts are verified; real-room accuracy is not. Do not claim research, deployment, or broader evaluation outcomes before they happen.
