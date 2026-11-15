import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { evidence, retrieve, citationHref } from '../site/companion/retrieval.mjs';
import { createWorkflow } from '../site/companion/drafts.mjs';
import { runChallenge } from '../site/companion/challenges.mjs';
import { experiment, manifest } from '../site/models/engine.mjs';
import { compareScenarios, defaults } from '../site/decision/scenarios.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const corpus = JSON.parse(read('./fixtures/companion-evaluation.json'));
const staticPage = read('../site/companion/index.html');
const figureIndex = JSON.parse(read('../docs/paper-figures/index.json'));

for (const entry of corpus.questions) {
  test('retrieval corpus: ' + (entry.input || '[empty]'), () => {
    const result = retrieve(entry.input);
    assert.equal(result.status, entry.status);
    assert.deepEqual(result.entries.map(note => note.id), entry.ids);
    assert.deepEqual(result.entries.flatMap(note => note.citations.map(({ source, page }) => source + ':' + page)), entry.citations);
    for (const note of result.entries) assert.ok(evidence.entries.includes(note));
    if (result.status === 'gap') assert.match(result.message, /not established/);
    if (result.status === 'unreproduced') assert.match(result.message, /not independently reproduced/);
  });
}

for (const entry of corpus.commands) {
  test('command corpus: ' + entry.input, () => {
    const session = createWorkflow();
    if (entry.outcome === 'rejected') {
      assert.throws(() => session.draft(entry.input), RangeError);
      assert.equal(session.phase, 'empty');
      assert.throws(session.run);
      return;
    }
    assert.equal(session.draft(entry.input).engine, entry.engine);
    assert.throws(session.run);
    if (entry.outcome === 'invalid-parameters') {
      assert.throws(session.validate, RangeError);
      assert.throws(session.approve);
    } else {
      session.validate();
      assert.throws(session.run);
      session.approve();
      assert.equal(session.phase, 'approved');
    }
  });
}

test('sources match the original Git blobs and indexed figure/equation page mappings', () => {
  for (const [file, hash] of [['paper/2521959.pdf', evidence.sourceIdentity.paper],
    ['problem/2025_ICM_Problem_E.pdf', evidence.sourceIdentity.prompt]]) {
    const bytes = readFileSync(new URL('../' + file, import.meta.url));
    const header = Buffer.from('blob ' + bytes.length + '\0');
    assert.equal(createHash('sha1').update(header).update(bytes).digest('hex'), hash);
  }
  const equations = { 7:11,8:14,9:14,10:15,11:15,12:17,13:17,16:18,17:18,18:18,
    19:19,20:19,21:19,22:19,23:20,24:21,25:21,26:21,27:21,28:22,29:22 };
  assert.equal(new Set(evidence.entries.map(entry => entry.id)).size, evidence.entries.length);
  for (const entry of evidence.entries) {
    const article = staticPage.match(new RegExp(`<article[^>]+data-evidence="${entry.id}"[\\s\\S]+?<\\/article>`))?.[0];
    assert.ok(article?.includes(entry.passage), entry.id);
    assert.ok(article?.includes(entry.uncertainty), entry.id);
    for (const source of entry.citations) assert.ok(article.includes(`href="${citationHref(source)}"`), entry.id);
    const paperPages = entry.citations.filter(x => x.source === 'paper').map(x => x.page);
    for (const figure of entry.figures) {
      const id = typeof figure === 'number' ? 'fig-' + String(figure).padStart(2, '0') : figure;
      assert.ok(paperPages.includes(figureIndex.find(item => item.id === id)?.pdf_page), entry.id + ': ' + id);
    }
    for (const equation of entry.equations) assert.ok(paperPages.includes(equations[equation]), entry.id + ': ' + equation);
  }
  for (const invalid of [{ source:'javascript:alert(1)', page:1 }, { source:'paper',page:26 },
    { source:'prompt',page:'2' }, { source:'__proto__',page:1 }]) assert.throws(() => citationHref(invalid));
});

test('approval uses a private parameter snapshot and is revoked on replacement or rejection', () => {
  const session = createWorkflow();
  const preview = session.draft('change the producer growth rate to 0.85');
  preview.parameters.growth = 99;
  session.validate();
  session.approve();
  const output = session.run();
  assert.equal(output.approvedParameters.growth, .85);
  assert.deepEqual(output.result, experiment('independent', { ...manifest.scenarios.independent.defaults, growth:.85 }, 'growth'));
  assert.throws(session.run);

  session.draft('change the producer growth rate to 0.85');
  session.validate();
  session.approve();
  session.reject();
  assert.throws(session.run);
  session.draft('set noise to .08 with seed 12');
  session.validate();
  session.approve();
  assert.throws(() => session.draft('<script>run()</script>'));
  assert.equal(session.phase, 'empty');
  assert.throws(session.run);
});

test('approved M4 commands run the existing experiment only after approval', () => {
  const session = createWorkflow();
  session.draft('withdraw exposure at synthetic time 4, compare to time 24');
  session.validate();
  session.approve();
  const output = session.run();
  assert.equal(output.seed, null);
  assert.deepEqual(output.result, compareScenarios({ ...defaults, early:4 }));
  assert.equal(output.result.scenarios[1].metrics.cumulativeExposure, 2);
});

test('challenge outputs are reproducible, aligned and sensitive to intended changes', () => {
  for (const id of ['exposure','noise','preferences']) assert.deepEqual(runChallenge(id), runChallenge(id));
  const exposures = runChallenge('exposure').comparison.scenarios;
  assert.deepEqual(exposures.map(x => x.metrics.cumulativeExposure), [20,4,12]);
  assert.deepEqual(exposures[0].samples.slice(0,41), exposures[1].samples.slice(0,41));
  const noise = runChallenge('noise');
  assert.ok(Math.abs(noise.cases[1].samples.at(-1).state[0] - 10.217925368443806) < 1e-11);
  const grid = noise.cases[0].samples.map(sample => sample.time);
  for (const run of noise.cases) assert.deepEqual(run.samples.map(sample => sample.time), grid);
  assert.notDeepEqual(noise.cases[1].samples, noise.cases[2].samples);
  assert.deepEqual(noise.sensitivity.runs.find(run => run.value === .03).final, noise.cases[1].samples.at(-1).state);
  const preference = runChallenge('preferences');
  assert.equal(preference.criteria[3].id, 'changedDuration');
  assert.ok(preference.alternatives.at(-1).weights[3] > preference.alternatives[0].weights[3]);
  assert.notDeepEqual(preference.alternatives.at(-1).ranked.map(row=>row.index), preference.alternatives[0].ranked.map(row=>row.index));
  assert.throws(() => runChallenge('javascript:alert(1)'));
});

test('companion runtime uses local modules, restrictive CSP and text-only dynamic rendering', () => {
  const dir = new URL('../site/companion/', import.meta.url);
  for (const file of readdirSync(dir).filter(name => name.endsWith('.mjs'))) {
    const code = readFileSync(new URL(file, dir), 'utf8');
    assert.doesNotMatch(code, /\b(eval\(|new Function\(|innerHTML|outerHTML|insertAdjacentHTML|fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)/);
    assert.doesNotMatch(code, /sk-[A-Za-z0-9_-]{12,}|AKIA[A-Z0-9]{16}|Bearer [A-Za-z0-9_.-]{10,}/);
    for (const [, specifier] of code.matchAll(/from ['"]([^'"]+)['"]/g)) assert.ok(specifier.startsWith('.'), specifier);
  }
  assert.match(staticPage, /script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'self'/);
  assert.doesNotMatch(staticPage, /<script(?![^>]+src=)|\son\w+=/i);
  assert.equal(retrieve('b'.repeat(321)).status, 'invalid');
  assert.throws(() => createWorkflow().draft('a'.repeat(241)));
});
