# M2 checkpoint: capture and inspectable evidence

Implemented October 27, 2026, Eastern time. Browser verification is complete; physical-phone and assistive-technology field checks remain pending.

## What you can use now

- A responsive workspace with upload, drag-and-drop, and camera capture.
- Local JPEG/PNG/WebP preparation before transfer: original files up to 20 MiB, at most 16 million decoded pixels, EXIF orientation applied, metadata removed, longest edge at most 1600 pixels. Animated inputs and unsupported formats are rejected. The server independently validates the resulting image against M1 limits.
- Wheelchair, walker, crutches, or general preferences, plus an optional user-measured device width. These are user inputs, not visual or clinical inferences. They are not included in the Meta prompt; they are returned separately for later planning.
- Explicit permission/Meta-transfer consent before live analysis. Selecting a photo or opening a camera does not invoke Meta.
- Genuine server-reported validation, Spark, and SAM stages over NDJSON. Cancellation aborts the client request and server work; revision checks prevent stale results replacing another image or example.
- Approximate Spark boxes and actual SAM pixel silhouettes with separate display controls. A text observation list exposes the same evidence; masks have keyboard-operable selectors and explicit unconfirmed associations.
- Local label corrections, presence/movability confirmation, rejection, undo, and manual mask-to-observation associations. Original model output remains unchanged. Rejecting an observation removes its outline and clears associations, without claiming clear floor.
- Visible uncertainty, source/run details, privacy messaging, keyboard focus styles, status announcements, reduced-motion support, and a camera permission fallback.
- A recorded example generated from the original CC0 diagram. Its recorded status is prominent. Loading it makes no inference call; its image hash is verified in supported secure browser contexts.

No floor-plan editor, route solver, physical measurement from a photograph, accessibility score, or rearrangement simulation has been implemented. Those are M3–M4.

## Run it

If the current local preview is running, open `http://127.0.0.1:3107`.

For a fresh session, stop any existing development server first, then run in Mac Terminal:

```sh
cd /Users/eyalwinter/accesslens
npm run dev -- --hostname 127.0.0.1
```

Open the URL printed by Next.js, normally `http://127.0.0.1:3000`. Next allows one active development process per checkout; do not launch another while the current one holds its lock.

First try **Try the recorded example**. Select an observation, edit its label, confirm/reject it, toggle boxes/masks, inspect unknowns, and confirm a mask association. This consumes no API credits.

Then choose an owned photo, review the local preview, choose a mobility preference, check the permission/transfer box, and choose **Analyze photo**. That makes one Spark call and at most one SAM call. Camera access requires a secure context such as HTTPS or loopback localhost; a phone visiting a plain HTTP LAN address may need the upload fallback. HEIC is not supported yet.

Physical-device checks still needed: camera/upload on the intended phone, phone screen reader, desktop screen reader, and a real-room example the user has authorized sending to Meta. Desktop browser emulation is not a substitute for these tests.

## Verification evidence

- 35 offline tests pass, including the existing M1 cases and new profile/result validation, animation/size checks, split UTF-8 stream decoding, terminal-result requirements, error redaction, malformed SVG/association rejection, real progress events, stream lifetime/concurrency, and upstream cancellation.
- TypeScript, lint, and production build pass. The production API remains disabled; recorded exploration works without a key in the browser.
- Playwright CLI checked desktop and a 390 × 844 mobile viewport. No horizontal overflow was observed. Original image dimensions and masks align through the same SVG viewbox, with half-pixel contour alignment for raster cells.
- Recorded example: loaded with two real decoded masks and four observations, with a visible recorded label.
- Review: changed a label, marked an object movable, linked a mask, confirmed an observation, marked it absent, verified its box disappeared and its mask association cleared, then undid the review.
- Keyboard: Tab exposed the skip link; Enter followed by Tab reached Upload photo. Space toggled the mask layer, and focus stayed on its native button. Invalid measured width displayed a specific error.
- Input failures: corrupt PNG rejected locally; Analyze stayed disabled without consent. A JPEG with EXIF rotation changed from encoded 32 × 24 to displayed 24 × 32.
- Camera: permission-denial fallback checked; a simulated 320 × 240 canvas feed was captured and all its tracks stopped. No personal webcam footage was captured. A tiny/incomplete camera frame is rejected rather than accepted as a useful photograph.
- Live UI run: four observations, one mask, `muse-spark-1.3` and `sam-3.1`, approximately 3.1 s/1.1 s for the respective stages. The result was labeled live, with focus moved to the results heading. This is one synthetic run, not a performance benchmark.
- Cancellation: a mocked delayed failure was cancelled, the workspace reset, and a recorded example loaded. The late failure did not replace it or display a stale error. Mocked failures make no provider calls.
- [m2-contract.json](evidence/m2-contract.json) records the original diagram's real output used for the recorded example. The matching public JSON/JPEG are under `public/examples/`. Verification generated that example once and made one further live UI run: one Spark + at most one SAM request per run, no automatic retries.
- The user's new successful M1 result at `docs/evidence/meta-contract.json` was preserved. Browser screenshots/logs are local under ignored `output/playwright/` and `.playwright-cli/`.

These checks do not establish real-room perception accuracy, physical clearance, safety, or legal accessibility compliance. User corrections remain in component memory for the current session; reload/reset clears them. Provider-side retention is separate from this application's no-photo-storage behavior.

## Commit checkpoint

After trying the workspace, use Mac Terminal:

```sh
cd /Users/eyalwinter/accesslens
git status --short --branch
git add .gitignore README.md package.json docs src scripts/record-example.ts tests public/examples
git diff --cached --check
git diff --cached --stat
git diff --cached
```

The expected changes are M2 code/docs, the original recorded example, and your refreshed M1 evidence. `.env.local`, `.playwright-cli/`, and `output/playwright/` must not appear in the staged files. Exit a scrolling Git diff with `q`.

```sh
git commit -m "feat: add accessible capture and evidence workspace"
git push origin main
```

This pushes source to GitHub; it does not deploy a public product. Next is M3: a user-reviewed schematic and deterministic route geometry, kept separate from image masks.
