# AccessLens

AccessLens explores how visible mobility obstacles and proposed room rearrangements affect a **user-reviewed spatial model**. Built for the Meta Global AI Developer Hackathon 2026.

**Current milestone: M1, verified perception backend.** Real Meta inference works; the homepage remains the Next.js starter. Capture UI, floor-plan editing, route computation, and simulation are planned in [the roadmap](docs/ROADMAP.md). Image evidence cannot establish physical dimensions, safe passage, or accessibility compliance.

## Local setup

Use a supported Node.js runtime (Node 24 or Node 22.13+) and npm. The development machine's Node 23.3 runs the checks but produces dependency-engine/CommonJS warnings; prefer a supported version for reproducible installs.

```sh
npm ci
```

Privately create root `.env.local`:

```dotenv
MODEL_API_KEY=your_private_meta_key
```

Git ignores this file. Never share the key in a prompt or use a `NEXT_PUBLIC_` secret. Baseten and Modal are not needed for M1. See [Operations](docs/OPERATIONS.md) for connection and review instructions.

```sh
npm run dev -- --hostname 127.0.0.1
```

The starter page is at `http://127.0.0.1:3000`. The API is enabled in development and deliberately returns `503 DISABLED` in production until public access/resource controls are implemented. Do not expose the development server publicly.

## Implemented in M1

- Server-only Muse Spark `muse-spark-1.3`, strict JSON Schema output, and local Zod validation.
- One bounded SAM `sam-3.1` concept query derived from observations, decoded with the official `@meta-sam/parser`.
- Concept-query provenance. SAM matches are candidates, not confirmed one-to-one observation associations or ground-plane footprints.
- `POST /api/analyze`: same-origin multipart upload with `image` and `consent=true`, one active request per process, decoding/type/pixel validation, orientation normalization, and metadata removal.
- Deadlines, body/mask allocation limits, zero automatic retries, sanitized failures, and explicit incomplete/no-match handling.
- No raw-image retention or raw-provider logging in application code. Requests use `store: false`; this does not guarantee all provider-side deletion or retention behavior.

Uploads accept a single JPEG, PNG, or WebP up to 4 MiB and 16 million decoded pixels. Normalized images have a longest edge of at most 1600 pixels. Masks use normalized-image pixel coordinates and half-open bounds; physical units are unavailable.

Example request, **only for an image you own or have permission to send to Meta**:

```sh
curl http://127.0.0.1:3000/api/analyze -H 'Origin: http://127.0.0.1:3000' -F 'consent=true' -F 'image=@/absolute/path/to/your-owned-image.png;type=image/png'
```

There is no capture/consent interface yet. The explicit HTTP consent field is the M1 contract; M2 provides the interface.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

These checks run offline without a provider key. For a **paid live contract test** with an original, public-domain synthetic diagram:

```sh
npm run smoke:meta
```

Each invocation makes one Spark request and at most one SAM request, without automatic retries. It saves a successful sanitized result to [contract evidence](docs/evidence/meta-contract.json). This fixture is not a real room or an accessibility benchmark. Verified timing, limits, and HTTP checks appear in [the M1 checkpoint](docs/M1_CHECKPOINT.md).

## Original contributions and limitations

Existing baseline: [`1b8524f`](https://github.com/ExternalYelu/accesslens/commit/1b8524fe44600b48cff133a62e4f6c1b0ef972ff), containing the scaffold and dependency installation before kickoff. M0 adds engineering/hackathon documentation. M1 adds the provider pipeline, API boundary, validation, tests, and live evidence. Preserve this distinction in the submission.

M1 has no route planner, calibrated measurements, mobility advice, or physical accessibility assessment. A project license remains to be selected; the original synthetic fixture is explicitly CC0. See [Hackathon rules](docs/HACKATHON_RULES.md) for unresolved event questions and [Project brief](docs/PROJECT_BRIEF.md) for the intended architecture.
