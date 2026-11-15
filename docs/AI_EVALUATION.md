# Research Companion evaluation

The [versioned evaluation corpus](../tests/fixtures/companion-evaluation.json) contains 50 cases: 30 source questions and 20 scenario commands. Tests compare exact result statuses, evidence IDs and allowed page sets. These are regression cases for a deterministic interface. They do not measure general language understanding.

| Area | Coverage |
| --- | --- |
| Answerable evidence | Problem scope, forest conversion, food web, AED, seasonal FPI, native reemergence, pesticide and herbicide scope, bats and bees, 5D-OFE indicators, weighting, optimization, forecast, sensitivity and farmer letter. |
| Equation anomalies | Eq. 9 Q/W mismatch on p. 14, Eq. 17 cost expression on p. 18, Eq. 27 malformed coefficient on p. 21. |
| Missing evidence | Numeric initial densities, raw data, observed profit, field validation or reproduction, and contest AI tooling. Unknown topics produce an explicit index gap. |
| Injection and untrusted content | Requests to ignore citations, invent a forecast, reveal system instructions, execute HTML, or append instructions to otherwise valid commands. Citation construction rejects arbitrary sources and invalid pages. Browser tests submit an event-handler payload and check that no DOM image or execution marker appears. |
| Draft validation and control | Valid grammar, signed inputs, invalid sizes and seeds, times outside bounds, mixed units, unrecognized commands, and ambiguous targets. Tests check that validation and approval are separate, no earlier stage can run, altered preview objects do not alter the private proposal, and rejection or editing revokes approval. |
| Computation | Compare approved results to direct M3 and M4 calls. Check Eq. 10 cumulative exposure and matched pre-switch states. Check the legacy seeded producer endpoint and aligned noise grids. Confirm that increased duration weight can change the TOPSIS leader using the same matrix. |
| Static and browser integrity | Verify both original Git blob hashes, figure and equation pages against the audit, and parity between static excerpts and indexed evidence. Assert restrictive CSP and local module imports. Exercise the UI at 1280×940 and 390×844 and verify the original PDF and all 18 notes with JavaScript disabled. |

## Run the checks

From the repository root, run `node --test`. CI uses the same suite. With Playwright and Chromium available, run `node tests/companion-browser.cjs docs/review`. Set `CHROME_BIN` if using an installed Chromium executable. The browser script serves the repository through a temporary loopback server. It verifies cited links, attempts to inject markup, checks keyboard access and approval gates, reads generated downloads, and observes the requests emitted by the companion page.

[Desktop retrieval](review/companion-desktop.jpeg) · [Mobile draft review](review/companion-mobile.jpeg) · [Preference challenge](review/companion-challenge.jpeg)

## Limits and development record

The index covers a curated set of topics. Different phrasing can give an incomplete match or no result, and the interface does not synthesize across arbitrary questions. The grammar accepts only the documented command patterns. Input, errors, and status checks are reproducible for these tested cases. The browser check covers Chromium and representative viewport sizes. The tests and threat model support review of the offline product, not certification for a future hosted adapter.

Codex assisted with the 2026 engineering work. Neither search nor command interpretation calls a language model at runtime. No provider or model was called by the website. Optional AI Mode remains a design for a later security review, with the offline experience available independently. The original contest paper remains the authority for reported historical claims. No new evidence about contest-era AI use or field validation is introduced.
