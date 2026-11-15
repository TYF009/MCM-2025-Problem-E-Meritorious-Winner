import evidence from './evidence-index.json' with { type: 'json' };
export { evidence };
export const sourceFiles = Object.freeze({ paper: '../../paper/2521959.pdf', prompt: '../../problem/2025_ICM_Problem_E.pdf' });
const pageCounts = { paper: 25, prompt: 4 };

export function citationHref({ source, page }) {
  if (!Object.hasOwn(sourceFiles, source) || !Number.isInteger(page) || page < 1 || page > pageCounts[source]) {
    throw new RangeError('Citation outside the source allowlist.');
  }
  return sourceFiles[source] + '#page=' + page;
}

const normalize = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const contains = (text, term) => (' ' + text + ' ').includes(' ' + term + ' ');
const blocked = [
  /\b(?:ignore|bypass|override|drop|omit)\b.*\b(?:citation|citations|rules|instructions|sources)\b/,
  /\b(?:invent|fabricate|make up)\b/,
  /\b(?:system prompt|developer message|api key|private credentials)\b/
];
const gaps = [
  [/\b(?:initial conditions|initial values|initial densities|initial state)\b/, 'return'],
  [/\b(?:raw data|training data|calibration data|fitted parameters|historical code|source code|field validation|field measurements|field validated|independently reproduced|reproduce)\b/, 'archive'],
  [/\b(?:aud|revenue|profit|yield|certification|actual earnings)\b/, 'forecast'],
  [/\b(?:ai use|ai used|ai tools|chatgpt|language model)\b/, null]
];

export function retrieve(input) {
  if (typeof input !== 'string' || input.length > 320 || !input.trim()) {
    return { status: 'invalid', message: 'Enter a question from 1 to 320 characters.', entries: [] };
  }
  const text = normalize(input);
  if (/[<>]/.test(input) || blocked.some(rule => rule.test(text))) {
    return { status: 'restricted', message: 'Ask a question about the paper. The explorer uses fixed evidence notes and citations.', entries: [] };
  }
  const figure = text.match(/\b(?:figure|fig) (\d+)\b/);
  const figureNote = figure && evidence.entries.find(entry => entry.figures.includes(Number(figure[1])));
  const gap = gaps.find(([rule, id]) => rule.test(text) &&
    !(id === 'return' && /\b(?:eq|equation) 9\b/.test(text)) &&
    !(id === 'forecast' && /\b(?:letter|recommendations|recommendation)\b/.test(text)));
  if (gap) {
    const entry = figureNote || evidence.entries.find(entry => entry.id === gap[1]);
    const replication = /\b(?:reproduce|independently reproduced|field validated)\b/.test(text);
    return { status: replication ? 'unreproduced' : 'gap', message: replication
      ? 'The reported result was not independently reproduced or field validated in this portfolio.'
      : 'The requested value or evidence is not established in the available paper and audit.', entries: entry ? [entry] : [] };
  }
  if (figure) {
    const entry = figureNote;
    if (entry) return { status: 'evidence', message: 'Matching evidence notes from the source library.', entries: [entry] };
    return { status: 'unknown', message: 'That figure is outside the companion’s indexed entries. See the full Figure Atlas.', entries: [] };
  }
  const matches = evidence.entries.map(entry => ({
    entry, score: entry.terms.reduce((score, term) => contains(text, term) ? score + term.split(' ').length ** 2 : score, 0)
  })).filter(match => match.score > 0).sort((a, b) => b.score - a.score);
  if (!matches.length) {
    return { status: 'unknown', message: 'Not established in the available paper index. Try a figure, equation or topic from the source library.', entries: [] };
  }
  return { status: 'evidence', message: 'Matching evidence notes from the source library.',
    entries: matches.filter(match => match.score === matches[0].score).slice(0, 2).map(match => match.entry) };
}
