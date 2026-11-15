import { retrieve, citationHref } from './retrieval.mjs';
import { createWorkflow, examples } from './drafts.mjs';
import { challenges, runChallenge } from './challenges.mjs';

const $ = id => document.getElementById(id);
const workflow = createWorkflow();
const format = value => Number(value.toPrecision(5)).toString();

function node(tag, content, className) {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = content;
  if (className) el.className = className;
  return el;
}

function cite(reference, label) {
  const el = node('a', label ?? (reference.source === 'paper' ? 'Paper' : 'Prompt') + ', PDF p. ' + reference.page);
  el.href = citationHref(reference);
  return el;
}

function citations(references) {
  const el = node('p', undefined, 'refs');
  el.append(...references.map(reference => cite(reference)));
  return el;
}

function evidenceCard(entry) {
  const card = node('article', undefined, 'note');
  card.append(node('h3', entry.title), node('p', entry.label + ' · ' + entry.section, 'meta'),
    node('p', entry.passage), node('p', entry.uncertainty, 'caveat'), citations(entry.citations));
  return card;
}

function ask() {
  const output = retrieve($('question').value);
  $('ask-status').textContent = output.message;
  $('answers').replaceChildren(...output.entries.map(evidenceCard));
}

function exampleButtons(target, input, values) {
  for (const value of values) {
    const button = node('button', value);
    button.type = 'button';
    button.addEventListener('click', () => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.focus();
    });
    $(target).append(button);
  }
}

function table(caption, headings, data) {
  const box = node('div', undefined, 'scroll');
  box.tabIndex = 0;
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', caption);
  const table = node('table');
  table.createCaption().textContent = caption;
  const header = table.createTHead().insertRow();
  headings.forEach(text => {
    const th = node('th', text);
    th.scope = 'col';
    header.append(th);
  });
  const body = table.createTBody();
  for (const [label, ...cells] of data) {
    const row = body.insertRow(), th = node('th', label);
    th.scope = 'row';
    row.append(th);
    for (const cell of cells) row.insertCell().textContent = cell;
  }
  box.append(table);
  return box;
}

function definitionList(fields) {
  const dl = node('dl');
  for (const [term, value] of fields) dl.append(node('dt', term), node('dd', value));
  return dl;
}

function download(name, result) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const link = node('a');
  link.href = url;
  link.download = name + '.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadButton(name, result) {
  const button = node('button', 'Download experiment JSON', 'secondary');
  button.type = 'button';
  button.addEventListener('click', () => download(name, result));
  return button;
}

function comparisonTable(result) {
  return table('Exposure comparison · synthetic units', ['Arm', 'Switch time', 'Cumulative exposure index × time',
    'Final producer index', 'Δ producer vs baseline', 'Final consumer index'], result.scenarios.map(arm => [
    arm.name, arm.withdrawalTime ?? 'None', format(arm.metrics.cumulativeExposure), format(arm.metrics.finalProducer),
    format(arm.delta.finalProducer), format(arm.metrics.finalConsumer)
  ]));
}

function stateButtons() {
  $('draft-review').hidden = workflow.phase === 'empty';
  $('validate').disabled = workflow.phase !== 'draft';
  $('approve').disabled = workflow.phase !== 'validated';
  $('run-draft').disabled = workflow.phase !== 'approved';
}

function clearDraft(message) {
  workflow.reject();
  $('draft-error').hidden = true;
  $('draft-results').hidden = true;
  $('draft-results').replaceChildren();
  $('parameter-preview').replaceChildren();
  $('draft-status').textContent = message;
  stateButtons();
}

function action(operation) {
  $('draft-error').hidden = true;
  try { operation(); }
  catch (error) {
    $('draft-error').textContent = error.message;
    $('draft-error').hidden = false;
    $('draft-status').textContent = '';
  }
  stateButtons();
}

function showDraft(candidate) {
  const changed = new Map(candidate.changes.map(edit => [edit.key, edit.from]));
  const name = candidate.engine === 'm4-exposure' ? 'M4 controlled Eq. 10 comparison' : 'M3 independent three-population model';
  const source = node('p');
  source.append(cite(candidate.source, candidate.sourceRole + ' · PDF p. ' + candidate.source.page));
  $('parameter-preview').replaceChildren(node('p', candidate.classification, 'tag synthetic'),
    node('p', candidate.prompt, 'prompt-text'),
    definitionList([['Engine', name], ['Mode', candidate.mode], ['Runnable equation', candidate.equation]]), source,
    node('p', 'Values without a change note use the default.', 'caveat'),
    table('Proposed controls · review before approval', ['Parameter', 'Value', 'Unit'],
      Object.entries(candidate.parameters).map(([key, value]) => [
        candidate.labels[key], changed.has(key) && changed.get(key) !== value ? value + ' (was ' + changed.get(key) + ')' : value, candidate.units[key]
      ])));
}

function showRun(run) {
  const result = run.result;
  const output = $('draft-results');
  const heading = node('h3', 'Approved experiment results');
  const summary = node('p', run.classification + '. Solver version ' + run.solverVersion + '. ' +
    (run.seed === null ? 'Deterministic comparison. No seed.' : 'Seed ' + run.seed + '.'));
  const details = run.engine === 'm4-exposure' ? comparisonTable(result)
    : table('Final synthetic population indices', ['Population', 'Value'], result.metadata.species.map((name, i) => [
      name, format(result.samples.at(-1).state[i])
    ]));
  output.replaceChildren(heading, summary, details,
    node('p', 'The download includes the original command, approval parameters, source context and simulated states.', 'caveat'),
    downloadButton('approved-scenario', run));
  output.hidden = false;
}

function showChallenge(container, result) {
  let tables;
  if (result.id === 'exposure') tables = [comparisonTable(result.comparison)];
  else if (result.id === 'noise') tables = [
    table('Final population indices by noise amplitude', ['Noise', 'Producers', 'Pests', 'Beneficial'],
      result.cases.map(run => [run.parameters.noise, ...run.samples.at(-1).state.map(format)])),
    table('One-at-a-time noise sweep · seed 2025', ['Noise', 'Producers', 'Pests', 'Beneficial'],
      result.sensitivity.runs.map(run => [format(run.value), ...run.final.map(format)]))
  ];
  else tables = [table('Preference comparison · TOPSIS', ['Duration weight multiplier', 'First-ranked options', 'Closeness by ranked option'],
    result.alternatives.map(row => [row.multiplier,
      row.ranked.filter(r => r.rank === 1).map(r => result.options[r.index].name).join(' / '),
      row.ranked.map(r => result.options[r.index].name + ' ' + format(r.closeness)).join(' · ')
    ]))];
  container.replaceChildren(node('h4', 'Computed results'), ...tables, downloadButton('challenge-' + result.id, result));
}

for (const plan of challenges) {
  const article = node('article', undefined, 'panel');
  article.id = 'challenge-' + plan.id;
  const button = node('button', 'Run ' + plan.title.toLowerCase() + ' challenge');
  button.type = 'button';
  const status = node('p');
  status.setAttribute('role', 'status');
  const output = node('div');
  article.append(node('span', plan.classification, 'tag synthetic'), node('h3', plan.title),
    definitionList([['Research question', plan.question], ['Experimental change', plan.change], ['Fixed settings', plan.fixed],
      ['Limitations', plan.limits]]),
    cite(plan.source, plan.sourceLabel), node('p'), button, status, output);
  button.addEventListener('click', () => {
    try {
      showChallenge(output, runChallenge(plan.id));
      status.textContent = 'Challenge complete. Results computed by the portfolio engines.';
    } catch (error) {
      output.replaceChildren();
      status.textContent = error.message;
    }
  });
  $('challenge-list').append(article);
}

exampleButtons('question-examples', $('question'), ['How did native species return?', 'What does the paper say about bats and bees?',
  'What does Eq. 17 get wrong?', 'Where are the raw data?']);
exampleButtons('command-examples', $('command'), examples);
$('ask-form').addEventListener('submit', event => { event.preventDefault(); ask(); });
$('command').addEventListener('input', () => {
  if (workflow.phase !== 'empty') clearDraft('Command changed. Draft and review it again.');
});
$('draft-form').addEventListener('submit', event => {
  event.preventDefault();
  clearDraft('');
  action(() => {
    showDraft(workflow.draft($('command').value));
    $('draft-status').textContent = 'Draft ready for validation. No simulation has run.';
  });
});
$('validate').addEventListener('click', () => action(() => {
  workflow.validate();
  $('draft-status').textContent = 'Valid parameters. Approve this reviewed draft to enable Run.';
}));
$('approve').addEventListener('click', () => action(() => {
  workflow.approve();
  $('draft-status').textContent = 'Approved. Run will use this exact parameter snapshot.';
}));
$('run-draft').addEventListener('click', () => action(() => {
  showRun(workflow.run());
  $('draft-status').textContent = 'Run complete. The approved settings are in the experiment record.';
}));
$('reject').addEventListener('click', () => {
  clearDraft('Draft rejected. No approval remains.');
  $('command').focus();
});
stateButtons();
$('ask-form').hidden = false;
$('draft-ui').hidden = false;
