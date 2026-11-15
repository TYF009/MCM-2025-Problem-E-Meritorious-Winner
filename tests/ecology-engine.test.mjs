import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manifest, simulate, experiment, experimentCSV, sweep, localEquilibrium } from '../site/models/engine.mjs';

const independent = manifest.scenarios.independent.defaults;
const withdrawal = manifest.scenarios.withdrawal.defaults;

function near(actual, expected, tolerance = 1e-11) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${expected}, received ${actual}`);
}

test('default seeded samples agree with the extracted PR #9 prototype', () => {
  const original = [
    [0, 10, 2, 0.5],
    [1, 10.164226162675654, 2.977656846883009, 0.4976839381833636],
    [10, 6.478620359915423, 3.8896172258073363, 1.7546465509424636],
    [20, 8.80538689366708, 3.7324159558838623, 2.822184630599244],
    [40, 10.217925368443806, 2.6217589698014305, 3.9214802271128124]
  ];
  const run = simulate('independent', independent);
  assert.deepEqual(simulate('independent', independent), run);
  assert.notDeepEqual(simulate('independent', { ...independent, seed: 2026 }), run);
  for (const [time, ...states] of original) {
    const sample = run.samples.find(sample => sample.time === time);
    states.forEach((expected, i) => near(sample.state[i], expected));
  }
});

test('zero noise is seed-independent and agrees with hand-computed Euler integration to first sample', () => {
  const parameters = { ...independent, dt: 0.1, noise: 0 };
  const run = simulate('independent', parameters);
  assert.deepEqual(run, simulate('independent', { ...parameters, seed: 0 }));
  const step = ([x,y,z]) => [
    x + .1*x*(.8 - .05*x - .1*y),
    y + .1*y*(-.3 + .08*x - .02*y - .12*z),
    z + .1*z*(-.15 + .06*y - .01*z)
  ];
  step(step([10, 2, .5])).forEach((v, i) => near(run.samples[1].state[i], v));
});

test('solver time grids align with endpoints and stay finite at supported extremes', () => {
  for (const dt of manifest.controls.dt.choices) {
    for (const [model, parameters] of [
      ['independent', { ...independent, growth: 1.2, interaction: 0, noise: .16, initial: 25 }],
      ['withdrawal', { ...withdrawal, growth: .2, exposure: 1, withdrawal: 59, initial: 1 }]
    ]) {
      const result = simulate(model, { ...parameters, dt, horizon: 60 });
      assert.equal(result.steps, 60 / dt);
      assert.equal(result.samples.length, 301);
      result.samples.forEach((sample, i) => {
        near(sample.time, .2*i);
        assert.ok(sample.state.every(v => Number.isFinite(v) && v >= 0 && (model !== 'independent' || v <= 80)));
      });
    }
  }
});

test('invalid inputs fail explicitly', () => {
  for (const [key, value] of [['noise', -1], ['dt', .03], ['seed', .5], ['growth', NaN], ['initial', '10'], ['horizon', Infinity]]) {
    assert.throws(() => simulate('independent', { ...independent, [key]: value }), RangeError, key);
  }
  const {seed, ...missing} = independent;
  assert.throws(() => simulate('independent', missing), /missing random seed/);
  assert.throws(() => simulate('unknown', independent), /Unknown model/);
  assert.throws(() => simulate('withdrawal', { ...withdrawal, withdrawal: 41 }), /within/);
});

test('Eq. 10 producer solution converges to the scalar Riccati reference with cross term disabled', () => {
  // Before withdrawal with a12=0: S' = -a S² + b S + c. Solve via its two steady roots.
  const a = .6 / 18, b = .6 - .12 - .65*.5, c = .12*10;
  const root = Math.sqrt(b*b + 4*a*c);
  const hi = (b + root) / (2*a), lo = (b - root) / (2*a);
  const q = (10 - hi)/(10 - lo) * Math.exp(-root*2);
  const exact = (hi - q*lo)/(1 - q);
  const errors = [.1, .05, .025, .0125].map(dt => {
    const sample = simulate('withdrawal', { ...withdrawal, interaction: 0, dt }).samples.find(row => row.time === 2);
    return Math.abs(sample.state[0] - exact);
  });
  for (let i = 1; i < errors.length; i++) assert.ok(errors[i] < .6 * errors[i-1], errors.join(', '));
  assert.ok(errors.at(-1) < .004);
});

test('the Eq. 10 switch changes the update at the aligned withdrawal time', () => {
  const compare = time => simulate('withdrawal', { ...withdrawal, dt: .1, withdrawal: time }).samples;
  const early = compare(2), late = compare(3);
  assert.deepEqual(early.slice(0, 11), late.slice(0, 11));
  assert.equal(early[11].time, 2.2);
  assert.ok(early[11].state[0] > late[11].state[0]);
  assert.deepEqual(compare(2), early);
});

test('deterministic local analysis verifies an interior fixed point and gives its Jacobian', () => {
  assert.equal(localEquilibrium('independent', independent).status, 'not-applicable');
  const settings = { ...independent, noise: 0 };
  const result = localEquilibrium('independent', settings);
  assert.equal(result.status, 'locally-asymptotically-stable');
  assert.ok(result.state.every(value => value > 0 && value < 80));
  assert.ok(result.residual < 1e-12);
  const [x,y,z] = result.state;
  near(.8 - .05*x - .1*y, 0);
  near(-.3 + .08*x - .02*y - .12*z, 0);
  near(-.15 + .06*y - .01*z, 0);
  near(result.jacobian[1][2], -.12*y);
  assert.equal(localEquilibrium('independent', { ...settings, growth: .2 }).status, 'no-interior-equilibrium');
});

test('one-at-a-time sweeps retain the baseline and share the same seed', () => {
  const runs = sweep('independent', independent, 'growth');
  assert.deepEqual(runs.map(x => x.value), [.64, .72, .8, .88, .96]);
  for (const item of runs) {
    const run = simulate('independent', { ...independent, growth: item.value });
    assert.deepEqual(item.final, run.samples.at(-1).state);
  }
  const edge = sweep('independent', { ...independent, noise: 0 }, 'noise');
  assert.equal(edge[0].value, 0);
  assert.equal(new Set(edge.map(x => x.value)).size, edge.length);
  assert.throws(() => sweep('withdrawal', withdrawal, 'noise'), RangeError);
});

test('export records carry model classification, settings, outputs and provenance', () => {
  const input = { ...withdrawal, interaction: .14 };
  const result = experiment('withdrawal', input, 'exposure');
  assert.equal(result.metadata.seed, null);
  assert.equal(result.metadata.matrix[0][1], .14);
  assert.equal(result.metadata.source.pdfPage, 15);
  assert.equal(result.metadata.version, manifest.version);
  assert.deepEqual(result.metadata.exposureSchedule, { before: .5, from: 12, after: 0 });
  assert.equal(result.sensitivity.runs.length, 5);
  const rows = experimentCSV(result).trim().split('\r\n');
  assert.equal(rows.length, 2 + result.samples.length + result.sensitivity.runs.length);
  assert.ok(rows[1].includes('Structural reconstruction with illustrative parameters'));
  assert.ok(rows[1].includes('""interaction"":0.14'));
  assert.match(rows[2], /^"trajectory","0"/);
  assert.match(rows.at(-1), /^"sensitivity","40","exposure"/);
});

test('independent deterministic trajectory refines toward an RK4 benchmark', () => {
  const settings = { ...independent, noise: 0, horizon: 10 };
  const derivative = ([x, y, z]) => [
    x * (.8 - .05*x - .1*y),
    y * (-.3 + .08*x - .02*y - .12*z),
    z * (-.15 + .06*y - .01*z)
  ];
  const h = .005;
  let state = [10, 2, .5];
  const shifted = (base, delta, scale) => base.map((value, i) => value + scale*delta[i]);
  for (let step = 0; step < 10/h; step++) {
    const a = derivative(state);
    const b = derivative(shifted(state, a, h/2));
    const c = derivative(shifted(state, b, h/2));
    const d = derivative(shifted(state, c, h));
    state = state.map((value, i) => value + h*(a[i] + 2*b[i] + 2*c[i] + d[i])/6);
  }
  const errors = [.1, .05, .025, .0125].map(dt => {
    const trial = simulate('independent', { ...settings, dt });
    assert.deepEqual(trial.safeguards, { lower: 0, upper: 0 });
    return Math.max(...trial.samples.at(-1).state.map((value, i) => Math.abs(value - state[i])));
  });
  for (let i = 1; i < errors.length; i++) assert.ok(errors[i] < .6*errors[i-1], errors.join(', '));
  assert.ok(errors.at(-1) < .03, errors.join(', '));
});
