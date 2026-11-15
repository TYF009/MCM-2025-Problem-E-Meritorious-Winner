import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
test('site contains required portfolio and provenance elements', () => {
  for (const marker of ['Original Paper','illustrative educational model','Source','2025 ICM','2026+','Model Traceability','Environmental noise']) {
    assert.ok(html.toLowerCase().includes(marker.toLowerCase()), 'missing: ' + marker);
  }
  for (const file of ['../paper/2521959.pdf', '../figures/Fig2_Workflow.png', '../figures/Fig14_15Years_Forecast.png','../docs/PROJECT_CHARTER.md']) {
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
