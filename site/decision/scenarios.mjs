import { simulate, configuration, manifest } from '../models/engine.mjs';

export const version = '1.0.0';
export const provenance = 'Structural reconstruction with illustrative parameters';
export const decisionProvenance = 'Illustrative Decision Studio · synthetic criteria and preferences';
export const sources = [
  { file: 'paper/2521959.pdf', page: 15, label: 'Original paper · Eq. 10' },
  { file: 'problem/2025_ICM_Problem_E.pdf', page: 2, label: 'Official prompt · herbicide question' },
  { file: 'paper/2521959.pdf', page: 17, label: 'Original indicators · Fig. 11' },
  { file: 'paper/2521959.pdf', page: 19, label: 'Original weighting · Eqs. 19–23, pp. 19–20' },
  { file: 'paper/2521959.pdf', page: 20, label: 'Original weight chart · Fig. 12' },
  { file: 'paper/2521959.pdf', page: 21, label: 'Original objectives · Eqs. 24–25 and 27' },
  { file: 'paper/2521959.pdf', page: 22, label: 'Original case study · Eqs. 28–29 and Fig. 13' },
  { file: 'paper/2521959.pdf', page: 25, label: 'Original Milkwood farmer letter' }
];
export const limitations = [
  'Exposure is a synthetic aggregate index. The prompt asks about herbicide removal, while the paper studies broader pesticide withdrawal.',
  'Population indices and synthetic time lack calibrated mappings to field populations, yield, calendar time, money, or stability.',
  'Missing historical parameters, raw field observations, economic series and candidate populations prevent reproduction of Milkwood results.',
  'Differences and rankings apply to these computed scenarios and selected preferences. The finite candidate set does not establish an optimum for a farm.'
];
export const defaults = Object.freeze({
  growth: .6, dt: .025, horizon: 40, exposure: .5, early: 8, late: 24, lateExposure: .5
});
export const criteria = [
  { id: 'producerIntegral', label: 'Integrated producer index', unit: 'population index × synthetic time', direction: 'benefit' },
  { id: 'consumerIntegral', label: 'Integrated consumer index', unit: 'population index × synthetic time', direction: 'benefit' },
  { id: 'cumulativeExposure', label: 'Cumulative exposure', unit: 'exposure index × synthetic time', direction: 'cost' },
  { id: 'changedDuration', label: 'Duration under changed exposure', unit: 'synthetic time', direction: 'cost' }
];

function integratedPopulation(samples, index) {
  let area = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    area += (b.time - a.time) * (a.state[index] + b.state[index]) / 2;
  }
  return area;
}

export function compareScenarios(input) {
  if (!input || Object.keys(defaults).some(key => !Number.isFinite(input[key]))) {
    throw new RangeError('Enter all experiment controls as finite numbers.');
  }
  if (!Number.isInteger(input.early) || !Number.isInteger(input.late) ||
      input.early < 0 || input.early > input.late || input.late > input.horizon) {
    throw new RangeError('Withdrawal times must be whole numbers with 0 ≤ early ≤ late ≤ horizon.');
  }
  const { growth, dt, horizon, exposure, early, late, lateExposure } = input;
  const fixed = { ...manifest.scenarios.withdrawal.defaults, growth, dt, horizon };
  delete fixed.exposure;
  delete fixed.withdrawal;
  const arms = [
    { id: 'continuous', name: 'Continuous baseline', intensity: exposure, withdrawalTime: null },
    { id: 'early', name: 'Early withdrawal', intensity: exposure, withdrawalTime: early },
    { id: 'late', name: 'Late withdrawal', intensity: lateExposure, withdrawalTime: late }
  ];
  const configurationFor = arm => ({ ...fixed, exposure: arm.intensity, withdrawal: arm.withdrawalTime ?? horizon });
  for (const arm of arms) configuration('withdrawal', configurationFor(arm));
  const { rates, matrix, initial, scenario } = configuration('withdrawal', configurationFor(arms[0]));
  const scenarios = arms.map(arm => {
    const parameters = configurationFor(arm);
    const run = simulate('withdrawal', parameters);
    const activeDuration = arm.withdrawalTime ?? horizon;
    const changedBefore = arm.intensity !== exposure ? activeDuration : 0;
    const changedAfter = exposure !== 0 ? horizon - activeDuration : 0;
    return {
      ...arm, parameters, samples: run.samples, steps: run.steps,
      metrics: {
        finalProducer: run.samples.at(-1).state[0], finalConsumer: run.samples.at(-1).state[1],
        producerIntegral: integratedPopulation(run.samples, 0), consumerIntegral: integratedPopulation(run.samples, 1),
        cumulativeExposure: arm.intensity * activeDuration, changedDuration: changedBefore + changedAfter
      }
    };
  });
  const baseline = scenarios[0].metrics;
  for (const arm of scenarios) {
    arm.delta = Object.fromEntries(Object.entries(arm.metrics).map(([key, value]) => [key, value - baseline[key]]));
  }
  const { capacity, relaxation, reference, loss } = scenario.constants;
  return {
    version, provenance, sources, limitations, equation: scenario.equation, solver: 'Explicit Euler',
    engineVersion: manifest.version, seed: null, controls: { growth, dt, horizon, exposure, early, late, lateExposure },
    shared: { parameters: fixed, rates, matrix, initial, capacity, relaxation, reference, loss,
      sampleInterval: manifest.sampleInterval },
    units: { population: manifest.populationUnit, time: manifest.timeUnit, exposure: 'synthetic exposure index',
      coefficients: scenario.coefficientUnits, metrics: {
        finalProducer: manifest.populationUnit, finalConsumer: manifest.populationUnit,
        ...Object.fromEntries(criteria.map(({ id, unit }) => [id, unit]))
      } },
    scenarios
  };
}

export function scenarioCSV(comparison) {
  const { scenarios, ...metadata } = comparison;
  const encode = cells => cells.map(cell => '"' + String(cell ?? '').replaceAll('"', '""') + '"').join(',');
  const rows = [
    encode(['record', 'scenario', 'synthetic_time', 'producer_index', 'consumer_index', 'metadata_json']),
    encode(['metadata', '', '', '', '', JSON.stringify(metadata)])
  ];
  for (const { samples, ...arm } of scenarios) {
    rows.push(encode(['scenario', arm.id, '', '', '', JSON.stringify(arm)]));
    for (const { time, state } of samples) rows.push(encode(['sample', arm.id, time, ...state, '']));
  }
  return rows.join('\r\n') + '\r\n';
}
