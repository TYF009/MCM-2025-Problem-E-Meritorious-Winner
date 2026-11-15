import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parse } from 'parse5';
import { createHash } from 'node:crypto';
import { listFiles, makeInventory, nodes, buildSite } from './build-site.mjs';

const dist = resolve('dist');
const origin = 'https://portfolio.invalid';
const prefix = '/TYF009-project/';
const base = origin + prefix;
const canonical = {
  'paper/2521959.pdf': { pages: 25, gitBlob: '81363596b882ebf3188bf2f75b49012a2d4237da' },
  'problem/2025_ICM_Problem_E.pdf': { pages: 4, gitBlob: 'bc568be59982b6e8d466f9e87ef9edf0b8e568b9' }
};
const paths = new Set(await listFiles(dist));
const inventory = JSON.parse(await readFile(join(dist,'artifact-manifest.json'),'utf8'));
assert.deepEqual(await makeInventory(dist), inventory, 'Artifact checksums');
const html = new Map(), decoded = new Map();
let checked = 0;
for (const file of paths) {
  if (/\.(?:html|css|mjs|json)$/.test(file)) decoded.set(file, await readFile(join(dist,file),'utf8'));
  if (file.endsWith('.html')) {
    const dom = parse(decoded.get(file));
    html.set(file, { dom, ids: new Set([...nodes(dom)].flatMap(n => (n.attrs ?? []).filter(a => a.name === 'id').map(a => a.value))) });
  }
}

function check(source, ref, allowExternal = false) {
  if (!ref) return;
  const url = new URL(ref, base + source);
  if (url.origin !== origin) {
    assert.ok(allowExternal && ['https:','mailto:'].includes(url.protocol), `${source}: unexpected external or executable target ${ref}`);
    return;
  }
  assert.ok(url.pathname.startsWith(prefix), `${source}: target escapes the project build: ${ref}`);
  const relative = decodeURIComponent(url.pathname.slice(prefix.length));
  const target = relative.endsWith('/') || !relative ? relative + 'index.html' : relative;
  assert.ok(paths.has(target), `${source}: missing or mis-cased path ${target}`);
  if (url.hash && target.endsWith('.pdf')) {
    const page = url.hash.match(/^#page=(\d+)$/)?.[1];
    assert.ok(page && Number(page)>0 && Number(page)<=canonical[target]?.pages, `${source}: invalid PDF anchor ${ref}`);
  } else if (url.hash && html.has(target)) {
    assert.ok(html.get(target).ids.has(decodeURIComponent(url.hash.slice(1))), `${source}: missing anchor ${ref}`);
  }
  checked++;
}

for (const [file, { dom }] of html) {
  for (const element of nodes(dom)) {
    const attrs = new Map(element.attrs?.map(({ name, value }) => [name,value]));
    for (const attr of ['href','src','poster','action']) {
      if (attrs.has(attr)) check(file, attrs.get(attr), attr==='href' && element.tagName==='a');
    }
    if (element.tagName === 'img') assert.ok(attrs.get('alt')?.trim(), file + ': image requires alt text');
    assert.equal(element.tagName === 'base', false, file + ': unexpected base tag');
  }
}
for (const [file, data] of decoded) {
  if (file.endsWith('.mjs')) {
    for (const [, specifier] of data.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) check(file,specifier);
  } else if (file.endsWith('.css')) {
    for (const [, specifier] of data.matchAll(/url\(\s*['"]?([^\s'")]+)['"]?\s*\)/g)) check(file,specifier);
    for (const [, specifier] of data.matchAll(/@import\s+['"]([^'"]+)['"]/g)) check(file,specifier);
  }
}
for (const [file,{ gitBlob }] of Object.entries(canonical)) {
  const body = await readFile(join(dist,file));
  const digest = createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');
  assert.equal(digest, gitBlob, file);
}
const manifestFile = 'site/models/scenario-manifest.json';
const scenarios = JSON.parse(decoded.get(manifestFile)).scenarios;
for (const model of Object.values(scenarios)) check(manifestFile,model.citation);
const evidenceFile = 'site/companion/evidence-index.json';
for (const entry of JSON.parse(decoded.get(evidenceFile)).entries) {
  for (const { source,page } of entry.citations) {
    assert.ok(['paper','prompt'].includes(source));
    check(evidenceFile,'../../'+Object.keys(canonical)[source==='paper'?0:1]+'#page='+page);
  }
}
const figureIndex = JSON.parse(decoded.get('docs/paper-figures/index.json'));
assert.equal(figureIndex.length,16);
for (const { file,pdf_page,sha256 } of figureIndex) {
  assert.equal(inventory['docs/paper-figures/'+file],sha256,file);
  check('docs/FIGURE_ATLAS.html','../paper/2521959.pdf#page='+pdf_page);
}
const entryPoints = ['index.html','site/index.html','site/companion/index.html','site/decision/index.html','docs/FIGURE_ATLAS.html'];
for (const file of entryPoints) assert.ok(paths.has(file),file);
for (const file of paths) {
  assert.ok(!/(^|\/)(?:node_modules|\.git|\.github|tests|figures|src)(\/|$)/.test(file),file);
  assert.ok(!/(^|\/)\.env|\.pem$|\.key$|\.zip$/i.test(file),file);
}
for (const [file,data] of decoded) assert.doesNotMatch(data,/\bsk-[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}/,file);
if (process.argv.includes('--rebuild')) {
  await buildSite();
  assert.deepEqual(await makeInventory(dist),inventory,'A second clean build must be byte-identical');
}
console.log(`Verified ${paths.size} files, ${checked} local references, two original PDFs and 16 figure hashes under ${prefix}.`);
