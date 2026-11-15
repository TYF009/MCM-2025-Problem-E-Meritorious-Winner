import { configuration, experiment, manifest } from '../models/engine.mjs';
import { compareScenarios, defaults as studioDefaults } from '../decision/scenarios.mjs';

export const mode = 'Offline command grammar v1';
export const examples = [
  'withdraw exposure at synthetic time 8, compare to time 24',
  'change the producer growth rate to 0.8',
  'set noise to 0.08 with seed 2025'
];
const decimal = '([+-]?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+))';
const exposurePattern = /^withdraw exposure at synthetic time ([+-]?\d+), compare to (?:synthetic )?time ([+-]?\d+)\.?$/i;
const growthPattern = new RegExp('^change the producer growth rate to ' + decimal + '\\.?$', 'i');
const noisePattern = new RegExp('^set noise to ' + decimal + ' with seed ([+-]?\\d+)\\.?$', 'i');

export function parseDraft(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 240) {
    throw new RangeError('Enter a command from 1 to 240 characters.');
  }
  const text = input.trim();
  if (/\b(?:years?|months?|days?|mg|ml|kg|litres?|aud|dollars?|yield|profit|bats?|bees?)\b/i.test(text)) {
    throw new RangeError('Unsupported units or targets. Use synthetic time, growth, noise or a seed as shown in the examples.');
  }
  const times = text.match(exposurePattern), growth = text.match(growthPattern), noise = text.match(noisePattern);
  if (!times && !growth && !noise) {
    throw new RangeError('Unrecognized or ambiguous command. Try one complete example. Extra phrases are not accepted.');
  }
  const engine = times ? 'm4-exposure' : 'm3-independent';
  const baseline = times ? studioDefaults : manifest.scenarios.independent.defaults;
  const edits = times ? { early: Number(times[1]), late: Number(times[2]) } :
    growth ? { growth: Number(growth[1]) } : { noise: Number(noise[1]), seed: Number(noise[2]) };
  const parameters = { ...baseline, ...edits };
  const changes = Object.entries(edits).map(([key, value]) => ({
    key, from: baseline[key], to: value,
    unit: times ? 'synthetic simulation time unit' : manifest.controls[key].unit
  }));
  return { mode, engine, prompt: input, parameters, changes,
    source: { source: 'paper', page: times ? 15 : 11 },
    sourceRole: times ? 'Eq. 10 structure' : 'Eq. 7 context only',
    equation: times ? manifest.scenarios.withdrawal.equation : manifest.scenarios.independent.equation,
    classification: times ? manifest.scenarios.withdrawal.classification : manifest.scenarios.independent.classification,
    labels: Object.fromEntries(Object.keys(parameters).map(key => [key,
      ({ early: 'Early switch', late: 'Late switch', lateExposure: 'Late intensity', exposure: 'Baseline intensity' })[key]
        ?? manifest.controls[key].label])),
    units: Object.fromEntries(Object.keys(parameters).map(key => [
      key,
      key === 'early' || key === 'late' ? manifest.timeUnit
        : key === 'lateExposure' ? manifest.controls.exposure.unit : manifest.controls[key].unit
    ]))
  };
}

function validate(candidate) {
  const p = candidate.parameters;
  if (candidate.engine === 'm3-independent') {
    configuration('independent', p);
  } else {
    if (![p.early, p.late].every(Number.isInteger) || p.early < 0 || p.early > p.late || p.late > p.horizon) {
      throw new RangeError('Require whole synthetic times with 0 ≤ early ≤ late ≤ 40.');
    }
    const fixed = manifest.scenarios.withdrawal.defaults;
    for (const [withdrawal, exposure] of [[p.horizon, p.exposure], [p.early, p.exposure], [p.late, p.lateExposure]]) {
      configuration('withdrawal', { ...fixed, growth: p.growth, dt: p.dt, horizon: p.horizon, withdrawal, exposure });
    }
  }
}

export function createWorkflow() {
  let phase = 'empty';
  let candidate;
  let approved;
  function requirePhase(allowed) {
    if (phase !== allowed) throw new Error('Complete the previous review step first.');
  }
  function reject() {
    phase = 'empty';
    candidate = approved = undefined;
  }
  return Object.freeze({
    draft(input) {
      reject();
      candidate = parseDraft(input);
      phase = 'draft';
      return structuredClone(candidate);
    },
    validate() {
      requirePhase('draft');
      validate(candidate);
      phase = 'validated';
    },
    approve() {
      requirePhase('validated');
      approved = Object.freeze({ ...candidate.parameters });
      phase = 'approved';
    },
    run() {
      requirePhase('approved');
      phase = 'validated';
      const parameters = approved;
      approved = undefined;
      const result = candidate.engine === 'm4-exposure'
        ? compareScenarios(parameters) : experiment('independent', parameters, 'growth');
      phase = 'complete';
      return { ...structuredClone(candidate), approvedParameters: { ...parameters },
        solverVersion: manifest.version, seed: parameters.seed ?? null, result };
    },
    reject,
    get phase() { return phase; }
  });
}
