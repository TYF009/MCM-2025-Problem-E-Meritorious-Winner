# Model Traceability — first-pass inventory

This inventory describes **existing repository claims/code**, NOT a completed cross-check of the submitted contest paper. All numerical values and mathematical choices require original-PDF verification.

| Component | Existing evidence | Reconstruction goal | Key scientific gate |
| --- | --- | --- | --- |
| Ecological interaction dynamics | `src/srcaed_simulator.py`; `figures/Fig5_AED_Framework.png` | Model explorer and seeded stochastic solver | Paper equation, species states, timescales, matrix values |
| Equilibrium and local stability | `src/srcmatlabaed_sensitivity_analysis.m` | Equilibrium eigenvalue & phase-space lab | Local deterministic vs global stochastic stability distinguished |
| Management interventions | `figures/Fig10_Beneficial_Insects.png` | Comparative what-if scenarios | Paper intervention implementation, assumptions and comparisons |
| Hybrid weights | `src/hybrid_weighting.py` | Interactive AHP/EWM/CRITIC calculations | Existing weight arrays are entered directly, NOT derived from input judgment/data matrices |
| Multi-objective optimization | `src/multi_objective_opt.py` | Genuine algorithm / TOPSIS decision comparison | Current code omits standard NSGA-II crossover and crowding-distance selection; existing objective functions appear illustrative |
| Long-term outcome | `figures/Fig14_15Years_Forecast.png` | Original vs reconstructed 15-year story | Verify exact figure and axes/units and use no invented values |
| Farmer advisory | Original PDF final text (to verify) | Evidence-linked decision memo | Advice must not exceed scenario evidence |

## Current website prototype
The prototype is **illustrative**. Three synthetic normalized populations follow a generic coupled interaction rule. Default values are user-facing teaching values rather than paper-fitted data. It must never be described as reproducing the 2025 submission.

## Before making a reproduction claim
1. Quote and reference exact governing equations and page numbers.
2. Record the units, species and parameters from the paper.
3. Resolve missing or inconsistent parameters openly.
4. Implement deterministic / stochastic solvers with seeded repeatability and numerical tests.
5. Compare outputs with original figures and state meaningful deviations.
6. Obtain reviewer sign-off on labeling.
