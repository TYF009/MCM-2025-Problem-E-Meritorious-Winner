import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orient, ahp, entropyWeights, criticWeights, topsis, pareto, decide } from '../site/decision/methods.mjs';
import { compareScenarios, defaults } from '../site/decision/scenarios.mjs';

const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-10, `${a} vs ${b}`);
const vector = (a,b) => a.forEach((x,i) => near(x,b[i]));

test('min-max orientation reverses cost and gives constant columns zero', () => {
  assert.deepEqual(orient([[1, 2, 5], [2, 0, 5], [3, 1, 5]], ['benefit', 'cost', 'benefit']),
    [[0, 0, 0], [.5, 1, 0], [1, .5, 0]]);
  assert.throws(() => orient([[0], [NaN]], ['cost']), RangeError);
});

test('AHP recovers consistent ratios and detects contradictory judgments', () => {
  const consistent = ahp([2, 4, 2], 3);
  vector(consistent.weights, [4/7, 2/7, 1/7]);
  near(consistent.lambda, 3);
  near(consistent.cr, 0);
  assert.ok(ahp([9, 1/9, 9], 3).cr > .1);
  assert.equal(ahp([2], 2).cr, null);
  assert.throws(() => ahp([0], 2), RangeError);
});

test('EWM uses 0 log 0 and assigns no information to constants', () => {
  const computed = entropyWeights([[1, 1, .4], [0, 1, .4], [0, 0, .4]]);
  const second = 1 - Math.log(2)/Math.log(3);
  vector(computed.information, [1, second, 0]);
  vector(computed.weights, [1/(1+second), second/(1+second), 0]);
  assert.deepEqual(entropyWeights([[0,0],[0,0]]).weights, [.5,.5]);
});

test('CRITIC handles anticorrelation, perfectly correlated columns and zero variance', () => {
  const opposite = criticWeights([[0,1,0], [.5,.5,0], [1,0,0]]);
  near(opposite.correlation[0][1], -1);
  assert.equal(opposite.correlation[2][0], null);
  vector(opposite.weights, [.5,.5,0]);
  const parallel = criticWeights([[0,0,0], [.5,.5,0], [1,1,0]]);
  assert.match(parallel.fallback, /conflict is zero/);
  vector(parallel.weights, [.5,.5,0]);
  assert.deepEqual(criticWeights([[0,0],[0,0]]).weights, [.5,.5]);
});

test('TOPSIS honors directions and preferences, and reports ties', () => {
  const data = orient([[10,8],[7,3]], ['benefit','cost']);
  const result = topsis(data, [.75,.25]);
  assert.equal(result.ranked[0].index, 0);
  near(result.ranked[0].closeness, .75);
  assert.equal(topsis(data, [.25,.75]).ranked[0].index, 1);
  assert.deepEqual(topsis([[0,0],[0,0]], [1,1]).ranked.map(x=>[x.closeness,x.rank]), [[.5,1],[.5,1]]);
});

test('Pareto flags dominated rows, preserving trade-offs and duplicates', () => {
  const result = pareto([[1,.5],[.5,1],[.1,.2],[1,.5]]);
  assert.deepEqual(result.map(r=>r.dominatedBy), [[],[],[0,1,3],[]]);
});

test('decision scores depend on computed metrics and both weight settings', () => {
  const runs = compareScenarios(defaults).scenarios;
  const analysis = decide(runs, Array(6).fill(1));
  assert.equal(analysis.values[2][2], runs[2].metrics.cumulativeExposure);
  assert.equal(analysis.values[2][3], runs[2].metrics.changedDuration);
  assert.ok(analysis.preference.weights[2] > analysis.ranking.weights[2]);
  near(analysis.ranking.weights.reduce((a,b)=>a+b,0), 1);
  near(analysis.preference.weights.reduce((a,b)=>a+b,0), 1);
  assert.notDeepEqual(analysis.preference.ranked, analysis.ranking.ranked);
});
