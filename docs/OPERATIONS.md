# AccessLens setup and user handoffs

As of October 27, 2026. M1 is committed, and the user verified its live smoke test. M2 is now implemented and browser-verified. See [M2 checkpoint](M2_CHECKPOINT.md) for current run/commit/push instructions. Commands below are historical milestone instructions unless recorded as executed.

## What is needed next

The Meta key is configured and working. No additional provider credential is needed for M2 or the M3 geometry work. Try the local recorded example first, then an owned photo if desired. Phone and real screen-reader field checks remain pending. Baseten and Modal credits are approved according to the user, but neither is a prerequisite for the first complete product loop.

| When | User action | Credential or account | Completion signal |
| --- | --- | --- | --- |
| Now, before M1 live requests | Verify Meta credits and billing readiness; place key in ignored root `.env.local` | `MODEL_API_KEY` | Tell Codex “Meta key is configured”; never send its value |
| Before architecture review | Install/open Muse Code in this repo; browser sign-in | Meta developer identity | `muse --version`, then successful interactive sign-in |
| Before promising a track | Check accepted registration, Indie track, representative/roster; obtain full rubric | CV platform and Discord | Share non-secret answers/table text or link |
| Before meaningful image tests | Supply or approve owned photos and publication permissions | No API key | One development image, later a varied evaluation set |
| M5 provider comparison | Check approved Baseten balance; create least-privileged usable inference key | `BASETEN_API_KEY` | Tell Codex “Baseten is configured” |
| M5 only if a bounded job is justified | Authenticate Modal and verify `externalyelu` / `main` | Local Modal login; runtime proxy credentials only if an endpoint is used | Auth/workspace verified and resource plan documented |
| Preview/release stage | Choose/connect deployment host and add server secrets in host UI | Hosting/GitHub login | Preview deployed and signed-out flow passes |
| M6–M7 | Record/upload demo, verify links, submit in CV | Video host and submission account | Accessible video and saved submission confirmation |

No database, Maps, payment, Hugging Face, Fireworks, or general cloud key is required for the core plan. Ask for an additional service only with a concrete use and scope.

## Meta application setup

Open the official [Meta API quickstart](https://dev.meta.ai/docs/quickstart) and its dashboard link. Confirm the $150 allocation is actually posted and billing is enabled. Set billing notifications and a hard cap if the account supports one; do not assume an alert stops usage.

In a local editor, create `/Users/eyalwinter/accesslens/.env.local` with this name/value structure, replacing the placeholder privately:

```dotenv
MODEL_API_KEY=replace_privately_with_your_meta_key
```

The existing `.gitignore` ignores `.env*`, including `.env.local`. Do not paste the key into this chat, a prompt, a screenshot, shell history, a committed file, or any `NEXT_PUBLIC_` variable. Restart the development server after changing local environment configuration. On deployment, add the same name to the host's server environment through its secret settings; a local file does not configure production.

Implemented primary configuration: server-side OpenAI-compatible SDK; base URL `https://api.meta.ai/v1`; Spark `muse-spark-1.3`, reasoning `minimal`; SAM `sam-3.1`. The dotted SAM ID and strict Spark output are verified live. Adding a key alone is not validation; the checkpoint records actual requests.

First live-test plan: one Spark observation request and one single-concept SAM request on an owned image, bounded output/time and no automatic retries for auth failures. Record request count and available usage; avoid running the full evaluation set during setup.

## Muse Code setup and checkpoints

Muse Code is a separate developer tool for review. AccessLens itself calls Meta through its server adapter. Browser login to Muse does not configure the application's environment key.

Official [installation guide](https://dev.meta.ai/docs/muse-code) provides this macOS command. The user may run it in their own terminal:

```sh
curl -fsSL https://dev.meta.ai/install.sh | sh
muse --version
cd /Users/eyalwinter/accesslens
muse
```

On first run, trust this known workspace and choose browser sign-in. `/login` reopens authentication. Use the CLI's help to select an available Spark model; do not assume its default matches the application. [Headless authentication](https://dev.meta.ai/docs/muse-code/auth) uses `META_API_KEY`, while this application's direct client uses `MODEL_API_KEY`. Neither value belongs in prompts or tracked files.

Start with read-only review and the minimum required workspace access. No general connector, personal Drive, inbox, database, or extra cloud account is necessary. Do not change this Codex chat's model/provider configuration to make the app use Meta.

Avoid concurrent edits in the same checkout. At each checkpoint, pause implementation edits, let Muse review, and bring the findings back here. Review prompts below request no file changes or commits. These are user-operated review sessions; no external message or agent session has been started automatically.

### Checkpoint 1 — architecture and contract, after M1

Paste into Muse:

> Review AccessLens without editing files or making commits. Read AGENTS.md and docs/PROJECT_BRIEF.md, docs/HACKATHON_RULES.md, docs/ROADMAP.md, and docs/OPERATIONS.md. Inspect the implementation and actual provider contract evidence without reading or printing secrets. Audit the boundary between image segmentation and ground-plane geometry, schema validation, partial-stream handling, server/client secrets, and unsupported measurement or safety claims. Identify concrete defects with file paths and line numbers, their consequence, and a minimal correction. Separate verified defects from open questions. Do not call paid APIs, upload media, install dependencies, or modify the checkout.

### Checkpoint 2 — geometry and simulation, after M4

> Review AccessLens's route engine and before/after simulation without editing or committing. Read AGENTS.md and the project docs, then inspect geometry code and tests. Look for obstacle inflation and boundary errors, diagonal corner cutting, invalid endpoints, unit/calibration mistakes, misuse of masks as floor footprints, unknown-space assumptions, invalid object moves, stale scenario results, and unsafe path smoothing. Check whether undo restores the exact scenario and whether the mobility model's limits are visible. Cite actionable defects by file and line, explain a reproducing layout or interaction, and suggest a minimal correction. Do not read secrets or call paid providers.

### Checkpoint 3 — release audit, after M5

> Audit the AccessLens release candidate without editing or committing. Follow AGENTS.md. Inspect the complete user flow, failure handling, keyboard and text alternatives, credential isolation, image retention/logging, resource limits, replay labeling, setup reproducibility, license/provenance records, evaluation denominators, and claims in the report and README. Compare implemented behavior against docs/ROADMAP.md and docs/HACKATHON_RULES.md. Report release-blocking defects first with evidence and file/line references, then smaller issues and unverified assumptions. Do not deploy, push, post messages, upload private media, or invoke paid APIs.

Codex will review findings against code, apply valid fixes, and rerun affected checks. A second model's opinion is review input, not proof of correctness or a substitute for tests.

## Baseten setup — wait until M5

Approval is recorded; there is no need to request credits again. Before the comparison, open the Baseten account, verify the balance and event-model access, then add privately to root `.env.local`:

```dotenv
BASETEN_API_KEY=replace_privately_with_your_baseten_key
```

Use `https://inference.baseten.co/v1` with the supplied guide's event model `meta-models/muse-spark-open-1026`. The [reference](https://docs.baseten.co/reference/inference-api/chat-completions) documents the key convention and endpoint; the event alias still needs a real access check. [Vision docs](https://docs.baseten.co/inference/model-apis/vision) describe multimodal transport. Disclose secondary-provider transfer before sending user photos; comparisons should use owned evaluation assets.

The comparison must have a fixed sample/request budget and a common schema. Never silently fail over private images or treat a different model as equivalent without evidence.

## Modal setup — only after the job is specified

Approval is recorded. Defer installation/deployment until a concrete batch-evaluation or open-model workload improves the project. A CPU geometry batch may need no GPU at all.

When that gate is reached:

1. Specify the exact script, dataset rights, number of jobs, CPU/GPU requirements, memory, timeout, concurrency, output location, and spending bound. Default to zero idle containers.
2. Install the Modal SDK/CLI in a dedicated local environment following [Modal getting started](https://modal.com/docs/guide). Do not add Python infrastructure to the frontend dependency graph.
3. Run `modal token new` for browser-based authentication, as described in [Modal token docs](https://modal.com/docs/cli/latest/token). Verify the intended workspace `externalyelu` and environment `main`; user reports alone do not validate account state.
4. Keep local deployment credentials in the CLI's private configuration. For CI only, use secret-store `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` if the chosen workflow requires account credentials. Never put account-wide credentials in the browser.
5. If using a Modal Endpoint, use its scoped proxy credentials, which differ from account/deploy tokens. [Endpoint integrations](https://modal.com/docs/guide/endpoint-integrations) use `MODAL_PROXY_TOKEN_ID` and `MODAL_PROXY_TOKEN_SECRET` in combined form. Endpoint hostname/model and scope depend on the created endpoint; no endpoint is currently provisioned.
6. Run the bounded job, record sanitized provenance and actual compute usage, then verify no unwanted resources remain active.

Do not request all these credential types up front. The exact chosen workload determines which, if any, is needed.

## Git checkpoints and when to push

Current branch is `main`; the public remote already exists. Initial onboarding leaves changes uncommitted for review. Push after each coherent milestone is verified, so the public repository reflects real progress and preserves an honest timeline. Use `codex/` branch names for new implementation branches unless the user directs otherwise.

| Checkpoint | Required evidence before commit/push | Suggested commit subject |
| --- | --- | --- |
| M0 | Documentation diff reviewed; links valid; baseline disclosed | `docs: establish AccessLens architecture and delivery plan` |
| M1 | Bounded live contract evidence; secrets absent; parser/schema checks | `feat: integrate Meta observations and segmentation` |
| M2 | Real capture/evidence flow, accessible alternatives, failure checks | `feat: add capture and inspectable scene evidence` |
| M3 | Geometry invariants, unknown handling, profile and unit tests | `feat: add reviewed floor plans and route solver` |
| M4 | Validated move/undo and computed comparison end to end | `feat: add counterfactual room simulation` |
| M5–M6 | Evaluation evidence, offline CI, production build and deployment checks | `test: evaluate and harden AccessLens release` |
| M7 | Public access and submission metadata validated | `docs: finalize hackathon demo and contribution record` |

After reviewing this documentation diff, the user can run the first checkpoint from the repo root:

```sh
git diff --check
git diff -- AGENTS.md
git status --short
git add AGENTS.md docs/PROJECT_BRIEF.md docs/HACKATHON_RULES.md docs/ROADMAP.md docs/OPERATIONS.md
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "docs: establish AccessLens architecture and delivery plan"
git push origin main
```

Read the staged diff before committing. Use explicit file lists for every milestone; do not indiscriminately stage credentials or photos. Routine feature checks are lint, typecheck, meaningful tests, and build; test scripts will be added with implementation. Never force-push. If remote changes occur, inspect and reconcile them before pushing.

Deployment is a separate step from Git push until an actual host integration is configured. A source repository marked public does not prove the live product/video is accessible.

## Registration and submission handoff

Now: copy the organizer question in [Hackathon rules](HACKATHON_RULES.md) into Discord and bring back the rubric and date-boundary answer. Confirm track and representative in the accepted account. No external messages have been sent automatically.

Before deployment: choose the host based on measured server/runtime/upload limits, add `MODEL_API_KEY` in its server secrets, set resource limits, and test one real flow. A hosting API token need not be shared if the account can connect through its own login or CLI.

Before November 3: confirm exact submission fields in the authenticated form, record the three-minute video, verify all links signed out, submit, and preserve the confirmation. Internal target is November 3 at 6 PM ET; official deadline is November 4 at 9 PM EST. Do not leave first deployment or first submission to the final hour.

## Next instruction to resume implementation

After the context milestone, the user can send:

> Begin M1 and continue through the AccessLens roadmap. The Meta key is configured in the ignored root .env.local. Build and verify the real Meta integration first, then the capture, reviewed-plan, and deterministic simulation flow. Tell me when a user action or provider connection is actually needed. Keep all secrets private, label incomplete/replayed data, and do not add paid infrastructure without a concrete justified workload.

Only say the key is configured if it actually is. If not, implementation can still start on schemas, pure geometry, and offline fixtures, with live integration explicitly pending.
