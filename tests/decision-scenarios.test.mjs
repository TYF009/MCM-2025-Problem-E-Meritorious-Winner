import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareScenarios, defaults, scenarioCSV } from '../site/decision/scenarios.mjs';

test('three scenarios share every solver input except the intervention', () => {
  const input = { ...defaults, dt: .05, horizon: 32, lateExposure: .25 };
  const result = compareScenarios(input);
  const [base, early, late] = result.scenarios;
  assert.equal(base.withdrawalTime, null);
  assert.equal(result.seed, null);
  for (const arm of result.scenarios) {
    const { exposure, withdrawal, ...shared } = arm.parameters;
    assert.deepEqual(shared, result.shared.parameters);
    assert.deepEqual(arm.samples[0].state, result.shared.initial);
    assert.deepEqual(arm.samples.map(row => row.time), base.samples.map(row => row.time));
    assert.equal(arm.samples.at(-1).time, 32);
    assert.equal(arm.steps, 640);
  }
  assert.deepEqual(result.scenarios.map(a => a.metrics.cumulativeExposure), [16, 4, 6]);
  assert.deepEqual(result.scenarios.map(a => a.metrics.changedDuration), [0, 24, 32]);
  assert.deepEqual(base.samples.slice(0, 41), early.samples.slice(0, 41));
  assert.ok(early.samples[41].state[0] > base.samples[41].state[0]);
  assert.notDeepEqual(late.samples[1].state, base.samples[1].state);
  assert.deepEqual(compareScenarios(input), result);
});

test('no effective policy change produces exact baseline identity', () => {
  for (const input of [
    { ...defaults, early: 40, late: 40 },
    { ...defaults, exposure: 0, lateExposure: 0 }
  ]) {
    const [base, ...arms] = compareScenarios(input).scenarios;
    for (const arm of arms) {
      assert.deepEqual(arm.samples, base.samples);
      assert.ok(Object.values(arm.delta).every(delta => delta === 0));
    }
  }
});

test('earlier withdrawal changes the first update after its switch', () => {
  const [base, early, late] = compareScenarios(defaults).scenarios;
  assert.deepEqual(early.samples.slice(0, 41), late.samples.slice(0, 41));
  assert.ok(early.samples[41].state[0] > late.samples[41].state[0]);
  assert.deepEqual(late.samples.slice(0, 121), base.samples.slice(0, 121));
  assert.ok(late.samples[121].state[1] > base.samples[121].state[1]);
  const hand = early.samples.slice(1).reduce((sum, point, i) =>
    sum + (point.time - early.samples[i].time) * (point.state[0] + early.samples[i].state[0]) / 2, 0);
  assert.equal(early.metrics.producerIntegral, hand);
  assert.equal(early.delta.finalProducer, early.metrics.finalProducer - base.metrics.finalProducer);
});

test('invalid times and intensity fail before solver execution', () => {
  assert.throws(() => compareScenarios({ ...defaults, early: 25 }), /early/);
  assert.throws(() => compareScenarios({ ...defaults, late: 60 }), /horizon/);
  assert.throws(() => compareScenarios({ ...defaults, lateExposure: 1.01 }), /exposure/);
  assert.throws(() => compareScenarios({ ...defaults, dt: NaN }), /finite/);
});

test('scenario CSV records provenance, all samples and no baseline withdrawal', () => {
  const comparison = compareScenarios(defaults);
  const csv = scenarioCSV(comparison);
  assert.match(csv, /Structural reconstruction with illustrative parameters/);
  assert.match(csv, /""withdrawalTime"":null/);
  assert.equal(csv.trim().split('\r\n').length, 2 + 3 * 202);
});
