# Hackathon requirements and provenance

Snapshot: October 27, 2026. Primary evidence is the participant guide supplied by the user. Its rubric and prize tables were replaced by `[table]` placeholders, so their contents are unknown. The [public organizer page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit) was also checked; it supports the themes, tracks, event dates, and deadline but does not expose the full rubric or a completed submission form in the fetched content.

## Known requirements from the supplied guide

- Incorporate Meta models meaningfully through Meta Model API and/or Meta open weights. Using a coding assistant alone is not the proposed viability evidence.
- Build toward Build for Your World or Push the Frontier.
- Keep the repository public. Source, live product, and video must be accessible to judges.
- Maximum team size: four. Solo entries allowed. Appoint one representative; list everyone who worked on the project.
- Submit one project per team through the [CV submission page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit).
- Supply a three-minute demonstration video highlighting only eligible newly built features, code, and functionality. Clearly distinguish new contributions from existing code.
- Presented work must have been built during the event. Existing products/codebases are allowed only with newly developed contributions identified.
- Do not violate legal, ethical, or platform policies or use code, data, or assets without rights.
- The anti-project examples include simple image analyzers, basic RAG, generic education chatbots, medical-advice applications, and the other categories in the supplied guide.
- Late submissions will not be considered. Verify all links without relying on the submitter's account session.

AccessLens's planned differentiation is editable, evidence-linked spatial simulation with deterministic route computation. Keep this central to the working product and video. Avoid medical advice, inferred clinical profiles, unsupported safety assurances, and compliance certification.

## Dates and time zones

Use `America/New_York` or `America/Detroit` for local deadlines. Both observe the same Eastern time transitions here; do not hard-code EST for October sessions.

| Event | Eastern time, 2026 | Evidence/status |
| --- | --- | --- |
| Kickoff | Monday October 26, noon | Supplied guide |
| Stated building period | October 27–November 4 | Supplied guide; kickoff/event start is October 26 |
| Verifiable agents session | Wednesday October 28, noon–12:30 PM | Supplied guide |
| Fireworks session | Friday October 30, noon–12:30 PM | Supplied guide |
| Office hours | Weekdays, 10–11 AM, Discord text | Supplied guide; also mentions final office hours at deadline |
| Last full day for questions | Tuesday November 3 | Supplied guide |
| Internal complete submission target | Tuesday November 3, 6:00 PM | AccessLens planning target, not official |
| Final submission and Meta-credit claim | Wednesday November 4, 9:00 PM EST | Supplied guide; public event page confirms 9 PM ET |
| Deadline in UTC | November 5, 02:00 UTC | Eastern is UTC−05 by deadline |
| Judging | November 5–8 in guide; November 4–8 on public page | Difference recorded; does not change submission deadline |
| Closing/live finals | Monday November 9, noon | Supplied guide |
| Community winner | Monday November 16 | Supplied guide |

Organizers may update dates. Recheck the official page and announcements before submission. No reminder or automation has been configured by this onboarding work.

## Judging: known and missing

Guide: stage one is pass/fail for baseline viability, theme fit, and reasonable use of Meta models. Stage two rates eligible submissions using a rubric on a 0–10 scale. Stage three advances the top five projects per track to live final judging using the same rubric.

The public event page broadly describes the Indie track in terms of creativity, technical ambition, and a working result. This is not a recovered scoring table. No numerical weights, subcriteria, tie-breakers, or bonus-prize requirements are verified.

## Credits and access

- Meta: user reports $150 credits received. The supplied guide says billing needs a valid payment method and allows a spend-limit notification. A notification is not necessarily a hard spending cap.
- Baseten and Modal: user now confirms both approvals. This supersedes the onboarding's older “not assumed awarded” status. Guide advertises $100 each; actual credited balances/expiration and effective access still need account verification.
- Baseten event identifier in the supplied guide: `meta-models/muse-spark-open-1026`; do not silently use the ordinary docs alias instead.
- Fireworks: no approval or need established; optional only.
- Each person's Meta credits must be claimed individually. Do not request or claim another participant's allocation.

## Existing-work disclosure

The local Git log shows:

| Commit | Eastern timestamp | Contents |
| --- | --- | --- |
| `6fbc1a9` | October 26, 10:49:53 AM EDT | Create Next App scaffold, generated configuration/instructions, starter assets |
| `1b8524f` | October 26, 11:02:17 AM EDT | Dependency installation and lockfile changes |

Both precede the noon kickoff; the guide also labels October 27 as the building-period start. Preserve history and timestamps. Conservatively identify `1b8524f` as the existing baseline and claim only later eligible original functionality. Do not backdate commits, rewrite timestamps, or state that these starter files were built after kickoff.

The guide permits building on existing code, so this baseline can be disclosed without automatically assuming disqualification. Ask organizers to resolve any ambiguity about the event-start boundary. Save the answer or announcement reference for the final contribution statement. Later documentation and code commits must record their actual creation dates.

## Verification checklist

- [x] Inspect existing repository and Git history.
- [x] Confirm remote is `ExternalYelu/accesslens`.
- [x] Confirm GitHub visibility PUBLIC using `gh repo view`.
- [x] Record pre-kickoff starter/dependency baseline.
- [x] Record user-confirmed Baseten and Modal approvals.
- [ ] Confirm accepted registration, Indie track, representative, and exact team roster.
- [ ] Obtain the full judging rubric with readable tables and any linked official terms.
- [ ] Resolve event-start/baseline questions through organizer evidence.
- [ ] Verify geographic/age/entry eligibility, third-party service terms, and any publication obligations from full official terms; none should be invented from this summary.
- [x] Verify actual Muse Spark and SAM model access with bounded live requests (M1).
- [ ] Verify remaining Meta credit balance, billing settings, and spend controls in the dashboard.
- [ ] Verify partner balances and expiration only when needed.
- [ ] Keep a dated, accurate new-contributions list and baseline link in README/submission.
- [ ] Record licenses for dependencies, assets, datasets, and any model weights; choose an appropriate project license before delivery.
- [ ] Demonstrate genuine live Meta inference and segmentation in the product.
- [ ] Document any replay/cached examples and label them in the UI and demo.
- [ ] Publish reproducible setup, environment variable names, limitations, and evaluation evidence without secrets.
- [ ] Confirm deployed product, repository, and three-minute video from a signed-out browser.
- [ ] Confirm submission fields and video constraints in the authenticated form.
- [ ] Submit by the internal target, save receipt/confirmation, and recheck official deadline.

## Exact organizer question for the user to post

Use Discord #questions or #office-hours; no message has been sent on the user's behalf:

> I'm building AccessLens in the Indie Developer track. Could you share the full judging rubric/weights and linked official terms? The participant guide's rubric table is missing from my copy. Please also confirm the eligible development start: kickoff is October 26 at noon ET, while the guide lists October 27–November 4 as the building period. My repository has only a Next.js scaffold and dependency installation from October 26 before kickoff; I plan to disclose them as the existing baseline and present only new functionality developed afterward. Is that disclosure sufficient? Please confirm any live-product access and three-minute video format requirements as well.
