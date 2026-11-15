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
