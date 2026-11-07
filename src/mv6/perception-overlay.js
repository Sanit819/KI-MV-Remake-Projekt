import { kalmanFilter2D } from './inference-math.js';

// Authored detection-language visualisation, NOT YOLO inference or image analysis.
// Every frame is a pure lookup/function of shot time; no animation state integrates.
const START = 2896 / 60, DURATION = 221 / 60, FPS = 60;
const PURPLE = '#b88ce8', PALE = '#eee8df', MUTED = '#9b87b1', GOLD = '#edc087';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const prog = (u, a, b) => clamp((u - a) / (b - a));
const shutter = u => smooth(prog(u, .06, .24)) * (1 - smooth(prog(u, .74, .91)));
const target = [1506, 374];
const observations = Array.from({ length: 222 }, (_, i) => {
  const u = i / 221, shut = shutter(u);
  if (shut >= .96) return null;
  const noise = 1.5 + shut * 9;
  return [target[0] + noise * Math.sin(i * 1.13), target[1] + noise * .6 * Math.sin(i * .79 + .4)];
});
const track = kalmanFilter2D(observations, { dt: 1 / FPS, processNoise: 24, measurementVariance: 9 });
// Two high-confidence soundtrack onset anchors inside the two-dizzy lyric window.
const DIZZY_HITS = [49.624943 - START, 50.547937 - START];
const RECOVERY_HIT = 51.488345 - START;

function line(ctx, points, color, alpha, width = 1.4) {
  if (alpha <= .0001) return;
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke();
}
function corners(ctx, w, h, color, alpha, length = 24, width = 2) {
  for (const [x, y, sx, sy] of [[-w / 2, -h / 2, 1, 1], [w / 2, -h / 2, -1, 1], [-w / 2, h / 2, 1, -1], [w / 2, h / 2, -1, -1]]) {
    line(ctx, [[x + sx * length, y], [x, y], [x, y + sy * length]], color, alpha, width);
  }
}
function box(ctx, at, size, angle, alpha, { ghost = false, label = null, confidence = null } = {}) {
  if (alpha <= .0001) return;
  ctx.save(); ctx.translate(...at); ctx.rotate(angle);
  corners(ctx, ...size, ghost ? MUTED : PURPLE, alpha, ghost ? 30 : 20, ghost ? 1.5 : 2.3);
  if (!ghost) {
    line(ctx, [[-size[0] / 2 + 24, -size[1] / 2], [size[0] / 2 - 24, -size[1] / 2]], PURPLE, alpha * .28, .85);
    line(ctx, [[0, -7], [0, 7]], PALE, alpha * .52, 1);
    line(ctx, [[-7, 0], [7, 0]], PALE, alpha * .52, 1);
  } else {
    ctx.setLineDash([3, 11]);
    line(ctx, [[-size[0] / 2 + 34, -size[1] / 2], [size[0] / 2 - 34, -size[1] / 2]], MUTED, alpha * .62, 1);
    line(ctx, [[-size[0] / 2, 0], [size[0] / 2, 0]], MUTED, alpha * .3, .8);
    ctx.setLineDash([]);
  }
  if (label) {
    const text = confidence === null ? label : label + '  ' + confidence.toFixed(2);
    ctx.globalAlpha = alpha; ctx.font = '500 17px Consolas, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = ghost ? MUTED : PALE; ctx.fillText(text, -size[0] / 2, -size[1] / 2 - 12);
  }
  ctx.restore();
}
function impulse(local, at) {
  const d = local - at;
  return d < 0 || d > .8 ? 0 : Math.sin(Math.min(1, d / .025) * Math.PI / 2) * Math.exp(-d / .25);
}

export function drawPerceptionOverlay(ctx, e, beat = {}) {
  const shot = typeof e.shot === 'string' ? e.shot : e.shot?.id;
  if (shot !== 'R14') return { kind: 'perception-visualisation', active: false };
  const local = clamp(Number.isFinite(e.local) ? e.local : e.t - START, 0, DURATION);
  const u = clamp(local / DURATION), shut = shutter(u), visibility = 1 - shut;
  const index = Math.min(track.length - 1, Math.floor(local * FPS + 1e-7)), state = track[index];
  const envelope = smooth(local / .08) * smooth((DURATION - local) / .09);
  const pulse = clamp(Number(beat.pulse) || 0), kick = clamp(Number(beat.kick) || 0);
  const firstHit = impulse(local, DIZZY_HITS[0]), secondHit = impulse(local, DIZZY_HITS[1]);
  const recoveryHit = impulse(local, RECOVERY_HIT);
  const impact = Math.max(firstHit, secondHit), dizzy = smooth((local - 1.10) / .15) * (1 - smooth((local - 2.95) / .35));
  const loss = shut >= .96 || state.observed === null;
  // Authorial residual displacement is deliberately separate from the real filter state.
  const residualX = shut * (dizzy * (52 * Math.sin(local * 7.1) + 28 * Math.sin(local * 15.3)) - 130 * firstHit + 145 * secondHit);
  const residualY = shut * (dizzy * 26 * Math.sin(local * 9.5 + .4) + 48 * firstHit - 38 * secondHit);
  const tilt = shut * dizzy * (.025 * Math.sin(local * 8.4) + .078 * (secondHit - firstHit));
  const confidence = loss ? 0 : clamp(.97 * Math.pow(visibility, 1.3) - .08 * shut * pulse);
  const detectionAlpha = loss ? 0 : envelope * Math.pow(visibility, 1.4) * (.67 + .20 * pulse);
  const ghostAlpha = envelope * shut * (.08 + .10 * impact + .02 * kick);
  const phase = loss ? 'lost-predict-only' : u > .74 ? 'reacquiring' : shut > .15 ? 'losing-lock' : 'tracking';
  const predicted = [state.predicted[0] + residualX, state.predicted[1] + residualY];
  const penPhase = (local * 3.3) % 1, pen = [1160, 745 - 12 * Math.sin(penPhase * Math.PI)];

  ctx.save();
  // Root establishes 1920x1080 design space. The original bottom lyrics stay clear.
  ctx.beginPath(); ctx.rect(80, 80, 1760, 810); ctx.clip();
  ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  if (ghostAlpha > .0001) {
    // Two fading hypotheses shear apart only in the local perception region.
    for (let j = 2; j >= 1; j--) {
      const lag = j * .055, previous = Math.max(0, local - lag);
      const echo = [predicted[0] - j * (44 + impact * 75), predicted[1] + j * (12 + 18 * Math.sin(previous * 9))];
      box(ctx, echo, [258 + j * 19, 116 + j * 9], tilt - j * .018 * dizzy, ghostAlpha * (1 - j * .25), { ghost: true });
    }
    box(ctx, predicted, [258 + 65 * impact, 116 + 32 * impact], tilt, ghostAlpha, { ghost: true, label: 'LOST' });
    // A faint skewed coordinate ruler conveys disagreement, not a replacement scene.
    const origin = [1010 + residualX * .40, 447 + residualY * .5];
    ctx.save(); ctx.translate(...origin); ctx.rotate(tilt * 1.25);
    line(ctx, [[-210, 0], [210, 0]], MUTED, ghostAlpha * .65, 1);
    line(ctx, [[0, -112], [0, 112]], MUTED, ghostAlpha * .45, 1);
    for (let n = -4; n <= 4; n++) line(ctx, [[n * 43, -4], [n * 43, 4]], MUTED, ghostAlpha * .75, 1);
    ctx.restore();
  }
  if (detectionAlpha > .0001) {
    const position = state.filtered;
    box(ctx, position, [246, 112], 0, detectionAlpha, { label: u > .79 ? 'ACQUIRED' : 'TRACK', confidence });
    box(ctx, [440, 369], [382, 112], 0, detectionAlpha * .55);
    box(ctx, [816, 567], [252, 132], 0, detectionAlpha * .34);
    const acquire = u > .79 ? Math.max(Math.sin(Math.PI * prog(u, .79, .95)), recoveryHit) : 0;
    if (acquire > 0) {
      ctx.save(); ctx.translate(...position);
      corners(ctx, 258 + (1 - acquire) * 18, 124 + (1 - acquire) * 18, PALE, detectionAlpha * acquire * .65, 15, 1.6);
      ctx.restore();
    }
  }
  // The continuing gold input remains physically attached to the existing pen.
  const inputAlpha = envelope * shut * (.17 + .14 * pulse + .10 * kick);
  if (inputAlpha > .0001) {
    ctx.globalAlpha = inputAlpha; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.45;
    const radius = 19 + 31 * (1 - pulse) + 9 * impact;
    ctx.beginPath(); ctx.arc(pen[0], pen[1], radius, -.8, .75); ctx.stroke();
    ctx.beginPath(); ctx.arc(pen[0], pen[1], radius, Math.PI - .8, Math.PI + .75); ctx.stroke();
    line(ctx, [[pen[0] - 5, pen[1] + 18], [pen[0] + 5, pen[1] + 18]], GOLD, inputAlpha, 1.5);
  }
  ctx.restore();

  return {
    kind: 'perception-visualisation', active: true, version: 1, bodyInterval: [START, START + DURATION],
    source: 'authored UI regions and deterministic noisy toy observations; not YOLO/model inference',
    phase, local, frameInShot: index, shutter: shut, observationAvailable: !loss, confidence,
    detectionAlpha, detectionVisible: detectionAlpha > .0001, ghostAlpha,
    filter: { observed: state.observed, predicted: state.predicted, filtered: state.filtered, covariance: state.covariance, measurementVariance: 9, processNoise: 24 },
    authoredResidual: { offset: [residualX, residualY], tilt, distinctFromFilterEstimate: true },
    renderedPrediction: predicted, inputAnchor: pen, inputAlpha, onsetBodyTimes: DIZZY_HITS.map(t => t + START),
    onsetStrengths: [firstHit, secondHit], recoveryOnsetBodyTime: RECOVERY_HIT + START, recoveryHit,
    pulse, kick, subtitleSafeBottom: 890,
    deterministicRandomAccess: true, noFutureObservations: true
  };
}
