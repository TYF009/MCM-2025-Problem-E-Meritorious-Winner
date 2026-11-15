# Research Companion and Model Challenge Lab specification

## Scope and user journey

This 2026 post-contest extension connects original research evidence, inspectable experiment drafts and numerical challenges. Codex assisted with software development and verification in 2026. The deployed interface runs deterministic retrieval and parsing in the browser. It calls no generative model. The original submission supplies no evidence here for an assertion about contest-era AI use.

1. Read the source library, or ask a question of the **Source Explorer (offline)**. It returns curated passages and uncertainty notes with exact PDF page links. An indexed passage can describe a reported claim or a limitation of available evidence. The original PDF and excerpt library remain available without JavaScript.
2. Enter a supported scenario command. The parser recognizes one full command and produces a parameter draft. Review differences from defaults, source equation, units and constraints. Use separate Validate, Approve and Run actions. Changing or rejecting the draft revokes approval. Only the immutable approved parameter object is used by the solver.
3. Open one of three published challenge configurations. Review the inputs, run the selected challenge explicitly and download its numerical record. The record describes the research question, changed inputs, fixed inputs, limitations and exact paper connection.

## Architecture and evidence

- A versioned local JSON index holds editorial paraphrases and pinpoint PDF citations, with figure and equation IDs where applicable. It includes Eq. 9’s Q/W mismatch, the Eq. 17 cost expression and Eq. 27’s malformed coefficient. Source records use the [paper](../paper/2521959.pdf), [official prompt](../problem/2025_ICM_Problem_E.pdf), [M1 audit](PAPER_AUDIT.md), [atlas](FIGURE_ATLAS.md) and [traceability notes](MODEL_TRACEABILITY.md).
- Retrieval uses explicit intent phrases, topic terms and source-gap rules. It serves the allowlisted passages and fixed missing-evidence messages. It cannot infer unsupported measurements, solve equations, report field validation or extrapolate missing results.
- The command grammar accepts synthetic exposure withdrawal times, producer growth, or a noise amplitude with an explicit seed. It rejects mixed units, extra instructions, invalid numbers and ambiguous targets. The [M3 lab manifest and engine](MODEL_IMPLEMENTATION_PLAN.md) and [M4 comparison and decision methods](DECISION_STUDIO_SPEC.md) govern the approved runs. No new ecological equation is introduced.
- The exposure challenge varies only the synthetic switch times. The noise challenge uses the independent model with matched seeds and time grids, reporting a noise-amplitude sweep. The preference challenge changes the weight on changed-policy duration on one unchanged M4 option matrix. Rankings and trajectories are computed by the existing modules.

## Trust boundaries, privacy and cost

Questions, commands and draft data are untrusted text. Source links come from a local file/page allowlist, with typed values and bounds for recognized fields. Render user input and dynamic results as text. Do not execute supplied formulas, load supplied links, or interpret content as instructions. Approved controls are snapshotted and frozen before execution. Passing the retrieval or grammar checks does not authorize simulation.

The default makes same-origin requests for static files only. Prompts stay in the current page and in any download initiated by the user. They are excluded from URLs, storage, telemetry and outbound requests by the application. Downloads can contain the original prompt, so the interface flags this before export. Static assets have ordinary host access logs. No service credentials, external model calls or usage charges are introduced.

## Optional AI Mode integration design

Optional AI Mode is a design for later review. A future opt-in server adapter would accept a bounded typed question or draft request, retrieve allowlisted source IDs server-side and return a bounded typed passage selection or candidate parameter object. Reject non-allowlisted citations, unexpected keys, unsafe values and unsupported units. Apply request size and token caps, rate and spend limits, timeouts and abuse monitoring with prompt-redacted logs. Store secrets only server-side and allow the offline fallback on errors. A candidate would enter the same review workflow. It would never run a solver or supply numerical results. Security and privacy review would precede deployment.

## Evaluation and non-goals

Check a versioned question and command corpus, exact citation membership, the supplied PDF’s page and figure/equation IDs, source-gap labels, injection and XSS attempts, range/schema failures, approval invalidation and independently checkable numerical regression. Test desktop and mobile keyboard workflows and exports with the existing site served from the repository root. Run the offline suite in CI. See the evaluation record for commands and limitations.

The companion covers indexed topics and a narrow command grammar. It does not provide free-form generative answers, contest result reproduction, farm recommendations derived from synthetic runs, ecological confidence intervals, or certification and revenue predictions.
