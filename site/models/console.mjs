import { manifest, experiment, experimentCSV } from './engine.mjs';

const byId = id => document.getElementById(id);
const form = byId('lab-form');
const scenarioSelect = byId('lab-scenario');
const sensitivitySelect = byId('lab-sweep');
const fields = byId('lab-fields');
const results = byId('lab-results');
const status = byId('lab-status');
const error = byId('lab-error');
const jsonButton = byId('lab-json');
const csvButton = byId('lab-csv');
const colors = ['#1d7451', '#9b4218', '#3b57a4'];
const dashes = ['', '9 5', '2 5'];
const names = {
  'not-applicable': 'Set noise to zero in the three-population model to inspect its deterministic equilibrium.',
  'no-interior-equilibrium': 'No feasible interior equilibrium was found for these coefficients.',
  'unverified-equilibrium': 'The candidate failed the drift residual check.',
  'locally-asymptotically-stable': 'Locally asymptotically stable by the continuous-time Routh–Hurwitz test.',
  unstable: 'Unstable in continuous time. The characteristic polynomial has a positive real root.',
  inconclusive: 'Local classification is inconclusive at the numerical tolerance.'
};
let latest;

function option(value, label) {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}

function configure() {
  const scenario = manifest.scenarios[scenarioSelect.value];
  fields.replaceChildren();
  sensitivitySelect.replaceChildren();
  for (const key of scenario.controlOrder) {
    const rule = manifest.controls[key];
    const id = 'lab-param-' + key;
    const field = document.createElement('div');
    const label = document.createElement('label');
    const input = document.createElement(rule.choices ? 'select' : 'input');
    const hint = document.createElement('small');
    input.name = key;
    input.id = id;
    hint.id = id + '-hint';
    label.htmlFor = id;
    label.textContent = rule.label;
    input.required = true;
    input.setAttribute('aria-describedby', hint.id);
    if (rule.choices) {
      input.replaceChildren(...rule.choices.map(value => option(value, value)));
    } else {
      input.type = 'number';
      input.min = rule.minimum;
      input.max = rule.maximum;
      input.step = rule.step;
    }
    input.value = scenario.defaults[key];
    const bounds = rule.choices ? rule.choices.join(', ') : rule.minimum + ' to ' + rule.maximum;
    hint.textContent = `${rule.unit}. Default ${scenario.defaults[key]}. Allowed ${bounds}. ${rule.effect}`;
    field.append(label, input, hint);
    fields.append(field);
    if (['growth', 'interaction', 'noise', 'initial', 'exposure'].includes(key)) {
      sensitivitySelect.append(option(key, rule.label));
    }
  }
  run();
}

function markPending() {
  latest = undefined;
  jsonButton.disabled = true;
  csvButton.disabled = true;
  status.textContent = 'Parameters changed. Run the experiment to update the results and downloads.';
  error.hidden = true;
}

function format(value) {
  return (value < 0 ? '−' : '') + Number(Math.abs(value).toPrecision(4));
}

function numberWithSign(value) {
  return (value > 0 ? '+' : '') + format(value);
}

function table(container, caption, columns, records, rowCell) {
  const element = document.createElement('table');
  element.className = 'lab-table';
  element.createCaption().textContent = caption;
  const head = element.createTHead().insertRow();
  for (const name of columns) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = name;
    head.append(cell);
  }
  const body = element.createTBody();
  for (const record of records) rowCell(body.insertRow(), record);
  container.replaceChildren(element);
}

function rowLabel(row, name) {
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = name;
  row.append(th);
}

function matrixTable(id, matrix, labels, caption) {
  table(byId(id), caption, ['Row / column', ...labels], matrix, (row, values) => {
    rowLabel(row, labels[row.sectionRowIndex]);
    for (const value of values) {
      const cell = row.insertCell();
      cell.textContent = numberWithSign(value);
      if (value !== 0) cell.className = value < 0 ? 'lab-negative' : 'lab-positive';
    }
  });
}

function chartAxes(xMax, yMax, xLabel, yLabel) {
  const left = 64, right = 492, top = 18, bottom = 258;
  const x = value => left + (right - left) * value / xMax;
  const y = value => bottom - (bottom - top) * value / yMax;
  const marks = [];
  for (let tick = 0; tick <= 4; tick++) {
    const xv = xMax * tick / 4, yv = yMax * tick / 4;
    marks.push(`<line x1="${left}" y1="${y(yv)}" x2="${right}" y2="${y(yv)}" stroke="#d7e1d9"/>
      <text x="${left - 9}" y="${y(yv) + 5}" text-anchor="end">${format(yv)}</text>
      <text x="${x(xv)}" y="${bottom + 22}" text-anchor="middle">${format(xv)}</text>`);
  }
  return { x, y, markup: `<g font-size="15" fill="#314d41">${marks.join('')}
    <path d="M${left},${top} V${bottom} H${right}" fill="none" stroke="#587367"/>
    <text x="${(left + right) / 2}" y="312" text-anchor="middle">${xLabel}</text>
    <text transform="translate(18,${(top + bottom) / 2}) rotate(-90)" text-anchor="middle">${yLabel}</text></g>` };
}

function polyline(pairs, axes, color, dash = '') {
  const points = pairs.map(([x, y]) => axes.x(x).toFixed(2) + ',' + axes.y(y).toFixed(2)).join(' ');
  return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${dash}"/>`;
}

function scaledMax(values) {
  const max = Math.max(1, ...values) * 1.05;
  const step = 10 ** Math.floor(Math.log10(max / 4));
  return Math.ceil(max / (4 * step)) * 4 * step;
}

function renderCharts(result) {
  const { metadata, samples } = result;
  const initial = samples[0].state, final = samples.at(-1).state;
  const summary = metadata.species.map((name, i) => `${name} ${format(initial[i])} → ${format(final[i])}`).join(' · ');
  const classification = metadata.classification;
  const time = chartAxes(metadata.parameters.horizon, scaledMax(samples.flatMap(sample => sample.state)),
    'Synthetic simulation time', 'Synthetic population index');
  const switchTime = metadata.exposureSchedule?.from;
  const switchMark = switchTime > 0 && switchTime < metadata.parameters.horizon
    ? `<line x1="${time.x(switchTime)}" x2="${time.x(switchTime)}" y1="18" y2="258" stroke="#63746e" stroke-dasharray="4 5"/>`
    : '';
  const lines = metadata.species.map((name, i) =>
    polyline(samples.map(sample => [sample.time, sample.state[i]]), time, colors[i], dashes[i]));
  const timeNote = switchMark ? ` Dashed vertical marker at synthetic time ${switchTime}: exposure withdrawal.` : '';
  byId('lab-time').innerHTML = `<title id="lab-time-title">Synthetic populations over time</title>
    <desc id="lab-time-desc">${classification}. Initial and final states: ${summary}.${timeNote}</desc>
    ${time.markup}${switchMark}${lines.join('')}`;
  byId('lab-time-summary').textContent = `Start → end (population index): ${summary}.${timeNote}`;
  const legend = byId('lab-legend');
  legend.replaceChildren(...metadata.species.map((name, i) => {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = `lab-swatch lab-swatch--${i}`;
    swatch.style.setProperty('--series-color', colors[i]);
    swatch.setAttribute('aria-hidden', 'true');
    item.append(swatch, name);
    return item;
  }));

  const [first, second] = metadata.species;
  const phase = chartAxes(scaledMax(samples.map(sample => sample.state[0])),
    scaledMax(samples.map(sample => sample.state[1])), first + ' index', second + ' index');
  const start = `<circle cx="${phase.x(initial[0])}" cy="${phase.y(initial[1])}" r="7" fill="white" stroke="#172f24" stroke-width="3"/>`;
  const end = `<rect x="${phase.x(final[0]) - 6}" y="${phase.y(final[1]) - 6}" width="12" height="12" fill="#172f24"/>`;
  const phaseNote = `Synthetic state projection. Open circle: start (${format(initial[0])}, ${format(initial[1])}). Filled square: end (${format(final[0])}, ${format(final[1])}).`;
  byId('lab-phase').innerHTML = `<title id="lab-phase-title">${first} versus ${second}</title>
    <desc id="lab-phase-desc">${classification}. ${phaseNote}</desc>${phase.markup}
    ${polyline(samples.map(sample => sample.state.slice(0, 2)), phase, colors[0])}${end}${start}`;
  byId('lab-phase-summary').textContent = phaseNote;
}

function render(result) {
  const { metadata: m, sensitivity, equilibrium, safeguards } = result;
  byId('lab-classification').textContent = m.classification;
  byId('lab-equation').textContent = m.equation;
  const source = byId('lab-citation');
  source.textContent = manifest.scenarios[m.model].citationRole;
  source.href = new URL(manifest.scenarios[m.model].citation, import.meta.url).href;
  const method = `${m.solver}. Intrinsic rates r = [${m.rates.join(', ')}] per synthetic time unit; initial state = [${m.initial.join(', ')}] in synthetic population indices.`;
  byId('lab-method').textContent = m.exposureSchedule
    ? `${method} Capacity K = [${m.constants.capacity}], relaxation m = [${m.constants.relaxation}], reference Sᵉᵠ = [${m.constants.reference}], exposure loss ε = [${m.constants.loss}]. K and Sᵉᵠ use population indices. Relaxation is per synthetic time; ε is per exposure index per synthetic time. Exposure C(t) = ${m.exposureSchedule.before} before time ${m.exposureSchedule.from}, then 0.`
    : `${method} Projection to [0, 80]: ${safeguards.lower} lower and ${safeguards.upper} upper corrections in this run. Projection can change the path.`;
  byId('lab-limit').textContent = m.limits;
  for (const label of document.querySelectorAll('.lab-chart-provenance')) label.textContent = m.classification;
  renderCharts(result);
  byId('lab-matrix-text').textContent = m.model === 'independent'
    ? 'Aᵢⱼ changes the per-population growth of row i as column j increases. Negative entries suppress growth; positive entries increase it. Units: per population index per synthetic time unit.'
    : 'aᵢⱼ is a dimensionless competition coefficient. Positive entries increase the weighted load in the growth-limiting term for row i.';
  matrixTable('lab-matrix', m.matrix, m.species, 'Illustrative interaction coefficients');
  byId('lab-jacobian').replaceChildren();
  byId('lab-equilibrium-summary').textContent = m.model === 'withdrawal'
    ? 'Local analysis is scoped to the autonomous three-population drift. This exposure schedule switches over time.'
    : names[equilibrium.status] + (equilibrium.state
      ? ` State [${equilibrium.state.map(format).join(', ')}]; maximum drift residual ${equilibrium.residual.toExponential(2)}.`
      : '');
  if (equilibrium.jacobian) matrixTable('lab-jacobian', equilibrium.jacobian, m.species, 'Jacobian at the equilibrium (per synthetic time unit)');

  const key = sensitivity.parameter;
  const seedNote = m.seed === null ? 'This scenario is deterministic.' : `Common seed ${m.seed} aligns random draws for noisy runs.`;
  byId('lab-sensitivity-summary').textContent =
    `Vary ${manifest.controls[key].label.toLowerCase()} around its baseline and keep other settings fixed. ${seedNote} The table shows final synthetic states, with no field uncertainty interval.`;
  table(byId('lab-sensitivity'), 'Final synthetic population indices', [
    manifest.controls[key].label, ...m.species, 'Projections'
  ], sensitivity.runs, (row, item) => {
    const isBase = item.value === m.parameters[key];
    rowLabel(row, format(item.value) + (isBase ? ' (baseline)' : ''));
    for (const value of [...item.final, item.safeguards.lower + item.safeguards.upper]) {
      row.insertCell().textContent = format(value);
    }
  });

  byId('lab-record').textContent = `Solver v${m.version}. ${result.steps} steps of ${m.parameters.dt} to synthetic time ${m.parameters.horizon}; samples every ${m.sampleInterval}. ${m.seed === null ? 'Seed not used.' : 'Seed ' + m.seed + (m.parameters.noise ? '.' : ' (unused by the zero-noise baseline).')} Exports include the effective parameters, time series and sweep.`;
}

function run() {
  markPending();
  const scenario = manifest.scenarios[scenarioSelect.value];
  const entries = scenario.controlOrder.map(key => {
    const value = form.elements.namedItem(key).value;
    return [key, value === '' ? NaN : Number(value)];
  });
  try {
    const completed = experiment(scenarioSelect.value, Object.fromEntries(entries), sensitivitySelect.value);
    render(completed);
    latest = completed;
    results.hidden = false;
    status.textContent = `Experiment complete. ${completed.samples.length} recorded time points.`;
    jsonButton.disabled = false;
    csvButton.disabled = false;
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
    results.hidden = true;
    status.textContent = 'Experiment stopped.';
  }
}

function download(type) {
  if (!latest) return;
  const data = type === 'json' ? JSON.stringify(latest, null, 2) : experimentCSV(latest);
  const blob = new Blob([data], { type: type === 'json' ? 'application/json' : 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ecology-${latest.metadata.model}-v${latest.metadata.version}.${type}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

for (const [id, scenario] of Object.entries(manifest.scenarios)) scenarioSelect.append(option(id, scenario.name));
scenarioSelect.addEventListener('change', configure);
byId('lab-reset').addEventListener('click', configure);
fields.addEventListener('input', markPending);
sensitivitySelect.addEventListener('change', markPending);
form.addEventListener('submit', event => { event.preventDefault(); run(); });
jsonButton.addEventListener('click', () => download('json'));
csvButton.addEventListener('click', () => download('csv'));
configure();
byId('lab-console').hidden = false;
