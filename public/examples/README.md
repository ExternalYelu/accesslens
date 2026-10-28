# Original recorded example

`contract-scene.jpg` is a normalized rendering of AccessLens's original `tests/fixtures/contract-scene.svg`, dedicated to the public domain under CC0 1.0. It contains only an authored synthetic diagram, with no private photograph or personal information.

`contract-evidence.json` records a real Meta Model API run against that exact normalized image. Its timestamp, model IDs, usage when available, output schema, and image hash are preserved. The interface labels it as recorded and does not call a provider when loading it. It is not a real-room evaluation, a floor plan, or an accessibility assessment.

Regeneration is explicit and uses credits: `npm run record:example`. That script only processes the hard-coded original diagram and does not accept private-image inputs. The user's separate M1 smoke result is never overwritten by this script.
