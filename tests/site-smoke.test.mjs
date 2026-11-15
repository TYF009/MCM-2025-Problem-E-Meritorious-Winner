import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
test('site contains required portfolio and provenance elements', () => {
  for (const marker of ['Original Paper','illustrative educational model','Source','2025 ICM','2026+','Model Traceability','Environmental noise']) {
    assert.ok(html.toLowerCase().includes(marker.toLowerCase()), 'missing: ' + marker);
  }
  for (const file of ['../paper/2521959.pdf', '../docs/FIGURE_ATLAS.md', '../docs/PAPER_AUDIT.md','../docs/PROJECT_CHARTER.md']) {
    assert.ok(html.includes(file), 'missing: ' + file);
  }
});
function setup() {
  const defaults = {growth:'0.80', interaction:'0.10', noise:'0.03', seed:'2025'};
  const elements = new Map();
  const get = id => {
    if(!elements.has(id)) elements.set(id, {value:defaults[id] ?? '',textContent:'',innerHTML:'',listeners:{},addEventListener(kind,fn){this.listeners[kind]=fn}});
    return elements.get(id);
  };
  const context = vm.createContext({document:{getElementById:get},Math,Number,Array,Object,JSON});
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, 'inline script missing');
  vm.runInContext(script[1],context,{timeout:1000});
  return {context,get};
}
test('model is finite, nonnegative and repeatable at a fixed seed', () => {
  const {context,get}=setup();
  const a=vm.runInContext('JSON.stringify(run())',context,{timeout:1000});
  const b=vm.runInContext('JSON.stringify(run())',context,{timeout:1000});
  assert.equal(a,b);
  const result=JSON.parse(a);
  assert.equal(result.series.length,3);
  assert.ok(result.series.every(row=>row.length>100 && row.every(x=>Number.isFinite(x)&&x>=0)));
  assert.ok(get('chart').innerHTML.includes('polyline'));
  assert.ok(get('readout').innerHTML.includes('Final normalized state'));
});
test('changing parameters modifies the simulated output', () => {
  const {context,get}=setup();
  const before=vm.runInContext('JSON.stringify(run())',context,{timeout:1000});
  get('interaction').value='0.17';
  const after=vm.runInContext('JSON.stringify(run())',context,{timeout:1000});
  assert.notEqual(before,after);
});
test('reset restores initial parameters', () => {
  const {get}=setup();
  get('noise').value='0.13';
  get('reset').listeners.click();
  assert.equal(Number(get('noise').value),0.03);
});

test('atlas assets match the published index and site cards link to their source pages', () => {
  const base = new URL('../docs/paper-figures/', import.meta.url);
  const index = JSON.parse(fs.readFileSync(new URL('index.json', base), 'utf8'));
  const atlas = fs.readFileSync(new URL('../docs/FIGURE_ATLAS.md', import.meta.url), 'utf8');
  const expected = Array.from({ length: 15 }, (_, i) => 'fig-' + String(i + 1).padStart(2, '0'));
  expected.push('letter-radar');
  assert.deepEqual(index.map(item => item.id), expected);

  for (const record of index) {
    const bytes = fs.readFileSync(new URL(record.file, base));
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', record.id);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, record.id);
    const row = atlas.split('\n').find(line => line.includes('paper-figures/' + record.file + ')'));
    assert.ok(row?.includes('2521959.pdf#page=' + record.pdf_page + ')'), record.id);
  }
  const figures = html.match(/<section id="figures"[\s\S]+?<\/section>/)[0];
  const cards = [...figures.matchAll(/<article class="card">([\s\S]+?)<\/article>/g)];
  assert.equal(cards.length, 6);
  for (const [, card] of cards) {
    const file = card.match(/src="\.\.\/docs\/paper-figures\/([^"]+)"/)?.[1];
    const record = index.find(item => item.file === file);
    assert.ok(record, file);
    assert.match(card, /alt="[^"]{15,}"/);
    assert.ok(card.includes('Original 2025 research'));
    assert.ok(card.includes('../paper/2521959.pdf#page=' + record.pdf_page + '"'));
  }
});

const story = html.match(/<section id="research"[\s\S]+?<\/section>/)[0];
const chapterIds = ['why', 'workflow', 'ecosystem', 'interventions', 'trade-offs', 'farmer-letter', 'team-lead'];

test('research chapters provide navigable evidence and technical disclosures', () => {
  const chapters = [...story.matchAll(/<article class="story-chapter[^"]*" id="([^"]+)"[\s\S]*?<\/article>/g)];
  assert.deepEqual(chapters.map(([, id]) => id), chapterIds);
  for (const [chapter, id] of chapters) {
    assert.ok(story.includes(`href="#${id}"`), id);
    assert.ok(chapter.includes('class="story-technical"'), id);
    if (id !== 'team-lead') assert.match(chapter, /2521959\.pdf#page=[1-9]\d*/);
  }
  const trails = [...story.matchAll(/<details class="story-trail"[\s\S]*?<\/details>/g)];
  assert.ok(trails.length >= 4);
  for (const [trail] of trails) {
    for (const stage of ['Question', 'Model / assumption', 'Paper evidence', 'Reported finding', 'Open limitation']) {
      assert.ok(trail.includes(`<dt>${stage}</dt>`), stage);
    }
    assert.match(trail, /2521959\.pdf#page=[1-9]\d*/);
  }
  for (const [, href, page] of story.matchAll(/href="(\.\.\/[^"#]+\.pdf)#page=(\d+)"/g)) {
    assert.ok(fs.existsSync(new URL(href, new URL('../site/', import.meta.url))), href);
    const lastPage = href.includes('/problem/') ? 4 : 25;
    assert.ok(Number(page) >= 1 && Number(page) <= lastPage, href + '#' + page);
  }
  for (const page of [1, 2]) assert.ok(story.includes(`../problem/2025_ICM_Problem_E.pdf#page=${page}`));
});

test('research figures link to their indexed PDF pages and preserve provenance', () => {
  const base = new URL('../docs/paper-figures/', import.meta.url);
  const records = JSON.parse(fs.readFileSync(new URL('index.json', base), 'utf8'));
  const cards = [...story.matchAll(/<figure class="story-figure">([\s\S]+?)<\/figure>/g)];
  const seen = new Set();
  for (const [, card] of cards) {
    const file = card.match(/src="\.\.\/docs\/paper-figures\/([^"]+)"/)?.[1];
    const record = records.find(entry => entry.file === file);
    assert.ok(record, file);
    assert.ok(fs.existsSync(new URL(file, base)));
    assert.ok(!seen.has(file), 'unexpected duplicate: ' + file);
    seen.add(file);
    const source = `../paper/2521959.pdf#page=${record.pdf_page}`;
    const label = record.id === 'letter-radar' ? 'Unnumbered radar chart' : `Figure ${Number(record.id.slice(4))}`;
    assert.match(card, /alt="[^"]{15,}"/);
    assert.ok(card.includes('2025 Contest Research'));
    assert.equal(card.split(source).length, 3, 'image and caption link to ' + source);
    assert.ok(card.includes(`${label} · PDF p. ${record.pdf_page}`));
  }
  assert.deepEqual([...seen], records.filter(entry => entry.id !== 'fig-04').map(entry => entry.file));
});

test('reading views and the model console have distinct provenance', () => {
  for (const label of ['Paper View', 'Interpretation View', '2025 Contest Research', '2026 AI-assisted Portfolio Reconstruction', 'Illustrative Numerical Demo']) {
    assert.ok(story.includes(label), label);
  }
  const lab = html.match(/<section id="lab"[\s\S]*?<\/section>/)[0];
  assert.ok(lab.includes('Illustrative Numerical Demo'));
  assert.match(lab, /not fitted to the 2025 paper/);
});
