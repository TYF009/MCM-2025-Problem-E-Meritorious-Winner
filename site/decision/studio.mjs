import { compareScenarios, scenarioCSV, defaults, criteria, provenance, decisionProvenance } from './scenarios.mjs';
import { decide } from './methods.mjs';

const $ = id => document.getElementById(id);
const scenarioForm = $('scenario-form');
const judgmentForm = $('judgment-form');
const pairs = [];
const palette = [
  { color: '#233b70', dash: '', mark: 'B' },
  { color: '#946009', dash: '10 5', mark: 'E' },
  { color: '#1b6747', dash: '3 5', mark: 'L' }
];
const metrics = [
  ['finalProducer', 'Final producer index'], ['finalConsumer', 'Final consumer index'],
  ...criteria.map(({ id, label }) => [id, label])
];
const format = value => Number(value.toPrecision(4)).toString();
const weight = value => (value * 100).toFixed(1) + '%';
let comparison;
let decision;
let pendingScenario = false;
let pendingJudgments = false;

function table(id, caption, headings, rows) {
  const element = document.createElement('table');
  element.createCaption().textContent = caption;
  const top = element.createTHead().insertRow();
  for (const heading of headings) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = heading;
    top.append(th);
  }
  const body = element.createTBody();
  for (const [label, ...values] of rows) {
    const row = body.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    row.append(th);
    for (const value of values) row.insertCell().append(value);
  }
  $(id).replaceChildren(element);
}

function withDelta(value, delta) {
  const node = document.createElement('span');
  const detail = document.createElement('span');
  detail.className = 'delta';
  detail.textContent = 'Δ ' + (delta > 0 ? '+' : '') + format(delta);
  node.append(format(value), detail);
  return node;
}

function axes(xMax, yMax, xLabel, yLabel) {
  const left = 56, top = 18, right = 390, bottom = 203;
  const x = value => left + (right - left) * value / xMax;
  const y = value => bottom - (bottom - top) * value / yMax;
  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    const xValue = i*xMax/4, yValue = i*yMax/4;
    ticks.push(`<line x1="${left}" x2="${right}" y1="${y(yValue)}" y2="${y(yValue)}" stroke="#d6e0d8"/>
      <text x="${left-7}" y="${y(yValue)+4}" text-anchor="end">${format(yValue)}</text>
      <text x="${x(xValue)}" y="${bottom+18}" text-anchor="middle">${format(xValue)}</text>`);
  }
  const markup = `<g font-size="12" fill="#243e32">${ticks.join('')}
    <path d="M${left},${top} V${bottom} H${right}" stroke="#577264" fill="none"/>
    <text x="${(left+right)/2}" y="247" text-anchor="middle">${xLabel}</text>
    <text transform="translate(14,${(top+bottom)/2}) rotate(-90)" text-anchor="middle">${yLabel}</text></g>`;
  return { x, y, markup };
}

function draw(id, title, description, graph, marks) {
  $(id).innerHTML = `<title id="${id}-title">${title}</title><desc id="${id}-desc">${description}</desc>
    ${graph.markup}${marks}`;
}

function plotPopulation(index, id, name) {
  const limit = Math.ceil(Math.max(1, ...comparison.scenarios.flatMap(run => run.samples.map(r => r.state[index]))) / 4) * 4;
  const graph = axes(comparison.controls.horizon, limit, 'Synthetic simulation time', name + ' population index');
  const marks = comparison.scenarios.map((arm, i) => {
    const points = arm.samples.map(({ time, state }) => graph.x(time).toFixed(2) + ',' + graph.y(state[index]).toFixed(2));
    return `<polyline points="${points.join(' ')}" fill="none" stroke="${palette[i].color}" stroke-width="2.5" stroke-dasharray="${palette[i].dash}"/>`;
  });
  draw(id, name + ' population trajectories', provenance + '. Three aligned arms. See the paired metrics for numerical endpoints and integrals.', graph, marks.join(''));
}

function renderComparison() {
  const { scenarios, shared, controls, units } = comparison;
  $('scenario-cards').replaceChildren(...scenarios.map((arm, i) => {
    const article = document.createElement('article');
    article.className = 'panel';
    article.style.setProperty('--accent', palette[i].color);
    const title = document.createElement('h3');
    title.textContent = arm.name;
    const schedule = document.createElement('p');
    schedule.textContent = arm.withdrawalTime === null
      ? `C(t) = ${arm.intensity} throughout · no withdrawal.`
      : `C(t) = ${arm.intensity} before t = ${arm.withdrawalTime}, then 0.`;
    const extra = document.createElement('p');
    extra.className = 'hint';
    extra.textContent = arm.withdrawalTime === controls.horizon
      ? 'Switch at horizon. No post-withdrawal update.'
      : i === 2 && arm.intensity !== controls.exposure ? 'Timing and intensity vary.' : i === 1 || i === 2 ? 'Timing varies.' : 'Reference arm for all differences.';
    article.append(title, schedule, extra);
    return article;
  }));
  $('legend').replaceChildren(...scenarios.map((arm, i) => {
    const li = document.createElement('li'), line = document.createElement('span');
    line.className = arm.id;
    line.style.setProperty('--accent', palette[i].color);
    line.setAttribute('aria-hidden', 'true');
    li.append(line, arm.name);
    return li;
  }));
  plotPopulation(0, 'producer-plot', 'Producer');
  plotPopulation(1, 'consumer-plot', 'Consumer');
  table('pairwise', 'Paired metrics · Δ from continuous baseline', ['Metric', ...scenarios.map(a => a.name)],
    metrics.map(([key, name]) => [
      `${name} (${units.metrics[key]})`, ...scenarios.map(arm => withDelta(arm.metrics[key], arm.delta[key]))
    ]));
  $('fixed-equation').textContent = comparison.equation;
  $('fixed-settings').textContent =
    `${comparison.solver} v${comparison.engineVersion}, deterministic. Step ${controls.dt}, horizon ${controls.horizon}, samples every ${shared.sampleInterval} synthetic time units. Initial indices [${shared.initial}]. Rates [${shared.rates}], competition matrix [${shared.matrix.map(row=> '['+row+']').join(', ')}], capacities [${shared.capacity}], relaxation [${shared.relaxation}], reference indices [${shared.reference}], exposure-loss coefficients [${shared.loss}].`;
}

function drawPareto() {
  const selected = comparison.scenarios;
  const xMax = Math.max(1, ...selected.map(a => a.metrics.cumulativeExposure)) * 1.16;
  const yMax = Math.max(1, ...selected.map(a => a.metrics.changedDuration)) * 1.16;
  const graph = axes(xMax, yMax, 'Cumulative exposure (index × time)', 'Changed-policy duration (time)');
  const groups = new Map();
  decision.pareto.forEach(({ index, dominatedBy }) => {
    const arm = selected[index], { cumulativeExposure, changedDuration } = arm.metrics;
    const key = cumulativeExposure + ',' + changedDuration;
    const cluster = groups.get(key) ?? { x: graph.x(cumulativeExposure), y: graph.y(changedDuration), labels: [], frontier: false };
    cluster.labels.push(palette[index].mark);
    cluster.frontier ||= !dominatedBy.length;
    groups.set(key, cluster);
  });
  const marks = [...groups.values()].map(({ x, y, labels, frontier }) =>
    `<circle cx="${x}" cy="${y}" r="6" stroke="#223d31" stroke-width="2" fill="${frontier ? '#223d31' : 'white'}"/>
    <text x="${x+9}" y="${y-7}" font-weight="700" font-size="13">${labels.join('/')}</text>`);
  draw('pareto-plot', 'Pareto Explorer, projected onto two criteria',
    decisionProvenance + '. Both axes are synthetic costs. Filled points contain at least one non-dominated arm across all four criteria. The table identifies each arm.', graph, marks.join(''));
  table('pareto-table', 'Four-criterion status · B baseline, E early, L late', ['Arm', 'Status'],
    decision.pareto.map(({ index, dominatedBy }) => [
      palette[index].mark + ' · ' + selected[index].name,
      dominatedBy.length ? 'Dominated by ' + dominatedBy.map(i => selected[i].name).join(', ') : 'Non-dominated'
    ]));
}

function leaders(ranking) {
  return ranking.ranked.filter(entry => entry.rank === 1).map(({ index }) => decision.options[index].name).join(' / ');
}

function renderDecision() {
  const { options, values, oriented, ahp, ewm, critic, ranking, preference } = decision;
  table('matrix', 'Computed decision matrix · synthetic units', ['Criterion', 'Direction', ...options.map(x => x.name)],
    criteria.map(({ label, unit, direction }, j) => [`${label} (${unit})`, direction, ...values.map(row => format(row[j]))]));
  table('normalized', 'Oriented matrix · higher is preferred', ['Criterion', ...options.map(x => x.name)],
    criteria.map(({ label }, j) => [label, ...oriented.map(row => format(row[j]))]));
  table('weights', 'Criterion weights', ['Criterion', 'AHP', 'EWM', 'CRITIC', 'Hybrid', 'Exposure emphasis'],
    criteria.map(({ label }, j) => [label, ...[ahp, ewm, critic, ranking, preference].map(method => weight(method.weights[j]))]));
  table('ratios', 'AHP reciprocal judgment matrix', ['Row / column', ...criteria.map(x => x.label)],
    ahp.matrix.map((row, i) => [criteria[i].label, ...row.map(format)]));
  $('consistency').textContent = `AHP consistency ratio ${format(ahp.cr)} (λmax ${format(ahp.lambda)}). ` +
    (ahp.cr >= .1 ? 'Review inconsistent pairwise priorities.' : 'Below the 0.10 review threshold.');
  $('fallbacks').textContent = [ewm.fallback, critic.fallback].filter(Boolean).join(' ');
  const summary = `Hybrid first place: ${leaders(ranking)}. With greater weight on exposure: ${leaders(preference)}.`;
  $('rank-summary').textContent = summary;
  table('rankings', 'TOPSIS closeness and rank', ['Option', 'Hybrid closeness', 'Hybrid rank', 'Exposure emphasis closeness', 'Exposure emphasis rank'],
    options.map(({ name }, i) => {
      const a = ranking.ranked.find(entry => entry.index === i);
      const b = preference.ranked.find(entry => entry.index === i);
      return [name, format(a.closeness), String(a.rank), format(b.closeness), String(b.rank)];
    }));
  drawPareto();
  $('brief-summary').textContent = summary + ' Results refer to the displayed exposure policies, synthetic metrics and scenarios.';
}

function showError(prefix, error) {
  const panel = $(prefix + '-error');
  panel.hidden = false;
  panel.textContent = error.message;
  $(prefix + '-status').textContent = '';
}

function updateButtons() {
  for (const id of ['brief-print', 'brief-json', 'scenario-csv']) $(id).disabled = pendingScenario || pendingJudgments || !comparison || !decision;
  $('export-status').textContent = pendingScenario || pendingJudgments ? 'Apply pending inputs before exporting.' : '';
}

function runScenario() {
  pendingScenario = true;
  $('scenario-error').hidden = true;
  try {
    const values = Object.fromEntries([...new FormData(scenarioForm)].map(([key, value]) => [key, value === '' ? NaN : Number(value)]));
    comparison = compareScenarios(values);
    renderComparison();
    pendingScenario = false;
    $('scenario-results').hidden = false;
    $('scenario-status').textContent = 'Three aligned simulations complete. Rankings use their computed metrics.';
    runDecision();
  } catch (error) {
    comparison = undefined;
    decision = undefined;
    $('scenario-results').hidden = true;
    $('decision-results').hidden = true;
    $('brief-summary').textContent = '';
    showError('scenario', error);
  }
  updateButtons();
}

function runDecision() {
  pendingJudgments = true;
  $('judgment-error').hidden = true;
  try {
    if (pendingScenario || !comparison) throw new Error('Run the controlled comparison first.');
    const ratios = pairs.map(input => input.valueAsNumber);
    decision = decide(comparison.scenarios, ratios);
    renderDecision();
    $('decision-results').hidden = false;
    pendingJudgments = false;
    $('judgment-status').textContent = 'Weights, rankings and Pareto status updated.';
  } catch (error) {
    decision = undefined;
    $('decision-results').hidden = true;
    $('brief-summary').textContent = '';
    showError('judgment', error);
  }
  updateButtons();
}

function resetScenarios() {
  for (const [key, value] of Object.entries(defaults)) scenarioForm.elements.namedItem(key).value = value;
  runScenario();
}

function decisionBrief() {
  return {
    title: 'Scenario Decision Brief',
    provenance: decisionProvenance,
    comparison,
    decision,
    figures: {
      populationTrajectories: { x: 'synthetic time', y: ['producerIndex', 'consumerIndex'], dataPath: 'comparison.scenarios[].samples' },
      paretoProjection: { x: 'cumulativeExposure', y: 'changedDuration', statusDimensions: criteria.map(c => c.id) }
    },
    reportedRecommendations: {
      classification: 'Reported 2025 recommendations',
      source: { file: 'paper/2521959.pdf', page: 25 },
      summary: ['Restoration areas and nitrogen-fixing plants', 'Protective nets and habitat for natural pest enemies',
        'Tourism and education as prospective revenue sources']
    }
  };
}

function download(extension) {
  const isJSON = extension === 'json';
  const data = isJSON ? JSON.stringify(decisionBrief(), null, 2) : scenarioCSV(comparison);
  const url = URL.createObjectURL(new Blob([data], { type: isJSON ? 'application/json' : 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = (isJSON ? 'scenario-decision-brief' : 'controlled-scenarios') + '.' + extension;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('export-status').textContent = isJSON ? 'Decision brief downloaded.' : 'Scenario CSV downloaded.';
}

for (let i = 0; i < criteria.length; i++) {
  for (let j = i + 1; j < criteria.length; j++) {
    const label = document.createElement('label'), input = document.createElement('input');
    label.textContent = criteria[i].label + ' / ' + criteria[j].label;
    input.type = 'number';
    input.step = 'any';
    input.required = true;
    input.value = 1;
    label.append(input);
    $('judgment-fields').append(label);
    pairs.push(input);
  }
}
scenarioForm.addEventListener('submit', event => { event.preventDefault(); runScenario(); });
judgmentForm.addEventListener('submit', event => { event.preventDefault(); runDecision(); });
scenarioForm.addEventListener('input', () => {
  pendingScenario = true;
  $('scenario-status').textContent = 'Settings changed. Run the comparison to refresh scenarios and rankings.';
  updateButtons();
});
judgmentForm.addEventListener('input', () => {
  pendingJudgments = true;
  $('judgment-status').textContent = 'Priorities changed. Update preferences to refresh rankings.';
  updateButtons();
});
$('scenario-reset').addEventListener('click', resetScenarios);
$('judgment-reset').addEventListener('click', () => {
  for (const input of pairs) input.value = 1;
  runDecision();
});
$('brief-print').addEventListener('click', () => window.print());
$('brief-json').addEventListener('click', () => download('json'));
$('scenario-csv').addEventListener('click', () => download('csv'));
for (const id of ['studio', 'methods-ui', 'brief-actions']) $(id).hidden = false;
resetScenarios();
