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
- Seven research chapters with original figures, Paper and Interpretation views, decision trails and a team-lead retrospective. See the [storyboard](../docs/RESEARCH_STORYBOARD.md).
- Ecological Dynamics Laboratory with a seeded three-population example and an illustrative Eq. 10 exposure withdrawal model. See the [implementation plan](../docs/MODEL_IMPLEMENTATION_PLAN.md).
- Time series, phase projection, interaction coefficients, deterministic local equilibrium checks, one-at-a-time sensitivity and JSON/CSV downloads.
- [Decision Studio](decision/) compares three controlled Eq. 10 scenarios, shows preference-sensitive decision rankings, and exports an auditable brief. See the [studio specification](../docs/DECISION_STUDIO_SPEC.md).
- [Research Companion](companion/) provides offline evidence retrieval, reviewed scenario drafts and three computed model challenges. [Runtime architecture and privacy](../docs/AI_RESEARCH_ASSISTANT_SPEC.md).
- Paper and documentation access; no API keys required.

## What does NOT work yet
- This model is not validated against the competition submission, nor is it a field measurement.
- No calibrated 15-year forecast or verified Pareto decision model. The Eq. 10 case explores the original equation form with synthetic inputs.
- Full model reproduction awaits calibrated source inputs; see the [paper audit](../docs/PAPER_AUDIT.md) and [Figure Atlas](../docs/FIGURE_ATLAS.md).
- GitHub Pages publishing is not yet configured.

## Hosting plan
Once the source audit and smoke tests pass, deploy from the repository root using GitHub Actions or place the static site and referenced assets into the hosting output folder. Publishing `site/` alone would break links to evidence.

## Agent workflow
See [AGENTS.md](../AGENTS.md), [project charter](../docs/PROJECT_CHARTER.md), and [milestone issues](https://github.com/TYF009/MCM-2025-Problem-E-Meritorious-Winner/issues).
