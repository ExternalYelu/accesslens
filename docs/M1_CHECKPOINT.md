# M1 checkpoint: real Meta perception contract

Completed October 27, 2026, Eastern time. No commit or push has been made automatically.

This is a historical checkpoint. For the current workspace and commit instructions, see [M2](M2_CHECKPOINT.md).

## Implemented and verified

- Server-only Meta SDK configuration, strict Spark response schema with local validation, and one bounded SAM concept request.
- Live `muse-spark-1.3` and `sam-3.1` calls with base64 image input. The dotted SAM ID is now verified against the actual API.
- Spark accepts strict `json_schema` output. Its supported reasoning levels do not include `none`; the integration uses `minimal`, verified live.
- Official SAM parser decodes returned masks; validation includes stream completion, dimensions, source coordinates, mask budgets, and explicit no-match status.
- Normalized, fully decoded images with bounded byte/pixel dimensions and stripped metadata. No private photographs were used.
- Development-only multipart HTTP endpoint with consent/origin gates, bounded upload time/body size, one in-flight request, sanitized failures, no-store responses, and cancellation/deadlines.
- Explicit observation-to-concept-query provenance. A concept can match several objects; source-observation identity is not asserted as a confirmed segmentation association.

The homepage is still the starter page. This milestone provides the tested backend for M2; it does not implement capture UI, floor-plan geometry, route solving, or the counterfactual editor.

## Evidence

[meta-contract.json](evidence/meta-contract.json) contains the latest successful local result and may be refreshed by `npm run smoke:meta`. The original [HTTP result at the M1 commit](https://github.com/ExternalYelu/accesslens/blob/47e590a159b824968cf6e34beca68ba61917f82e/docs/evidence/meta-contract.json) used the original [synthetic diagram](../tests/fixtures/contract-scene.svg), with UTC timestamp `2026-10-28T02:13:45.914Z` (October 27 at 10:13:45 PM EDT). The user subsequently verified an additional successful CLI run: 3942 ms Spark, 379 ms SAM, one mask; that refreshed file is preserved in M2.

Initial HTTP-backed run:

| Check | Observed result |
| --- | --- |
| Spark requested/resolved model | `muse-spark-1.3` |
| SAM requested/resolved model | `sam-3.1` |
| Spark output format | Strict JSON Schema, locally validated |
| Spark stage | 3293 ms; 940 input + 602 output tokens |
| SAM stage | 1332 ms; one nonempty mask decoded |
| SAM usage | Provider reports zero token counts; this does not imply free segmentation |
| HTTP success | 200; `Cache-Control: no-store` |
| Cross-origin request | 403; no inference |
| Missing consent | 400; no inference |
| Production endpoint | Disabled by design; verified by HTTP before finalizing this checkpoint |

There were two successful live pipeline runs. Two earlier Spark requests were rejected for unsupported `reasoning.effort=none`; that setting was corrected. Total M1 live requests: four Spark requests (two rejected, two completed), two completed SAM requests. No automatic retries or secondary-provider calls occurred. Re-running the smoke command creates additional calls and replaces evidence only after success.

Timing is from individual synthetic examples, not a benchmark. No dollar cost, real-room detection accuracy, mask IoU, geometric accuracy, physical clearance, or accessibility performance has been established.

## Validation

- 26 offline tests cover schemas, concepts, duplicate IDs, coordinates, image decoding/type/pixel limits/orientation, SDK settings, sanitized provider failures, no retries, cancellation, body quotas, split SAM chunks, partial streams, refusal, empty matches, mask allocation bounds, pipeline fan-out, HTTP consent/origin, and concurrency release.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Documentation links, final diff, and secret-leak checks pass. `.env.local` stays ignored and untracked.

## Commit and push now

Use **Mac Terminal** in `/Users/eyalwinter/accesslens`. The current branch is `main`; the remote is the existing public GitHub repository. This checkpoint includes the previously uncommitted M0 documents and the tested M1 implementation.

Check that `git status` lists only intended project files. The key file must not appear. Stage explicit paths, then read the staged diff:

```sh
cd /Users/eyalwinter/accesslens
git status --short --branch
git add AGENTS.md README.md package.json package-lock.json docs scripts src/lib src/app/api tests
git diff --cached --check
git diff --cached --stat
git diff --cached
```

If that diff matches the reviewed checkpoint, commit with this exact message, then push:

```sh
git commit -m "feat: add verified Meta perception pipeline"
git push origin main
```

The text after `-m` is the commit comment/message. The push updates `https://github.com/ExternalYelu/accesslens`; it does not deploy a product. Never force-push. If Git reports a newer remote commit, inspect it rather than overwriting remote history.

## Next user actions

No additional provider credentials are needed for M2. If Muse Code is installed and authenticated, run the first read-only review prompt in [Operations](OPERATIONS.md#checkpoint-1--architecture-and-contract-after-m1). Leave coding changes to Codex while that review runs. Bring back the findings; do not give Muse a copy of the key.

For real-room testing later, prepare an owned room image and decide whether it may be sent to Meta and whether it may be published. It is not needed for this synthetic contract. Baseten stays deferred to the comparison stage; Modal stays deferred until a bounded job is justified.
