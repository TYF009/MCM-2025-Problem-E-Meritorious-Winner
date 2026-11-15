import { configuration, manifest, simulate, sweep } from '../models/engine.mjs';
import { compareScenarios, defaults, criteria } from '../decision/scenarios.mjs';
import { decide, topsis } from '../decision/methods.mjs';

export const challenges = [
  { id: 'exposure', title: 'Exposure timing',
    question: 'How does the timing of withdrawal change the synthetic population paths?',
    change: 'Switch exposure to zero at synthetic time 8 or 24, with a continuous control.',
    fixed: 'Exposure index 0.5 before any switch. Same Eq. 10 coefficients, initial states, Euler step 0.025 and horizon 40. No random draws.',
    limits: 'This models aggregate exposure with synthetic values. The prompt asks about herbicide removal. The paper studies broader pesticide withdrawal.',
    source: { source: 'paper', page: 15 }, sourceLabel: 'Eq. 10 and Fig. 9 · p. 15',
    classification: 'Structural reconstruction with illustrative parameters' },
  { id: 'noise', title: 'Noise and numerical sensitivity',
    question: 'How do different noise amplitudes change the synthetic trajectory on a fixed random stream?',
    change: 'Compare noise amplitudes 0, 0.03 and 0.10. Sweep noise around the 0.03 reference.',
    fixed: 'Keep the independent model defaults, seed 2025 for noisy runs, step 0.025 and horizon 40.',
    limits: 'Noise uses independent seeded increments. The zero-noise run uses no random draws. A fixed seed enables comparison of paths and supplies no confidence interval or ecological forecast.',
    source: { source: 'paper', page: 23 }, sourceLabel: 'Reported sensitivity study · p. 23 (context)',
    classification: 'Independent illustrative numerical model' },
  { id: 'preferences', title: 'Decision-weight robustness',
    question: 'When does the first-ranked option change as changed-policy duration gains weight?',
    change: 'Compare hybrid weights with multipliers 2, 4 and 8 on changed-policy duration, renormalizing each vector.',
    fixed: 'One unchanged M4 option matrix and criterion definitions. Initial AHP ratios all equal. The same TOPSIS orientation and distance rules are used throughout.',
    limits: 'Ranking changes describe these synthetic options and preferences. The archived paper lacks the historical candidates and ranking inputs.',
    source: { source: 'paper', page: 22 }, sourceLabel: 'Milkwood objectives and reported fit · p. 22 (context)',
    classification: 'Illustrative Decision Studio · synthetic criteria and preferences' }
];

export function runChallenge(id) {
  const plan = challenges.find(entry => entry.id === id);
  if (!plan) throw new RangeError('Unknown published challenge.');
  const solverVersion = manifest.version;
  if (id === 'exposure') return { ...plan, solverVersion, comparison: compareScenarios(defaults) };
  if (id === 'noise') {
    const baseline = manifest.scenarios.independent.defaults;
    const cases = [0, .03, .10].map(noise => {
      const parameters = { ...baseline, noise };
      return { parameters, ...simulate('independent', parameters) };
    });
    const { matrix, rates, initial, scenario } = configuration('independent', baseline);
    return { ...plan, solverVersion, fixedParameters: { matrix, rates, initial, projection: scenario.constants.projection, sampleInterval: manifest.sampleInterval }, units: { time: manifest.timeUnit, population: manifest.populationUnit },
      equation: manifest.scenarios.independent.equation, seed: baseline.seed, cases,
      sensitivity: { parameter: 'noise', baseline, runs: sweep('independent', baseline, 'noise') } };
  }
  const comparison = compareScenarios(defaults);
  const decision = decide(comparison.scenarios, Array(6).fill(1));
  const duration = criteria.findIndex(criterion => criterion.id === 'changedDuration');
  const alternatives = [1, 2, 4, 8].map(multiplier => ({
    multiplier,
    ...topsis(decision.oriented, decision.ranking.weights.map((value, j) => j === duration ? value * multiplier : value))
  }));
  return { ...plan, solverVersion, comparison, options: decision.options, criteria, values: decision.values,
    oriented: decision.oriented, baselineWeights: decision.ranking.weights, alternatives };
}
