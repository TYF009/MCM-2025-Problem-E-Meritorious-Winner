# Decision Studio specification

## Controlled experiment

The structural illustration reuses the [M3 explicit Euler engine](../site/models/engine.mjs) and its [scenario manifest](../site/models/scenario-manifest.json). The source is [paper Eq. 10, PDF p. 15](../paper/2521959.pdf#page=15). The [official prompt, p. 2](../problem/2025_ICM_Problem_E.pdf#page=2) asks about herbicide removal. The submitted paper studies broader pesticide withdrawal. The runnable variable C(t) is an aggregate synthetic exposure index. It has no herbicide, insecticide, wildlife, yield, or revenue calibration.

Within each comparison, the producer and consumer initial indices, intrinsic rates, interaction matrix, capacities, relaxation and loss coefficients, solver step, sample grid and horizon match. The only differences are exposure intensity and withdrawal timing. Use a deterministic grid and no seed. A separately adjustable shared growth rate, timestep and horizon apply to all arms.

| Arm | Exposure policy |
| --- | --- |
| Continuous baseline | Baseline intensity on the whole horizon, with no withdrawal. The reused M3 engine accepts the horizon as its switch bound. All updates evaluate C before the horizon, so this sentinel produces continuous exposure across the integration interval. |
| Early withdrawal | Same baseline intensity until an earlier switch, then zero. |
| Late withdrawal | Visitor-selected pre-switch intensity until the later switch, then zero. Setting intensity equal to baseline compares timing alone. A switch exactly at the horizon then produces baseline identity. |

Show paired final population indices, trapezoidal integrals from the solver output at 0.2-unit sample intervals, exact cumulative exposure (intensity × time active), and deltas relative to baseline. Integral units are index × synthetic time. Overlay each population with line patterns that identify the three arms. Show schedule values, fixed inputs and exact source on the page and in exports.

## Illustrative decisions

The initial option matrix is populated from the three computed arms. It has four criteria: producer and consumer integrated indices (benefits by stated preference), cumulative exposure and duration under a policy different from baseline (costs by stated preference). The last criterion measures synthetic time with C different from baseline. It represents management change duration only. The criteria are selectable preferences through weights. The displayed matrix uses computed values so visitors can trace each score to an experiment.

| Method | Definition and edge handling |
| --- | --- |
| Orientation | Benefit columns use (x−min)/(max−min). Cost columns use (max−x)/(max−min). Constant columns become zero. Display raw and oriented matrices with units and direction. |
| AHP | Visitors set upper-triangle pairwise ratios and the reciprocal completes the matrix. Normalize row geometric means. Estimate λmax by the mean of (Aw)i/wi, then CI = (λmax−n)/(n−1) and CR = CI/RI for the supported order. For n ≤ 2, CR is unavailable. A CR near or above 0.10 prompts review of judgments. Consistency measures internal coherence. |
| EWM | For each oriented column p = z/Σz. Use 0 log 0 = 0 and e = −Σp log(p)/log(m). Constant columns supply zero information. Normalize information 1−e; when total information is zero, use uniform weights and report the fallback. |
| CRITIC | Compute population standard deviations and Pearson correlation between varying columns. Use Ij = σj Σk(1−rjk), excluding zero-variance columns, and normalize. If conflict is zero, weight varying columns by their spread. If none vary, use uniform weights and report it. |
| Hybrid | Arithmetic average of normalized AHP, EWM and CRITIC vectors with equal method shares. This is an explicit studio rule. Display the historical reported vectors separately with source links. |
| TOPSIS | Use the oriented min-max matrix, multiply each column by its hybrid weight, and take distance from the componentwise maximum and minimum. Report closeness d−/(d+ + d−). Identical alternatives get 0.5 and share a rank. Rerun after doubling the exposure criterion’s weight and renormalizing. |
| Pareto Explorer | From the finite three-arm set, a candidate dominates another if it is at least as good on each oriented criterion and strictly better on one. Plot the four-criterion frontier projected onto two raw axes. Equal rows retain separate alternatives and share dominance status. |

A printable brief will include charts, schedules, paired metrics, judgments and ranks for both preferences. Export a complete JSON brief and a CSV scenario report with machine-readable provenance. Link the original [weights and objectives](../paper/2521959.pdf#page=19), [case objectives and constraints](../paper/2521959.pdf#page=22), and [farmer letter](../paper/2521959.pdf#page=25). The letter summary describes the paper’s reported recommendations. Missing observations, calibration, historical search populations and farm economic series prevent reproduction of the original outcomes.

## Delivery and tests

First verify the controlled comparison with identity, switch, alignment and exposure tests. Then test AHP, EWM, CRITIC, TOPSIS and dominance with small reference matrices, including constant and zero data. Run repository tests, keyboard and download checks in desktop and mobile Chromium, then CI. Preserve the Research Story, the Ecological Dynamics Laboratory and protected contest artifacts.

## Verification

- Run `node --test` from the repository root. CI uses the same command. Tests cover aligned grids, identical runs with no effective intervention, both switch times, initial states, integrals and export rows. The decision tests cover reference judgments, zero and constant inputs, correlation conflict, direction-aware ranking, ties and dominance.
- With Playwright and Chromium available, run `node tests/decision-browser.cjs docs/review`. Set `CHROME_BIN` to use an installed executable. The test starts a repository-root loopback server and checks desktop and mobile inputs, keyboard execution, source links, validation, print layout and both downloads.
- Review captures show the [desktop scenario overlays](review/decision-desktop.jpeg), [mobile scenario overlays](review/decision-mobile.jpeg) and a [TOPSIS preference comparison](review/decision-ranking.jpeg).
- The CSV uses typed metadata, scenario and sample rows. The JSON brief contains the alternative scores, the unrounded input matrix and weights, both rank sets and Pareto status. The print action includes the overlay charts and result tables. Data come from the same completed experiment used to render the page.
