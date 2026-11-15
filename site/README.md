# Portfolio development and production preview

The portfolio presents the 2025 ICM Problem E study and separately labeled post-contest numerical and offline research tools.

From the repository root, use Node.js 22 and npm:

```sh
npm ci --ignore-scripts
npm run build
npm run verify:dist -- --rebuild
npm run preview
```

The printed preview URL includes the GitHub Pages repository-name subpath. The build emits a standalone `dist/` with the site, HTML evidence pages and audited research assets. Serving only the source `site/` directory breaks references to the paper, prompt and audit assets.

Run `npm test` for numerical and source checks. With Chromium installed through `npx --no-install playwright install chromium`, run `npm run test:browser` to verify all four browser suites against the built subpath. Review captures and failure screenshots are written to `release-reports/`. Set `CHROME_BIN` to use an installed Chromium executable.

The numerical models use synthetic units and coefficients. The offline companion retrieves curated notes and parses a limited command grammar with no runtime LLM. See the [repository overview](../README.md), [release plan](../docs/RELEASE_PLAN.md), [release checklist](../docs/RELEASE_CHECKLIST.md) and [integration runbook](../docs/MERGE_RUNBOOK.md).
