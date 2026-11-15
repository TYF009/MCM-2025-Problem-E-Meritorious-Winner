import { criteria, decisionProvenance } from './scenarios.mjs';

const tolerance = 1e-12;
const sum = values => values.reduce((total, value) => total + value, 0);
const equal = length => Array(length).fill(1 / length);
const columns = matrix => matrix[0].map((_, j) => matrix.map(row => row[j]));

function shape(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2 || !Array.isArray(matrix[0]) || !matrix[0].length ||
      matrix.some(row => !Array.isArray(row) || row.length !== matrix[0].length || !row.every(Number.isFinite))) {
    throw new RangeError('Provide a finite rectangular matrix with at least two alternatives.');
  }
  return matrix[0].length;
}

export function orient(matrix, directions) {
  const width = shape(matrix);
  if (directions.length !== width || directions.some(x => x !== 'cost' && x !== 'benefit')) {
    throw new RangeError('Specify a benefit or cost direction for every criterion.');
  }
  const normalized = columns(matrix).map((column, j) => {
    const low = Math.min(...column), high = Math.max(...column), range = high - low;
    if (!Number.isFinite(range)) throw new RangeError('Criterion range exceeds numeric precision.');
    if (range === 0) return column.map(() => 0);
    return column.map(value => (directions[j] === 'cost' ? high - value : value - low) / range);
  });
  return columns(normalized);
}

export function makeJudgments(size, ratios) {
  if (!Number.isInteger(size) || size < 2 || size > 4 || ratios.length !== size * (size - 1) / 2) {
    throw new RangeError('Provide one ratio for each pair of two to four criteria.');
  }
  const matrix = Array.from({ length: size }, () => Array(size).fill(1));
  let k = 0;
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      const value = ratios[k++];
      if (!Number.isFinite(value) || value < 1/9 || value > 9) {
        throw new RangeError('Every pairwise ratio must be between 1/9 and 9.');
      }
      matrix[i][j] = value;
      matrix[j][i] = 1/value;
    }
  }
  return matrix;
}

export function ahp(ratios, size) {
  const matrix = makeJudgments(size, ratios);
  const means = matrix.map(row => Math.exp(sum(row.map(Math.log)) / size));
  const total = sum(means);
  const weights = means.map(value => value / total);
  const lambda = sum(matrix.map((row, i) => sum(row.map((value, j) => value * weights[j])) / weights[i])) / size;
  const ci = Math.max(0, (lambda - size) / (size - 1));
  const ri = [0, 0, 0, .58, .90][size];
  return { matrix, weights, lambda, ci, ri, cr: ri ? ci / ri : null };
}

function orientedColumns(matrix) {
  shape(matrix);
  if (matrix.some(row => row.some(value => value < 0 || value > 1))) {
    throw new RangeError('Method expects oriented values between 0 and 1.');
  }
  return columns(matrix);
}

export function entropyWeights(matrix) {
  const data = orientedColumns(matrix);
  const rows = matrix.length;
  const information = data.map(column => {
    if (column.every(value => value === column[0])) return 0;
    const total = sum(column);
    const probabilities = column.filter(value => value > 0).map(value => value / total);
    const entropy = -sum(probabilities.map(value => value * Math.log(value))) / Math.log(rows);
    return Math.max(0, 1 - entropy);
  });
  const total = sum(information);
  return { information, weights: total > tolerance ? information.map(x => x / total) : equal(data.length),
    fallback: total <= tolerance ? 'Uniform weights because every criterion has zero information.' : null };
}

export function criticWeights(matrix) {
  const data = orientedColumns(matrix);
  const rows = matrix.length;
  const centered = data.map(column => {
    const mean = sum(column) / rows;
    return column.map(value => value - mean);
  });
  const spread = centered.map(column => Math.hypot(...column) / Math.sqrt(rows));
  const varying = spread.map(sigma => sigma > tolerance);
  const correlation = centered.map((column, i) => centered.map((other, j) => {
    if (!varying[i] || !varying[j]) return null;
    const value = sum(column.map((x, k) => x * other[k])) / (rows * spread[i] * spread[j]);
    return Math.max(-1, Math.min(1, value));
  }));
  const information = correlation.map((row, i) => spread[i] * sum(row.map(r => r === null ? 0 : 1 - r)));
  const total = sum(information);
  if (total > tolerance) return { spread, correlation, information, weights: information.map(x => x / total), fallback: null };
  const spreadTotal = sum(spread);
  return { spread, correlation, information,
    weights: spreadTotal > tolerance ? spread.map(x => x / spreadTotal) : equal(data.length),
    fallback: spreadTotal > tolerance ? 'Variation weights because conflict is zero.' : 'Uniform weights because every criterion is constant.' };
}

export function topsis(matrix, weights) {
  const data = orientedColumns(matrix);
  if (weights.length !== data.length || weights.some(w => !Number.isFinite(w) || w < 0) || sum(weights) <= 0) {
    throw new RangeError('Provide nonnegative weights with positive total.');
  }
  const total = sum(weights);
  const used = weights.map(weight => weight / total);
  const weighted = matrix.map(row => row.map((value, j) => value * used[j]));
  const positiveIdeal = columns(weighted).map(column => Math.max(...column));
  const negativeIdeal = columns(weighted).map(column => Math.min(...column));
  const distance = (a, b) => Math.hypot(...a.map((value, j) => value - b[j]));
  const ranked = weighted.map((row, index) => {
    const dPositive = distance(row, positiveIdeal), dNegative = distance(row, negativeIdeal);
    const closeness = dPositive + dNegative > tolerance ? dNegative / (dPositive + dNegative) : .5;
    return { index, closeness, dPositive, dNegative };
  }).sort((a, b) => b.closeness - a.closeness || a.index - b.index);
  let rank = 1;
  let groupScore = ranked[0].closeness;
  ranked.forEach((entry, i) => {
    if (groupScore - entry.closeness > tolerance) {
      rank = i + 1;
      groupScore = entry.closeness;
    }
    entry.rank = rank;
  });
  return { weights: used, positiveIdeal, negativeIdeal, ranked };
}

export function pareto(matrix) {
  orientedColumns(matrix);
  return matrix.map((row, index) => ({
    index,
    dominatedBy: matrix.flatMap((other, i) => i !== index && other.every((value, j) => value >= row[j]) &&
      other.some((value, j) => value > row[j]) ? [i] : [])
  }));
}

export const historicalWeights = {
  classification: 'Original 2025 mathematical definition · reported historical weights',
  orientation: 'Five entries in printed order. These vectors are separate from the studio criteria.',
  pageAHPEWM: 19, pageCRITIC: 20, file: 'paper/2521959.pdf',
  AHP: [.2401, .1125, .2712, .2297, .1465],
  EWM: [.2109, .1499, .2400, .2798, .1194],
  CRITIC: [.2901, .1403, .2403, .2307, .0996]
};

export function decide(options, ratios) {
  const values = options.map(option => criteria.map(({ id }) => option.metrics[id]));
  const oriented = orient(values, criteria.map(({ direction }) => direction));
  const a = ahp(ratios, criteria.length), e = entropyWeights(oriented), c = criticWeights(oriented);
  const hybrid = a.weights.map((value, j) => (value + e.weights[j] + c.weights[j]) / 3);
  const shifted = hybrid.map((value, j) => criteria[j].id === 'cumulativeExposure' ? value * 2 : value);
  return {
    provenance: decisionProvenance, options: options.map(({ id, name }) => ({ id, name })),
    criteria, values, oriented, judgments: [...ratios], ahp: a, ewm: e, critic: c,
    weightingRule: 'Equal arithmetic mean of AHP, EWM and CRITIC weights.',
    ranking: topsis(oriented, hybrid),
    preference: { rule: 'Double the cumulative exposure weight and renormalize.', ...topsis(oriented, shifted) },
    pareto: pareto(oriented),
    historicalWeights
  };
}
