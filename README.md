# AccessLens

AccessLens connects Meta-powered image evidence with user review, as a foundation for exploring more navigable spaces. Built for the Meta Global AI Developer Hackathon 2026.

**Current state: M2 capture and review.** Upload or capture a photo, give explicit consent, run Muse Spark and SAM, and inspect/correct the resulting observations and masks. Floor-plan editing, deterministic routes, and rearrangement simulation are M3–M4 and remain unimplemented. A photograph alone cannot establish physical dimensions, safe passage, or accessibility compliance.

## Run locally

Use Node 24 or Node 22.13+ and npm. The development machine's Node 23.3 runs the checks but produces dependency-engine/CommonJS warnings; prefer a supported runtime for reproducible installs.

```sh
npm ci
```

Privately create root `.env.local`:

```dotenv
MODEL_API_KEY=your_private_meta_key
```

Git ignores this file. Never share the key in a prompt, commit it, or use a `NEXT_PUBLIC_` secret. Baseten and Modal are not needed for the current product loop.

```sh
npm run dev -- --hostname 127.0.0.1
```

Open the printed address, normally `http://127.0.0.1:3000`. Only one development server can run per checkout. Live inference is deliberately disabled in production until public resource/access controls are implemented. The recorded example works in production without exposing a provider key.

## Try the workspace

1. Choose **Try the recorded example** to explore genuine recorded Meta output on an original synthetic diagram. It is clearly labeled and makes no inference call.
2. Select observations, edit labels, confirm/reject objects, and undo reviews. Toggle approximate boxes and pixel masks. Confirm mask associations yourself; a concept can match multiple objects.
3. For live analysis, choose an owned photo or use the camera, review the local preview, select a mobility preference, check the permission/transfer box, and choose **Analyze photo**.
4. Inspect model observations, masks, and unknowns. No floor plan, route, or physical measurement is inferred in this milestone.

Uploads support single-frame JPEG/PNG/WebP up to 20 MiB and 16 million pixels. The browser applies orientation, strips metadata, and prepares a JPEG with a longest edge of at most 1600 pixels and a body below 4 MiB. The server independently validates and normalizes it. HEIC and animated images are rejected. Camera capture requires HTTPS or loopback localhost; plain HTTP on a phone's LAN address may need upload instead.

Your mobility preference and optional measured width are user inputs for later planning, not clinical recommendations or image-derived facts. They are not included in the Meta prompt. Reviews and photos stay in memory for this session; reset/reload clears them. The application does not log or retain raw private images/provider payloads. `store: false` is requested, but provider-side policies remain a separate question.

## Implementation

- Server-only Meta SDK: `muse-spark-1.3`, strict JSON Schema, local Zod validation; one bounded `sam-3.1` concept request decoded by the official parser.
- Shared `accesslens-evidence-v2` contract with image-coordinate masks/SVG contours and explicit concept-query provenance. A silhouette is never treated as a floor footprint.
- `POST /api/analyze`: same-origin multipart `image`, `consent=true`, and optional JSON `profile`; JSON response by default, NDJSON stages/results when `Accept: application/x-ndjson` is sent.
- One active request per process, bounded bytes/pixels/output/mask allocations, upload/provider deadlines, zero automatic retries, cancellation, sanitized failures, and no-store responses. These development controls are not a distributed production quota system.
- Accessible labels, native controls, text evidence, visible focus, status announcements, reduced-motion support, and a responsive layout. Real screen-reader and physical-phone checks remain pending.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The tests, typecheck, and lint run offline without a provider key. The build needs no provider key; an uncached Next/font build may need internet access to obtain Geist. For a **paid live contract test** on the original CC0 diagram:

```sh
npm run smoke:meta
```

One Spark request and at most one SAM request are made, without automatic retries. A successful run refreshes [contract evidence](docs/evidence/meta-contract.json). To regenerate the publicly displayed synthetic example, `npm run record:example` makes a separate bounded live run and writes only that hard-coded authored fixture's result/image under `public/examples/`. Do not regenerate it merely to browse the example.

The current [M2 checkpoint](docs/M2_CHECKPOINT.md) contains run, browser-validation, known-limitations, and exact commit/push instructions. See [M1](docs/M1_CHECKPOINT.md) for the original contract milestone. These synthetic runs are not real-room or accessibility benchmarks.

## Original contributions and delivery plan

Existing baseline: [`1b8524f`](https://github.com/ExternalYelu/accesslens/commit/1b8524fe44600b48cff133a62e4f6c1b0ef972ff), containing the scaffold/dependency installation before kickoff. M0 adds project documentation; M1 adds the real perception pipeline and tests; M2 adds capture, review, streamed progress, and recorded exploration. Clearly distinguish new work from the baseline in the submission.

A project license remains to be selected; the original synthetic fixture is CC0. See [Project brief](docs/PROJECT_BRIEF.md), [Hackathon rules](docs/HACKATHON_RULES.md), [Roadmap](docs/ROADMAP.md), and [Operations](docs/OPERATIONS.md).
