# Audit of the original Problem E paper

**The Silent Shift , The Verdant Metamorphosis**, team 2521959, 25 PDF pages. [Paper](../paper/2521959.pdf) Git blob `81363596b882ebf3188bf2f75b49012a2d4237da`; [official Problem E](../problem/2025_ICM_Problem_E.pdf) Git blob `bc568be59982b6e8d466f9e87ef9edf0b8e568b9`. Both working copies were byte-checked against the repository. The paper was reviewed by rendered page and extracted text; the official prompt was reviewed across all four pages. Page locations refer to the 1-based PDF page. See the [figure atlas](FIGURE_ATLAS.md) and [equation audit](MODEL_TRACEABILITY.md).

| PDF page | Evidence and scope |
| --- | --- |
| [1](../paper/2521959.pdf#page=1) | Summary, title and team ID; AED, FPI, intervention results, 5D-OFE and projections. The summary points to Fig. 7 for native species; the native-species chart is Fig. 8, p. 14. |
| [2](../paper/2521959.pdf#page=2) | Contents for §§1–8 and references. The letter is on p. 25 although omitted from contents. |
| [3](../paper/2521959.pdf#page=3) | §§1.1–1.2: forest conversion, Fig. 1 and problem restatement. Opening quote attribution is not independently verified. |
| [4](../paper/2521959.pdf#page=4) | §§1.2–1.4: decision/letter objective, literature context and workflow. Citations describe inspiration; they do not supply the team's fitted inputs. |
| [5](../paper/2521959.pdf#page=5) | Fig. 2 workflow; Table 1 notation (N, B, R, μ, EC, EM, CP, PE, SF); assumptions introduction. |
| [6](../paper/2521959.pdf#page=6) | Assumes maximum chemical effectiveness and no resistance/mutations or long-term aftereffects; discards weak factors; assumes internet inputs reliable/stable. Fig. 3 food web. These are simplifications, not validated properties. |
| [7](../paper/2521959.pdf#page=7) | §4.2: Table 2 data portals and Fig. 4 Australian maps. Crop, geography and temporal alignment of inputs are not established. |
| [8](../paper/2521959.pdf#page=8) | §§5.1–5.2.1: Fig. 5 and conceptual split of linear/nonlinear factors, with 71 parallel factors reported; no complete list of the 71 with values. |
| [9](../paper/2521959.pdf#page=9) | Eq. 1 age-stage balance; white, jump and telegraph noise descriptions; Eq. 2 population interactions with age and delay. |
| [10](../paper/2521959.pdf#page=10) | Eq. 3 age boundary and initial profiles; Eq. 4 intra-specific effects; Eq. 5 delayed food chain. |
| [11](../paper/2521959.pdf#page=11) | Eq. 6 environmental delay/impulse; Eq. 7 integrated AED; forest conversion experiment outline. |
| [12](../paper/2521959.pdf#page=12) | Fig. 6: reports counts falling from 330/247 to 3/2 and recovering to 100/37 after four quarters. Cannot establish whether every series point is observed or modeled. FPI uses six energy levels across five stages. |
| [13](../paper/2521959.pdf#page=13) | Fig. 7 FPI energy patterns; Eq. 8 setup maps existing crops and carnivorous insects to X/Y and introduces dandelions and snails. |
| [14](../paper/2521959.pdf#page=14) | Eq. 8–9, Fig. 8: Euler-Markov description and native species response. Paper reports growth for 12 months and stabilization starting month 13; initial values are symbolic. |
| [15](../paper/2521959.pdf#page=15) | Eq. 10 and Fig. 9: six indicators peak around 12 months after pesticide removal according to prose. Eq. 11 introduces AED-I. |
| [16](../paper/2521959.pdf#page=16) | Fig. 10: separate bat and bee scenarios over ten years, with sensitivity and self-regulation curves. §6 starts organic farm evaluation. |
| [17](../paper/2521959.pdf#page=17) | Fig. 11 ten indicators across five dimensions; Eq. 12 pH, Eq. 13 organic matter density. |
| [18](../paper/2521959.pdf#page=18) | Eq. 14–18 economic growth/cost and net benefit; weighting method introduced. |
| [19](../paper/2521959.pdf#page=19) | Eq. 19–22 AHP and EWM, and start of CRITIC procedure. Reports vectors but omits judgment matrix and raw data. |
| [20](../paper/2521959.pdf#page=20) | Completes CRITIC, Eq. 23 weight spread, Fig. 12 combined weights; objective setup. |
| [21](../paper/2521959.pdf#page=21) | Eq. 24–27: NSGA-II/TOPSIS, ARIMA(2,1,2), and Milkwood case objectives. Eq. 27 has a malformed coefficient. |
| [22](../paper/2521959.pdf#page=22) | Eq. 28 Milkwood constraints, Fig. 13 fit, Eq. 29 fitted line and reported three-value optimum. Introduces 15-year projections. |
| [23](../paper/2521959.pdf#page=23) | Fig. 14 sustainability score and monetary series (axis labeled Million/AUD; calendar ticks 2013–2037); the relationship between the economic-benefit series and income minus cost is not established; Fig. 15 and §7 perturbation results. Treat both as reported scenario outputs. |
| [24](../paper/2521959.pdf#page=24) | §7 continuation, §8 strengths and scope limits; six references. Model excludes epidemics, national policy shocks, inflation and exchange rates. |
| [25](../paper/2521959.pdf#page=25) | Milkwood farmer letter, unnumbered radar chart and recommendations: restoration zones, nitrogen-fixing plants, soil monitoring, nets and habitat for natural enemies, tourism and education revenue. Reports declines of 13.86% stability, 11.37% biodiversity, 13.43% disturbance resistance; projects 32.56% stability gain, organic targets in six years, rising profit after three years, parity in year seven and a peak in year fourteen. Baselines, thresholds, calculations and field validation are unavailable. This is contest scenario advice; it does not establish actual farm outcomes or certification. |

## Prompt-to-paper coverage

| Official prompt | Paper response and limitation |
| --- | --- |
| [p. 1](../problem/2025_ICM_Problem_E.pdf#page=1): establish forest-to-farm food web; account for agriculture seasonality and chemical effects | §§4–5, Figs. 3, 6–7, 9. Seasonal profiles and aggregate chemical-removal trends are shown; no separate auditable chemical-response series for plants, insects, bats and birds. |
| [p. 2](../problem/2025_ICM_Problem_E.pdf#page=2): add two returning native species | §5.4 dandelions/snails and the four-state model; symbolic and numerical gaps remain. |
| p. 2: remove herbicide, use bats as insectivores/pollinators and compare another beneficial species | §5.5 models general chemical pesticide removal and compares bats/bees. Do not equate general pesticide removal with a herbicide-only experiment. Eq. 11 is an aggregate stability curve; separate bat-pollination and predator interactions are not parameterized. |
| p. 2: consider organic scenarios, biodiversity, crop health and costs; write a letter including policy incentives | §§6–8 and p. 25 provide indicators, a case study and advice. Formal policy incentives and comparable treatment arms are not fully specified. |
| [pp. 2–4](../problem/2025_ICM_Problem_E.pdf#page=2): report requirements, AI disclosure if used, submission notes and glossary | The supplied paper contains a summary, contents, solution, references and letter. It contains no AI-use appendix. This does not establish whether AI was used in the original submission or whether a separate report exists. |

## Repository evidence

- **Original 2025 research:** the canonical paper and the charts actually embedded in it. The official problem is an original contest source from COMAP, not a team research result. The second PDF, `figures/2521959.pdf`, is a different blob and is not the research paper.
- **Paper figure copies:** the four historical numbered PNGs visually correspond to Figs. 2, 5, 10 and 14. Their separate export history is unverified; the site uses the paper objects.
- **Unverified provenance:** the certificate PNG and second PDF are supplementary award evidence. Artifact authenticity and award claims beyond what those files show were not independently verified.
- **Illustrative demonstration:** the four historical scripts implement simplified examples or related analyses, not a faithful rerun; their contest-era authorship and batch history are unverified. `aed_simulation_result.png`, `matlab_phase_portrait.png`, `hybrid_weighting_result.png` and `pareto_topsis_result.png` match the scripts' designated output filenames, but the exact generating runs are not attested. The portfolio’s three-population demo is also illustrative.
- **Post-contest reconstruction:** reserve this label for a separately implemented and tested model with documented source mapping and deviations. No historical script or demo earns that label as a paper reproduction in M1.
- **Post-contest AI extension:** planned in milestone 5. The current extraction, audit and provenance UI are post-contest documentation work; they add no scientific result or AI validation.
