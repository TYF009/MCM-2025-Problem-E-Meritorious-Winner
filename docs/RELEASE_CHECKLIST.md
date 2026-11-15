# Release readiness checklist

This checklist separates release-candidate verification from the owner’s integration and publication gates. Record the exact successful GitHub run and tested commit in the draft PR. Local verification is reproducible from the commands below.

| Gate | Candidate result |
| --- | --- |
| Original competition files | **Pass.** All 16 original Git blob IDs and protected file paths match pre-M1 main. Paper, prompt, original figures, separate award evidence and historical scripts remain in Git. |
| Original PDF structure | **Pass.** Both PDFs match their original Git hashes. Extracted labels identify 29 numbered equations across the original paper, 15 numbered figure captions and the farmer letter on p. 25. The prompt has four pages. |
| Atlas and research assets | **Pass.** All 16 WebP SHA-256 values match the audited manifest. A fresh extraction matched all 16 display hashes with the pinned tools. |
| Reproducible build and internal links | **Pass.** Two clean builds produce the same project-path artifact inventory. Exact-case paths, HTML anchors, PDF page ranges, CSS and module dependencies, and local evidence references are checked. |
| Numerical and source tests | **Pass locally.** The expanded suite includes the original numerical and source tests, the 50-case offline corpus and release guard tests. The draft PR records the actual GitHub result. |
| Chromium desktop and mobile | **Pass locally.** Production-subpath browser suites cover the Research Story, Ecological Dynamics Lab, Decision Studio and Companion. Checks include focus, keyboard navigation, reduced motion, responsive overflow, chart labels, actual downloads, printable decision charts and draft approval. |
| JavaScript-free evidence | **Pass.** The root link, portfolio and Figure Atlas remain navigable. Both original PDFs and all 18 cited companion notes are reachable without JavaScript. |
| CI configuration | **Pass for wiring.** Linux CI runs the build and PDF/source checks plus four pinned Chromium suites, with screenshots and logs retained for 14 days. Check the draft PR for run results. |
| Preserved scope and provenance | **Pass.** Original output claims are attributed to the paper. Eq. 9, Eq. 17 and Eq. 27 are documented without rewriting the historical equations. Synthetic outputs, code examples and 2026 development assistance retain distinct wording. |
| Award | **Pass.** The official COMAP Problem E result lists team 2521959 as a Meritorious Winner. The report and archived certificate are linked from the README. |
| Security and privacy | **Pass for tested scope.** Lockfile installation and npm audit completed with zero reported vulnerabilities. The deployed artifact includes no dependencies, award certificate copies, credentials or runtime LLM. The offline workflow retains locally typed content until the visitor exports it. |
| Reuse rights | **Pending owner approval.** The inventory identifies the official prompt and artwork with unresolved reuse rights. Review copies include those assets for verification. Obtain clearance or adjust the release inventory before publication. |
| Branch protection, environment and Pages | **Pending owner verification.** Main is unchanged. The connector reported Pages disabled and could not read branch protection. Main-only manual workflow is prepared. No deployment or post-deployment HTTPS check was performed. |
| Public release | **Pending owner approval.** Follow the separate consolidated integration and publication procedure in the [merge runbook](MERGE_RUNBOOK.md). |

## Reproduce the candidate checks

```sh
npm ci --ignore-scripts
npm audit --audit-level=moderate
npm test
python -m pip install -r tools/requirements-release.txt
python tools/verify-paper.py
npm run build
npm run verify:dist -- --rebuild
npx --no-install playwright install chromium
npm run test:browser
```

On Linux CI install Chromium with `--with-deps`. Reports go to `release-reports/`. While investigating browser failures, inspect the viewport-specific failure screenshots and run logs.

To regenerate the audited figures, use a clean Python environment, install `tools/requirements-figures.txt`, then run `python tools/extract_paper_figures.py ../regenerated-paper-figures` from the repository root. Compare each generated SHA-256 against `docs/paper-figures/index.json`. Compare in a separate directory so the indexed assets stay intact. The production build reads the archived display copies and needs no PDF rendering environment.

[Desktop homepage](review/release-home-desktop.jpeg) · [Mobile homepage](review/release-home-mobile.jpeg) · [Release plan](RELEASE_PLAN.md) · [Attribution and reuse](REUSE_RIGHTS.md)
