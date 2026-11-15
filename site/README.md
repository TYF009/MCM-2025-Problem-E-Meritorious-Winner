# Research Portfolio — Prototype (2026)

This is an **illustrative prototype** for the interactive sustainability portfolio based on the 2025 ICM Problem E research.

## Local preview

From the **repository root** run:

```bash
python -m http.server 8000
```

Visit `http://localhost:8000/site/`.

Alternatively use `npx serve .` from repository root.

**Important:** The prototype uses relative links to `../paper/`, `../problem/`, `../figures/`, and `../docs/`, so serve the **repository root**, not only the `site/` subfolder.

## What works now
- Responsive research landing page, original paper and figure links.
- Sustainable agriculture research story and evidence/classification notices.
- Synthetic three-species stochastic dynamical experiment with interactive growth, interaction, noise and random seed.
- Seeded random generator for repeatable outputs, an accessible SVG time-series plot and text-only final state readings.
- Paper and documentation access; no API keys required.

## What does NOT work yet
- This model is not validated against the competition submission, nor is it a field measurement.
- No calibrated 15-year forecast, organic farming what-if comparisons or verified Pareto decision model.
- PDF image/figure/page and formula audit is still required.
- GitHub Pages publishing is not yet configured.

## Hosting plan
Once the source audit and smoke tests pass, deploy from the repository root using GitHub Actions or place the static site and referenced assets into the hosting output folder. Publishing `site/` alone would break links to evidence.

## Agent workflow
See [AGENTS.md](../AGENTS.md), [project charter](../docs/PROJECT_CHARTER.md), and [milestone issues](https://github.com/TYF009/MCM-2025-Problem-E-Meritorious-Winner/issues).
