import { readFile, writeFile, mkdir, readdir, lstat, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { parse, serialize } from 'parse5';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const releaseSource = 'https://github.com/TYF009/MCM-2025-Problem-E-Meritorious-Winner/blob/930488d2f840e2d2ef0fafb5bf4928839b2c0c88/';
const docs = ['PROJECT_CHARTER','PAPER_AUDIT','FIGURE_ATLAS','MODEL_TRACEABILITY','RESEARCH_STORYBOARD',
  'MODEL_IMPLEMENTATION_PLAN','DECISION_STUDIO_SPEC','AI_RESEARCH_ASSISTANT_SPEC','AI_EVALUATION','REUSE_RIGHTS'];
const siteFiles = [
  'index.html','portfolio.css','research-story.css',
  'models/console.css','models/console.mjs','models/engine.mjs','models/scenario-manifest.json',
  'decision/index.html','decision/studio.css','decision/studio.mjs','decision/scenarios.mjs','decision/methods.mjs',
  'companion/index.html','companion/companion.css','companion/companion.mjs','companion/evidence-index.json',
  'companion/retrieval.mjs','companion/drafts.mjs','companion/challenges.mjs'
];
const reviewFiles = ['lab-desktop','lab-mobile','decision-desktop','decision-mobile','decision-ranking',
  'companion-desktop','companion-mobile','companion-challenge'];
const archiveLinks = new Map([
  ['../src/srcaed_simulator.py','src/srcaed_simulator.py'],
  ['../src/srcmatlabaed_sensitivity_analysis.m','src/srcmatlabaed_sensitivity_analysis.m'],
  ['../src/hybrid_weighting.py','src/hybrid_weighting.py'],
  ['../src/multi_objective_opt.py','src/multi_objective_opt.py'],
  ['../tests/fixtures/companion-evaluation.json','tests/fixtures/companion-evaluation.json']
]);

export function* nodes(node) {
  yield node;
  for (const child of node.childNodes ?? []) yield* nodes(child);
}

function htmlLink(link) {
  const file = link.split('#')[0];
  if (archiveLinks.has(file)) return releaseSource + archiveLinks.get(file) + link.slice(file.length);
  if (docs.includes(file.split('/').at(-1).replace(/\.md$/, '')) && file.endsWith('.md')) {
    return file.replace(/\.md$/, '.html') + link.slice(file.length);
  }
  return link;
}

function rewrite(html) {
  const document = parse(html);
  for (const node of nodes(document)) {
    for (const attribute of node.attrs ?? []) if (attribute.name === 'href') attribute.value = htmlLink(attribute.value);
  }
  return serialize(document);
}

const md = new MarkdownIt({ html: false, linkify: false });
const escape = md.utils.escapeHtml;
function evidencePage(title, markup) {
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · The Verdant Metamorphosis</title><link rel="stylesheet" href="evidence.css">
<body><header><nav aria-label="Evidence navigation"><a href="../site/">Portfolio</a> <a href="./">Evidence index</a>
<a href="../site/#lab">Ecological Dynamics Lab</a> <a href="../site/decision/">Decision Studio</a> <a href="../site/companion/">Research Companion</a></nav></header>
<main>${markup}</main></body></html>`;
}

function markdown(source) {
  const tokens = md.parse(source, {});
  const slugCounts = new Map();
  let title = 'Evidence';
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const heading = tokens[i + 1].content;
    if (tokens[i].tag === 'h1') title = heading;
    const slug = heading.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    tokens[i].attrSet('id', slug + (count ? '-' + count : ''));
  }
  return rewrite(evidencePage(title, md.renderer.render(tokens, md.options, {})));
}

async function emit(file, data) {
  const output = join(dist, file);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, data);
}

export async function listFiles(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const file = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isSymbolicLink()) throw new Error('Symbolic link is outside the artifact contract: ' + file);
    if (entry.isDirectory()) found.push(...await listFiles(directory, file));
    else if (entry.isFile()) found.push(file);
    else throw new Error('Unexpected artifact entry: ' + file);
  }
  return found.sort();
}

const hash = data => createHash('sha256').update(data).digest('hex');
export async function makeInventory(directory) {
  const paths = (await listFiles(directory)).filter(file => file !== 'artifact-manifest.json');
  return Object.fromEntries(await Promise.all(paths.map(async file => [file, hash(await readFile(join(directory, file)))])));
}

export async function buildSite() {
  const existing = await lstat(dist).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) throw new Error('dist must be a real directory.');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist);
  const figureIndex = JSON.parse(await readFile(join(root,'docs/paper-figures/index.json'), 'utf8'));
  const figures = [...Array.from({ length:15 }, (_,i)=>'fig-' + String(i+1).padStart(2,'0')), 'letter-radar'];
  if (figureIndex.length !== figures.length ||
      figureIndex.some((entry, i)=>entry.id !== figures[i] || entry.file !== figures[i]+'.webp')) throw new Error('Unexpected figure inventory.');
  const immutable = ['paper/2521959.pdf','problem/2025_ICM_Problem_E.pdf','LICENSE',
    'docs/paper-figures/index.json', ...figureIndex.map(row=>'docs/paper-figures/'+row.file),
    ...reviewFiles.map(name=>'docs/review/'+name+'.jpeg')];
  for (const file of immutable) await emit(file, await readFile(join(root,file)));
  for (const name of siteFiles) {
    const path = 'site/' + name;
    const data = await readFile(join(root,path));
    await emit(path, name.endsWith('.html') ? rewrite(data.toString('utf8')) : data);
  }
  for (const name of docs) await emit('docs/'+name+'.html', markdown(await readFile(join(root,'docs',name+'.md'),'utf8')));
  await emit('docs/index.html', evidencePage('Evidence index', '<h1>Research evidence and methods</h1><ul>' +
    docs.map(name=>`<li><a href="${name}.html">${name.toLowerCase().replaceAll('_',' ')}</a></li>`).join('') + '</ul>'));
  await emit('docs/evidence.css', `body{font:1rem/1.65 system-ui,sans-serif;margin:0;background:#f4f7ef;color:#192f26}
header,main{max-width:74rem;margin:auto;padding:1rem clamp(1rem,4vw,2rem)}nav{display:flex;flex-wrap:wrap;gap:.65rem 1rem}
a{color:#154b35;text-underline-offset:.18em}a:focus-visible{outline:3px solid #825812;outline-offset:3px}
h1,h2{line-height:1.2}main img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;overflow-wrap:anywhere}
th,td{border:1px solid #becdc1;vertical-align:top;text-align:left;padding:.45rem}th{background:#e0ecdf}
pre{overflow:auto;background:#e9f0e8;padding:.7rem}code{overflow-wrap:anywhere}p,li{max-width:80ch}`);
  await emit('index.html', `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Verdant Metamorphosis</title><link rel="stylesheet" href="docs/evidence.css">
<body><main><h1>The Verdant Metamorphosis</h1><p>2025 ICM Problem E research and post-contest engineering by team 2521959's team lead.</p>
<p><strong><a href="site/">Open the portfolio</a></strong></p><nav aria-label="Primary sources"><a href="paper/2521959.pdf">Original paper PDF</a>
<a href="docs/">Research evidence and methods</a></nav></main></body></html>`);
  await emit('.nojekyll', '');
  const inventory = await makeInventory(dist);
  await emit('artifact-manifest.json', JSON.stringify(inventory, null, 2)+'\n');
  return Object.keys(inventory).length + 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${await buildSite()} files into dist/.`);
}
