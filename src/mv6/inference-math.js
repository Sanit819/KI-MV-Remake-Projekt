/** Deterministic numerical demonstrations for the R40 inference overlay.
 * Coordinates are ordinary 2D points; the built-in demonstrations use [0,1].
 * This is a constant-velocity state estimator and genuine global assignment,
 * not an identification of a person's emotions or an independent reply.
 */

const finite = (x, name) => {
  if (!Number.isFinite(x)) throw new TypeError(`${name} must be finite`);
  return x;
};
const zeros = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));
const identity = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
const transpose = a => a[0].map((_, j) => a.map(row => row[j]));
const multiply = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)));
const plus = (a, b) => a.map((row, i) => row.map((x, j) => x + b[i][j]));
const copy = a => a.map(row => row.slice());
const point = (p, label = 'point') => {
  const x = Array.isArray(p) ? p[0] : p?.x;
  const y = Array.isArray(p) ? p[1] : p?.y;
  return [finite(x, `${label}.x`), finite(y, `${label}.y`)];
};

/**
 * State [x,y,vx,vy], H observes x,y. Q is the exact discrete covariance
 * for continuous white acceleration with spectral density processNoise.
 * Joseph-form covariance update retains symmetry and positive semidefiniteness.
 * Observations may be [x,y], {x,y}, or {x,y,time}; null entries are predict-only.
 * Returns one record per observation, including both prior and posterior P.
 */
export function kalmanFilter2D(observations, options = {}) {
  if (!Array.isArray(observations)) throw new TypeError('observations must be an array');
  if (!observations.length) return [];
  const dtDefault = options.dt ?? 1 / 60;
  const q = options.processNoise ?? 0.35;
  const r = options.measurementVariance ?? 0.001225;
  if (!(dtDefault > 0) || !Number.isFinite(dtDefault)) throw new RangeError('dt must be positive');
  if (!(q >= 0) || !Number.isFinite(q)) throw new RangeError('processNoise must be nonnegative');
  if (!(r > 0) || !Number.isFinite(r)) throw new RangeError('measurementVariance must be positive');
  const first = observations[0];
  if (first == null && !options.initialState) throw new RangeError('An initial observation or initialState is required; future observations cannot initialize a prior');
  let state = options.initialState?.slice() ?? [...point(first), 0, 0];
  if (state.length !== 4 || !state.every(Number.isFinite)) throw new TypeError('initialState must contain four finite numbers');
  let covariance = options.initialCovariance ? copy(options.initialCovariance) : [
    [r * 4, 0, 0, 0], [0, r * 4, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]
  ];
  if (covariance.length !== 4 || covariance.some(row => row.length !== 4 || !row.every(Number.isFinite))) throw new TypeError('initialCovariance must be finite 4x4');
  for (let i = 0; i < 4; i++) {
    if (covariance[i][i] < 0) throw new RangeError('Covariance diagonal cannot be negative');
    for (let j = 0; j < 4; j++) if (Math.abs(covariance[i][j] - covariance[j][i]) > 1e-10) throw new RangeError('Initial covariance must be symmetric');
  }
  const H = [[1, 0, 0, 0], [0, 1, 0, 0]], HT = transpose(H), R = [[r, 0], [0, r]];
  const records = [];
  let previousTime = 0;
  for (let index = 0; index < observations.length; index++) {
    const observation = observations[index];
    const time = observation != null && !Array.isArray(observation) && observation.time != null
      ? finite(observation.time, 'observation.time') : index * dtDefault;
    const dt = index ? time - previousTime : 0;
    if (dt < 0 || (index && dt === 0)) throw new RangeError('Observation times must increase');
    previousTime = time;
    const F = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]];
    const d2 = dt * dt, d3 = d2 * dt;
    const Q = [[q * d3 / 3, 0, q * d2 / 2, 0], [0, q * d3 / 3, 0, q * d2 / 2], [q * d2 / 2, 0, q * dt, 0], [0, q * d2 / 2, 0, q * dt]];
    const predictedState = multiply(F, state.map(x => [x])).map(row => row[0]);
    const predictedCovariance = plus(multiply(multiply(F, covariance), transpose(F)), Q);
    const observed = observation == null ? null : point(observation, `observations[${index}]`);
    let innovation = null, innovationCovariance = null, gain = zeros(4, 2);
    if (observed) {
      innovation = [observed[0] - predictedState[0], observed[1] - predictedState[1]];
      innovationCovariance = plus(multiply(multiply(H, predictedCovariance), HT), R);
      const [[a, b], [c, d]] = innovationCovariance, determinant = a * d - b * c;
      if (!(determinant > 0)) throw new RangeError('Innovation covariance is not positive definite');
      const inverse = [[d / determinant, -b / determinant], [-c / determinant, a / determinant]];
      gain = multiply(multiply(predictedCovariance, HT), inverse);
      state = predictedState.map((x, i) => x + gain[i][0] * innovation[0] + gain[i][1] * innovation[1]);
      const KH = multiply(gain, H), A = identity(4).map((row, i) => row.map((x, j) => x - KH[i][j]));
      covariance = plus(multiply(multiply(A, predictedCovariance), transpose(A)), multiply(multiply(gain, R), transpose(gain)));
      // Only remove floating-point asymmetry; never substitute a hand-drawn P.
      covariance = covariance.map((row, i) => row.map((x, j) => (x + covariance[j][i]) * .5));
    } else {
      state = predictedState.slice(); covariance = copy(predictedCovariance);
    }
    records.push({ index, time, observed, predicted: predictedState.slice(0, 2), filtered: state.slice(0, 2),
      predictedState: predictedState.slice(), state: state.slice(), covariance: copy(covariance),
      predictedCovariance: copy(predictedCovariance), innovation, innovationCovariance, gain: copy(gain) });
  }
  return records;
}

/** A seeded, smooth moving target with independent noisy x/y measurements. */
export function createKalmanDemo({ samples = 241, duration = 7.15, seed = 40, noiseStd = .035, processNoise = .35, cycles = 1.3, phase = 0 } = {}) {
  if (!Number.isInteger(samples) || samples < 2) throw new RangeError('samples must be an integer >= 2');
  if (!(duration > 0) || !Number.isFinite(duration)) throw new RangeError('duration must be positive');
  if (!(noiseStd > 0) || !Number.isFinite(noiseStd)) throw new RangeError('noiseStd must be positive');
  finite(cycles, 'cycles'); finite(phase, 'phase');
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0; return (randomState + .5) / 4294967296; };
  const normal = () => Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
  const truth = [], observations = [], dt = duration / (samples - 1);
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    const p = [u, .50 + .18 * Math.sin(2 * Math.PI * cycles * u + phase)];
    truth.push(p); observations.push({ x: p[0] + noiseStd * normal(), y: p[1] + noiseStd * normal(), time: i * dt });
  }
  const records = kalmanFilter2D(observations, { dt, processNoise, measurementVariance: noiseStd * noiseStd });
  records.forEach((record, i) => { record.truth = truth[i].slice(); });
  const rmse = field => Math.sqrt(records.reduce((sum, row) => sum + row[field].reduce((s, x, j) => s + (x - row.truth[j]) ** 2, 0), 0) / (2 * samples));
  return { kind: 'constant-velocity-2d', stateOrder: ['x', 'y', 'vx', 'vy'], coordinateSpace: 'normalized',
    seed, dt, duration, samples: records, records, truth,
    observed: records.map(r => r.observed), predicted: records.map(r => r.predicted), filtered: records.map(r => r.filtered),
    covariance: records.map(r => r.covariance), predictedCovariance: records.map(r => r.predictedCovariance),
    metrics: { observedRMSE: rmse('observed'), filteredRMSE: rmse('filtered') },
    parameters: { processNoise, measurementVariance: noiseStd * noiseStd, cycles, phase } };
}

/** Squared Euclidean costs computed from actual point coordinates. */
export function pointCostMatrix(left, right, { squared = true } = {}) {
  const a = left.map((p, i) => point(p, `left[${i}]`)), b = right.map((p, i) => point(p, `right[${i}]`));
  return a.map(p => b.map(q => { const cost = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; return squared ? cost : Math.sqrt(cost); }));
}

// Shortest augmenting-path Hungarian algorithm for rows <= columns.
function solveWide(cost) {
  const n = cost.length, m = cost[0].length;
  const u = Array(n + 1).fill(0), v = Array(m + 1).fill(0), p = Array(m + 1).fill(0), way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Infinity), used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0]; let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) {
        const reduced = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (reduced < minv[j]) { minv[j] = reduced; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0 !== 0);
  }
  const assignment = Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) assignment[p[j] - 1] = j - 1;
  return assignment;
}

/** Min-cost one-to-one matching of min(rows,columns) pairs. Unmatched = -1. */
export function hungarian(costMatrix) {
  if (!Array.isArray(costMatrix) || costMatrix.some(row => !Array.isArray(row))) throw new TypeError('costMatrix must be rectangular');
  const rows = costMatrix.length, columns = rows ? costMatrix[0].length : 0;
  if (costMatrix.some(row => row.length !== columns || !row.every(Number.isFinite))) throw new TypeError('All costs must be finite and rows must have equal length');
  let assignment = Array(rows).fill(-1);
  if (rows && columns) {
    if (rows <= columns) assignment = solveWide(costMatrix);
    else solveWide(transpose(costMatrix)).forEach((row, col) => { assignment[row] = col; });
  }
  const columnToRow = Array(columns).fill(-1), pairs = [];
  assignment.forEach((column, row) => { if (column >= 0) { columnToRow[column] = row; pairs.push({ row, column, cost: costMatrix[row][column] }); } });
  return { assignment, rowToColumn: assignment.slice(), columnToRow, pairs,
    totalCost: pairs.reduce((sum, pair) => sum + pair.cost, 0), cardinality: pairs.length,
    unmatchedRows: assignment.flatMap((col, row) => col < 0 ? [row] : []),
    unmatchedColumns: columnToRow.flatMap((row, col) => row < 0 ? [col] : []) };
}

/** Both of the first two tracks prefer observation 0; greedy steals its match. */
export function createMatchingDemo() {
  const left = [[.25, .35], [.33, .36], [.80, .68]];
  const right = [[.31, .35], [.08, .30], [.82, .70]];
  const costs = pointCostMatrix(left, right), optimal = hungarian(costs);
  const available = new Set(right.map((_, i) => i));
  const greedyAssignment = costs.map(row => {
    let selected = -1, lowest = Infinity;
    for (const j of available) if (row[j] < lowest) { lowest = row[j]; selected = j; }
    available.delete(selected); return selected;
  });
  const greedyCost = greedyAssignment.reduce((sum, col, row) => sum + costs[row][col], 0);
  const nearest = costs.map(row => row.indexOf(Math.min(...row)));
  return { kind: 'point-association', coordinateSpace: 'normalized', left, right, costs, costMatrix: costs,
    nearest, nearestHasConflict: new Set(nearest).size < nearest.length,
    greedy: { assignment: greedyAssignment, totalCost: greedyCost }, optimal,
    improvement: greedyCost - optimal.totalCost };
}
