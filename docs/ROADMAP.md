# AccessLens delivery roadmap

Planning date and M2 update: October 27, 2026, Eastern time. M0–M1 are complete. M2 is implemented and browser-verified; physical-phone/assistive-technology checks remain pending. M3 onward is planned. Dates are targets; acceptance evidence determines completion.

## Delivery priorities

P0 is the complete photo-to-reviewed-plan-to-simulation loop, correct uncertainty, reliable Meta integration, and accessible deployment. P1 is evaluation depth, export, sensitivity analysis, and a bounded provider comparison. P2 is optional infrastructure and advanced visualization. Do not sacrifice a tested P0 loop to add providers.

| Milestone | Target ET | Deliverable | Dependency |
| --- | --- | --- | --- |
| M0: project context | October 27 | Audit, persistent rules, brief, event rules, roadmap, operations runbook | Supplied context and existing repo |
| M1: provider contract spike | October 28 morning | Server-only Meta client; real Spark observation and decoded SAM mask; schemas and failure states | `MODEL_API_KEY`, billing readiness, owned image |
| M2: capture and evidence | October 28–29 | Mobile upload/camera, profile, progress, real observations, selectable masks and corrections | M1 contract evidence |
| M3: reviewed plan and solver | October 29–30 | Relative/metric plan distinction, footprint editor, known/unknown regions, route engine | Explicit coordinate contracts; unit/geometry tests |
| M4: counterfactual loop | October 30–31 | Move/undo/reset, validated placements, before/after comparison, evidence-linked report | M2+M3 |
| M5: evaluation and hardening | November 1 | Owned evaluation set, reproducible metrics, error handling, accessibility and privacy review; preview deployment | Working P0 loop |
| M6: submission candidate | November 2 | Public release candidate, docs/licenses, recorded demo candidate, optional partner results | Passing checks and accessible deployment |
| M7: submit and verify | November 3 by 6 PM | Submitted project with public links and saved confirmation | Confirmed registration/rubric/form |
| Buffer only | November 4 before 9 PM EST | Recover submission or production issues; no speculative features | Deadline confirmed |

## M0 — context and provenance

Deliverables: extend existing `AGENTS.md` without removing its generated block; create this roadmap, project brief, known rules, and operations runbook. Preserve application files and lockfile.

Acceptance: inventory existing functionality honestly; verify Git remote/visibility; separate known rules from missing rubric; record baseline timestamps and new partner-credit approval; provide exact credential and review handoffs; inspect diff and local documentation links.

Validation recorded: starter lint and TypeScript checks pass. Documentation local links, fenced blocks, whitespace, final newlines, and preservation of the generated Next.js instruction block pass inspection; `git diff --check` passes. No application source or dependency files changed. No live API calls, production build, partner resource deployments, commits, or pushes performed in M0.

## M1 — smallest real API integration

Build a bounded live contract spike before committing to elaborate UI or schemas. Read relevant installed Next.js guides. Add server-only configuration, a minimal consented/owned image request, explicit response schemas, and sanitized run metadata. Test Muse Spark and SAM separately, then link one observation to one mask.

Acceptance:

- Missing key yields a configuration error without a secret leak or invented analysis.
- Confirm the exact Spark/SAM IDs against real service access; resolve the documented SAM spelling mismatch and record the outcome.
- Confirm supported image input and structured-output behavior. Validate responses with Zod even if provider schema mode is available. If unsupported, use a bounded JSON extraction path and reject invalid output rather than casting it.
- Parse a genuine SAM stream with the installed official parser; preserve dimensions, completion outcome, and diagnostics. Empty matches are a valid detection result, not proof of clear floor.
- Handle timeout, cancellation, 401/403, rate limits, invalid payload, 5xx, malformed JSON, and interrupted segmentation. Bound retries for retryable failures and never loop on bad auth.
- Save sanitized contract fixtures and provenance only for owned/approved media. Provider usage may be absent; never invent cost values.
- Set low smoke-test concurrency and a documented request budget. No automatic secondary-provider failover.

Verification: schema failure tests, real limited Spark request, real single-concept SAM request, parser fixture test including split chunks and incomplete stream, lint, typecheck, build. Offline tests and live requests must be reported separately.

User dependency: privately configure `MODEL_API_KEY` and provide or approve one owned photo. Run the first Muse architecture review after the contract and initial plan are reviewable.

M1 completion evidence: [checkpoint](M1_CHECKPOINT.md) and [live result](evidence/meta-contract.json). An original CC0 diagram was used instead of a private photograph. Real Spark strict JSON Schema and SAM mask decoding pass, including a real Next.js HTTP request. Twenty-six offline tests, lint, typecheck, and production build pass. Public production access remains disabled until M5 resource controls; capture UI is M2. No commit or push was made automatically.

## M2 — capture, profiles, and evidence

Build an accessible application shell and image flow with clear private-image handling. Camera uses a secure origin and permission-aware fallbacks; upload remains available. Support browser-produced common formats initially; explicitly reject unsupported HEIC or convert using a verified implementation rather than accepting unreadable media.

Acceptance:

- Validate actual decodable media, type, byte count, pixel count, and orientation. Adopt explicit application caps after checking the chosen deployment's request limits; large images need normalization or a reviewed upload path.
- Consent precedes provider transfer; errors and reset are understandable; navigation/cancellation cannot display stale results for another image.
- Mobility preferences have editable illustrative geometry defaults and no inferred medical needs.
- Show genuine masks aligned after image rotation/resizing and stable object IDs across evidence views.
- Correct labels/matches; indicate model uncertainty, missing objects, and incomplete streams.
- Progress has meaningful stages; keyboard and text alternatives expose the same objects as the canvas.
- Owned examples are clearly labeled with provenance; replay data is visibly marked as recorded.

Verification: at least one phone capture/upload, desktop upload, denied camera, invalid/oversized file, request cancellation, and retry; automated input/response validation; keyboard and screen-reader smoke pass.

Implementation evidence: [M2 checkpoint](M2_CHECKPOINT.md). Desktop upload, simulated camera capture/denial, EXIF rotation, local corruption rejection, live Meta rendering, recorded evidence, corrections, cancellation/stale-response handling, and 390px mobile layout were checked in Playwright. Thirty-five offline tests, typecheck, lint, and production build pass. Physical-phone capture/upload and real screen-reader testing remain pending; do not call browser emulation a hardware or assistive-technology test.

## M3 — explicit geometry and plan review

Build a pure geometry module before visually impressive route claims. A user-editable top-down schematic is the primary geometric input; link each obstacle to image evidence where available.

Acceptance:

- Separate normalized image coordinates from plan units. Relative mode never prints centimeters/meters or a compliance score.
- Enter/edit room boundary, fixed/movable footprints, endpoints, and known/unknown floor. Do not auto-convert whole silhouettes into floor polygons.
- Metric mode requires supported user-supplied geometry. Reject missing, collinear, self-intersecting, zero-scale, or otherwise degenerate inputs. Persist measurement provenance and explain limitations.
- Inflate obstacles for a configurable circular envelope and margin, including room-boundary treatment. State omitted turning/orientation behavior.
- Deterministic A* or equivalent search uses documented resolution, edge collision checks, conservative unknowns, and bounded computation.
- Endpoint errors are distinct from disconnected routes and insufficient information. Smoothing, if any, cannot cross blocked space.

Meaningful tests: open room; full wall; narrow gap under/at/over threshold with resolution tolerance; diagonal corner cutting; endpoint in obstacle; endpoint outside boundary; unknown-only connection; invalid polygons; transform round-trip; unit scaling; inflated boundary; deterministic repeat; collision-free route invariant. No real physical passability claim follows from passing these tests.

## M4 — simulation that changes a computed result

Acceptance:

- Select one user-confirmed movable object in plan or text list; move it through pointer or keyboard/numeric input.
- Reject wall intersections, overlap with fixed obstacles, and unsupported destinations. Unknown newly exposed floor stays unknown until explicitly reviewed.
- Recompute the solver, rather than asking the model to assert improvement. Keep endpoints and profile comparable between scenarios.
- Undo/reset restores the exact base scenario; stale asynchronous results cannot overwrite the current revision.
- Show evidence-linked before/after connectivity and supported route metrics, plus uncertainties and next measurements needed. Avoid an unvalidated overall accessibility score.
- At least one owned example demonstrates a legitimate blocked-to-connected modeled change. Another shows an invalid/ineffective move, and another withholds a result due to missing geometry.
- Export identifies the image/run, user assumptions, plan revision, solver version, profile, edits, and model IDs without raw credentials/private payloads.

Verification: pure scenario/solver tests; end-to-end upload → evidence → review → move → compare → undo; keyboard completion of the same flow; manual explanation of every displayed metric's source.

## M5 — reproducible evaluation and release hardening

Prepare an initial set targeting 12 owned or consented scenes (target, not current data), including open routes, obstructed routes, low light, partial occlusion, visually ambiguous objects, and missing geometry. Record licenses/consent and annotation rules. Use a separate small development subset; freeze a held-out subset before tuning. Do not claim statistical generalization from this small set.

Planned evaluation outputs:

- Object evidence: count reference objects and missed/extra detections; report category-level precision/recall only with an explicit matching rule.
- Masks: IoU on manually annotated visible masks when trustworthy annotation exists; record exclusions. Do not score ground footprints from silhouette labels.
- Geometry: synthetic reference layouts with known connectivity and clearance; calibration errors measured against independent held-out references if metric claims are evaluated.
- Counterfactuals: compare computed outcome against reference plan changes and validate no collisions. Test sensitivity to envelope/margin/resolution.
- Uncertainty: count unsupported metric/safety claims and correctly withheld conclusions against annotated insufficient-information cases. Release target is zero unsupported claims in the tested set; that is not proof about all inputs.
- Reliability: schema success rate, provider failures, request counts, and timeouts with denominators.
- Performance: stage/end-to-end latency with run count and percentile method; actual usage/cost when available. Small samples do not support confident tail-latency claims.
- Ablations: compare text-only observations versus masks plus user-reviewed plan, and unedited versus corrected plan. Use deterministic geometric truth to assess decisions; an LLM should not be the only evaluator.

Baseten: one bounded comparison using the event model alias, identical owned inputs and output contract, logging quality/latency/usage. Publish observed results whether favorable or unfavorable. Retain Meta hosted primary path unless results justify a change.

Modal: optional CPU batch execution or an explicitly justified open-model experiment. Use scale-to-zero and bounded concurrency/time. Do not provision a GPU just for geometric tests. Request its credentials only after writing the exact job/resource plan.

Hardening: mobile layout, keyboard, text equivalents, focus, contrast, reduced motion, loading/error states, consent, no private-image logs, request-rate/resource limits, public-demo abuse controls, provider spend monitoring. Deployment smoke tests must include production body/time limits and cancellation; an in-memory limiter alone may not protect multiple serverless instances.

## M6–M7 — release and submission

Release candidate requires lint, typecheck, meaningful automated tests, production build, deployed smoke test, and verified credential handling. Publish setup instructions and sanitized environment names; document limits, evaluation method/results, licenses, baseline, and original contributions. CI should run offline checks without needing paid provider credentials.

Freeze new features November 2. Record a three-minute video using real outputs and truthful labels; target 2:50 until exact organizer duration rules are confirmed. Prepare a signed-out walkthrough, downloadable/accessible report, and simple architecture explanation. A recorded replay can preserve demonstrability during provider downtime only if labeled; retain evidence of real live runs.

Submit by November 3 at 6 PM ET. Save the confirmation and final links, then recheck public access. November 4 is a recovery buffer, ending at the official 9 PM EST deadline.

Suggested video structure (180 seconds maximum pending form confirmation):

| Time | Evidence |
| --- | --- |
| 0:00–0:20 | Specific user problem and what is newly built |
| 0:20–0:55 | Photo, live/clearly labeled run, Spark observations and SAM evidence |
| 0:55–1:25 | Reviewed plan, profile assumptions, computed blocked route |
| 1:25–2:05 | Move object, recompute route, before/after and undo |
| 2:05–2:30 | Uncertain case, withheld dimensions, accessible controls |
| 2:30–2:50 | Technical architecture and measured evaluation results |
| 2:50–3:00 | Public product/repository and concise contribution statement |

## Failure-driven scope cuts

- If segmentation access is unavailable: resolve access with Meta; label evidence-only development views as incomplete. Do not claim SAM functionality or substitute fake masks.
- If calibration is unreliable: ship the reviewed schematic with relative route modeling; remove physical clearance claims.
- If model latency is high: reduce image resolution/concept fan-out, show bounded stages, and measure again. Do not hide replay as live.
- If cloud request limits are incompatible: normalize image size or implement an explicit temporary-upload/job path with retention and access controls before public use.
- If a partner adds no measurable benefit: omit the integration and preserve the working primary path.
- If time is tight: cut animation, advanced 3D, video, accounts, and extra providers. Protect the core counterfactual loop, tests, uncertainty, and submission.

## Status ledger

| Milestone | Status | Evidence |
| --- | --- | --- |
| M0 | Complete | Repo audit; documentation checks and diff check; starter lint/typecheck |
| M1 | Complete | Live Spark + SAM, decoded mask, HTTP contract, 26 tests, lint/typecheck/build; see checkpoint |
| M2 | Implemented; browser verified | 35 tests, live UI, upload/camera/error/review checks; physical-phone and real screen-reader checks pending |
| M3–M7 | Planned | Geometry, simulation, deployment, and submission remain outstanding |

Update this ledger with actual check results, commits, blockers, and deployed URLs after each milestone. Never mark complete from plans alone.
