# Figure Atlas — source audit pending

The submitted paper (`paper/2521959.pdf`) has not yet been fully machine-audited in this redevelopment. **Do not assign PDF page numbers or figure numbers beyond the file names until verified against the PDF.**

| Existing repository asset | Proposed interactive artifact | Origin / status | Paper location |
| --- | --- | --- | --- |
| `figures/Fig2_Workflow.png` | Clickable research pipeline | Existing image, source pending cross-check | To verify |
| `figures/Fig5_AED_Framework.png` | Interactive equation explainer | Existing image, source pending cross-check | To verify |
| `figures/Fig10_Beneficial_Insects.png` | Species interventions and food-web diagram | Existing image, source pending cross-check | To verify |
| `figures/Fig14_15Years_Forecast.png` | Original-vs-reconstructed time-series | Existing image, source pending cross-check | To verify |
| `figures/aed_simulation_result.png` | Numerical time-series comparison | Code-generated image, provenance unverified | Not a paper claim |
| `figures/matlab_phase_portrait.png` | Stability and phase space viewer | Code-generated image, provenance unverified | Not a paper claim |
| `figures/hybrid_weighting_result.png` | Weight explorer | Code-generated image, provenance unverified | Not a paper claim |
| `figures/pareto_topsis_result.png` | Trade-off decision viewer | Code-generated image, provenance unverified | Not a paper claim |
| `figures/certificate.png` | Award evidence | Certificate image; verify details from source | N/A |

## Required fields for each eventual figure record
`id`, `original_title`, `paper_pdf_page`, `original_figure_number`, `source_asset`, `caption`, `research_question`, `associated_equations`, `parameter_source`, `classification`, `verified_by`, `verified_on`.

## Extraction instructions
Use a PDF tool to inspect every rendered page. Prefer native images at original resolution; use high-DPI page cropping for vector illustrations. Retain uncropped originals and record extraction coordinates if crops are made. Verify against the PDF screenshots. Never infer numbers from unreadable graphs.

## Source links
- [Original paper](../paper/2521959.pdf)
- [Official problem](../problem/2025_ICM_Problem_E.pdf)
- [Existing figures](../figures/)
