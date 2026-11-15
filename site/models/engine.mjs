import manifest from './scenario-manifest.json' with { type: 'json' };

export { manifest };

export function configuration(model, parameters) {
  if (!Object.hasOwn(manifest.scenarios, model)) throw new RangeError('Unknown model.');
  const scenario = manifest.scenarios[model];
  if (!parameters || typeof parameters !== 'object') throw new TypeError('Parameters are required.');
  for (const key of scenario.controlOrder) {
    const rule = manifest.controls[key];
    const value = parameters[key];
    const inRange = rule.choices
      ? rule.choices.includes(value)
      : value >= rule.minimum && value <= rule.maximum;
    if (!Object.hasOwn(parameters, key) || !Number.isFinite(value) || !inRange ||
        (rule.integer && !Number.isInteger(value))) {
      throw new RangeError(`Invalid or missing ${rule.label.toLowerCase()}.`);
    }
  }
  if (Object.keys(parameters).some(key => !scenario.controlOrder.includes(key))) {
    throw new RangeError('Unknown parameter for this model.');
  }
  if (model === 'withdrawal' && parameters.withdrawal > parameters.horizon) {
    throw new RangeError('Withdrawal time must be within the simulation horizon.');
  }
  const { constants } = scenario;
  const matrix = constants.matrix.map(row => [...row]);
  matrix[0][1] = model === 'independent' ? -parameters.interaction : parameters.interaction;
  return {
    scenario, matrix,
    rates: [parameters.growth, ...constants.growthTail],
    initial: [parameters.initial, ...constants.initialTail]
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
}

function normal(random) {
  const u = Math.max(1e-12, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

function dot(a, b) {
  let result = 0;
  for (let i = 0; i < a.length; i++) result += a[i] * b[i];
  return result;
}

export function simulate(model, parameters) {
  const { scenario, matrix, rates, initial } = configuration(model, parameters);
  const { dt, horizon, noise = 0 } = parameters;
  const { constants } = scenario;
  const steps = Math.round(horizon / dt);
  const stride = Math.round(manifest.sampleInterval / dt);
  const withdrawalStep = model === 'withdrawal' ? Math.round(parameters.withdrawal / dt) : null;
  const random = noise ? seededRandom(parameters.seed) : null;
  const sqrtDt = Math.sqrt(dt);
  const samples = [{ time: 0, state: initial }];
  const safeguards = { lower: 0, upper: 0 };
  let state = initial;
  for (let step = 0; step < steps; step++) {
    const exposure = step < withdrawalStep ? parameters.exposure : 0;
    state = state.map((value, i) => {
      const interaction = dot(matrix[i], state);
      const drift = model === 'independent'
        ? value * (rates[i] + interaction)
        : rates[i] * value * (1 - interaction / constants.capacity[i])
          + constants.relaxation[i] * (constants.reference[i] - value)
          - constants.loss[i] * value * exposure;
      const diffusion = random ? noise * value * sqrtDt * normal(random) : 0;
      const next = value + drift * dt + diffusion;
      if (!Number.isFinite(next)) throw new Error('Solver produced a non-finite state.');
      if (model === 'withdrawal') {
        if (next < 0) throw new Error('Solver produced a negative state. Try a smaller integration step.');
        return next;
      }
      const [min, max] = constants.projection;
      if (next < min) safeguards.lower++;
      if (next > max) safeguards.upper++;
      return Math.max(min, Math.min(max, next));
    });
    if ((step + 1) % stride === 0 || step + 1 === steps) {
      samples.push({ time: (step + 1) * dt, state });
    }
  }
  return { samples, safeguards, steps };
}

export function sweep(model, parameters, key) {
  const { scenario } = configuration(model, parameters);
  if (!scenario.controlOrder.includes(key) || !['growth', 'interaction', 'noise', 'initial', 'exposure'].includes(key)) {
    throw new RangeError('Choose a supported sensitivity parameter.');
  }
  const { minimum, maximum } = manifest.controls[key];
  const baseline = parameters[key];
  const delta = Math.abs(baseline) * 0.1 || (maximum - minimum) * 0.1;
  const values = [...new Set([-2, -1, 0, 1, 2].map(offset => {
    if (offset === 0) return baseline;
    const rounded = Number((baseline + offset * delta).toPrecision(12));
    return Math.min(maximum, Math.max(minimum, rounded));
  }))];
  return values.map(value => {
    const result = simulate(model, { ...parameters, [key]: value });
    return { value, final: result.samples.at(-1).state, safeguards: result.safeguards };
  });
}

function solve(matrix, rhs) {
  const rows = matrix.map((row, i) => [...row, rhs[i]]);
  for (let i = 0; i < rows.length; i++) {
    let pivot = i;
    for (let j = i + 1; j < rows.length; j++) {
      if (Math.abs(rows[j][i]) > Math.abs(rows[pivot][i])) pivot = j;
    }
    if (Math.abs(rows[pivot][i]) < 1e-12) return null;
    [rows[i], rows[pivot]] = [rows[pivot], rows[i]];
    const divisor = rows[i][i];
    rows[i] = rows[i].map(value => value / divisor);
    for (let j = 0; j < rows.length; j++) {
      if (j === i) continue;
      const factor = rows[j][i];
      rows[j] = rows[j].map((value, k) => value - factor * rows[i][k]);
    }
  }
  return rows.map(row => row.at(-1));
}

export function localEquilibrium(model, parameters) {
  const { matrix, rates, scenario } = configuration(model, parameters);
  if (model !== 'independent' || parameters.noise !== 0) return { status: 'not-applicable' };
  const state = solve(matrix, rates.map(rate => -rate));
  const [minimum, maximum] = scenario.constants.projection;
  if (!state || state.some(value => !Number.isFinite(value) || value <= minimum || value >= maximum)) {
    return { status: 'no-interior-equilibrium' };
  }
  const residual = Math.max(...rates.map((rate, i) => Math.abs(state[i] * (rate + dot(matrix[i], state)))));
  if (residual > 1e-9) return { status: 'unverified-equilibrium', residual };
  const jacobian = matrix.map((row, i) => row.map(coefficient => state[i] * coefficient));
  const [[a,b,c], [d,e,f], [g,h,i]] = jacobian;
  const coefficients = [-(a + e + i), a*e - b*d + a*i - c*g + e*i - f*h,
    -(a*(e*i - f*h) - b*(d*i - f*g) + c*(d*h - e*g))];
  const [c1,c2,c3] = coefficients;
  const tol = 1e-10;
  const status = c1 > tol && c2 > tol && c3 > tol && c1*c2 - c3 > tol
    ? 'locally-asymptotically-stable'
    : c3 < -tol ? 'unstable' : 'inconclusive';
  return { status, state, residual, jacobian, coefficients };
}

export function experiment(model, parameters, sensitivityParameter) {
  const { scenario, matrix, rates, initial } = configuration(model, parameters);
  const seed = parameters.seed ?? null;
  const solver = model === 'independent'
    ? parameters.noise === 0 ? 'Explicit Euler' : 'Euler–Maruyama'
    : 'Explicit Euler';
  return {
    metadata: {
      version: manifest.version, model, name: scenario.name, classification: scenario.classification,
      equation: scenario.equation, source: {
        file: 'paper/2521959.pdf', pdfPage: model === 'independent' ? 11 : 15, role: scenario.citationRole
      },
      rationale: scenario.rationale, limits: scenario.limits, species: scenario.species, parameters: { ...parameters },
      units: { time: manifest.timeUnit, population: manifest.populationUnit,
        coefficients: scenario.coefficientUnits,
        parameters: Object.fromEntries(scenario.controlOrder.map(key => [key, manifest.controls[key].unit])) },
      rates, matrix, initial, constants: Object.fromEntries(Object.entries(scenario.constants)
        .filter(([key]) => !['growthTail', 'matrix', 'initialTail'].includes(key))),
      sampleInterval: manifest.sampleInterval, solver, seed,
      noiseStream: model === 'independent' && parameters.noise > 0 ? 'LCG32 with Box–Muller normal transform' : null,
      exposureSchedule: model === 'withdrawal' ? { before: parameters.exposure, from: parameters.withdrawal, after: 0 } : null
    },
    ...simulate(model, parameters),
    equilibrium: localEquilibrium(model, parameters),
    sensitivity: { parameter: sensitivityParameter, sharedSeed: seed, runs: sweep(model, parameters, sensitivityParameter) }
  };
}

export function experimentCSV(result) {
  const { metadata, samples, safeguards, equilibrium, sensitivity, steps } = result;
  const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const row = values => values.map(quote).join(',');
  const rows = [row(['record', 'synthetic_time', 'sensitivity_parameter', 'parameter_value',
    ...metadata.species, 'lower_projections', 'upper_projections', 'metadata_json'])];
  const blanks = metadata.species.map(() => '');
  rows.push(row(['metadata', '', '', '', ...blanks, safeguards.lower, safeguards.upper,
    JSON.stringify({ ...metadata, steps, safeguards, equilibrium, sharedSensitivitySeed: sensitivity.sharedSeed })]));
  for (const sample of samples) rows.push(row(['trajectory', sample.time, '', '', ...sample.state, '', '', '']));
  for (const item of sensitivity.runs) {
    rows.push(row(['sensitivity', metadata.parameters.horizon, sensitivity.parameter,
      item.value, ...item.final, item.safeguards.lower, item.safeguards.upper, '']));
  }
  return rows.join('\r\n') + '\r\n';
}
