# Portfolio release plan

## Entry points and resources

| Entry point | Purpose and required resources |
| --- | --- |
| `/` | Static entry page with an accessible link to the portfolio at `site/`. |
| `site/` | Shared navigation, engineering overview, seven Research Story chapters, Figure Atlas, laboratory and retrospective. Loads `research-story.css`, `models/console.css`, `models/console.mjs`, the M3 engine and JSON manifest. |
| `site/decision/` | Controlled Eq. 10 experiments, ranking and printable brief. Loads the studio stylesheet and M4 modules, plus M3 engine and manifest. |
| `site/companion/` | Offline retrieval, source library, reviewed commands and challenge workflows. Loads the companion stylesheet, local evidence index, M5 modules and M3/M4 solvers. |
| `docs/` | Human-readable static evidence pages generated from audited Markdown, with links and headings. Copies the 16 indexed WebP extracts and approved review screenshots referenced by those documents. Historical code and the evaluation fixture can be inspected on GitHub. |
| `paper/2521959.pdf`, `problem/2025_ICM_Problem_E.pdf` | Canonical 25-page submission and four-page prompt. The build preserves bytes and PDF page fragments. |
| Award, historical evidence and archival material | Keep original assets in Git. Link the public COMAP result and archived evidence from the repo. Keep personal award material, the historical scripts and irrelevant archive copies out of the Pages artifact. |

The build will use explicit paths and preserve relative URL structure so the same artifact works under the repository-name prefix. It will generate an evidence index page for documentation navigation and a deterministic SHA-256 inventory. No site runtime package, remote script, model API, token or upload service is required. The lockfile pins build and verification tools for clean installs.

## Verification and publication

- Compare protected paths against the pre-M1 main tree and check same-case paths, both PDFs and page counts, equation labels, the 16 figure hashes, and all current built internal URLs.
- Run the numerical, integrity and curated offline suites. Move all four browser suites to CI against the built artifact mounted at the project path. Capture desktop/mobile screenshots, logs and failure evidence. Review rendered desktop and mobile captures.
- Review all visible research, award, leadership, ecological and AI claims and mark which are reported, illustrated or unverified. Check dependency advisories and document research, third-party rights and the scope of the code license.
- Prepare a main-only manual deployment workflow with an explicit approval input and the `github-pages` environment. M6 prepares the artifact locally and in CI. Repository Pages settings and publication stay with the owner.
- Use a future consolidated release PR to main. Keep the review stack open for the release decision. Review cumulative scope, Git hashes and both Actions jobs on the proposed release head before a separate owner approval.

## Review carryovers and current blockers

Reviews #8–#12 ask for a pinned figure extraction recipe, accurate story terminology, explicit finite Pareto projection, browser CI and exact repository subpath checks. Preserve the audited equations and qualified scientific wording. The connector reports `main` at `ecc0484dcf027f04552eef6b5feb62401bc64b80` and Pages disabled. Branch-protection details returned 403. The owner must confirm protection and environment settings, review document and embedded artwork rights, and approve the consolidated PR and any deployment. No calibrated numerical inputs or field validation were added by the release work.
