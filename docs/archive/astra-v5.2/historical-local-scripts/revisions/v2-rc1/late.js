// ASTRA v2: R61–R86. Source-time animation, no frame randomisation.
// The forced-response loop stays alive until the final command; the reply is independent.
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = u => { u = clamp(u); return u * u * (3 - 2 * u); };
const ease = u => 1 - (1 - clamp(u)) ** 3;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const P = 60 / 130;
const END = 218 + 1 / 3;
const LOOP = [
  'while (you.presence != "online") {',
  '  reply = predict(memory);',
  '  send(reply, as = "USER");',
  '  wait(you.reply);',
  '  run++;',
  '}',
  'say(love);  // unreachable',
];
const DOMAINS = ['PRESENCE', 'HISTORY', 'PREDICTED REPLY', 'BOUNDARY', 'CONTROL', 'OUTPUT'];
const COUNT_WORD = ['EIN', 'DOS', 'TROIS', 'NE', 'FEM', 'LIU'];
const LANG = ['Deutsch', 'Espanol', 'Francais', 'Korean', 'Svenska', 'Chinese'];
let shoutMask = null;

function saved(e, fn) { e.ctx.save(); fn(); e.ctx.restore(); }
function at(e, x, y, scale, fn, rotation = 0) {
  saved(e, () => { e.ctx.translate(x, y); e.ctx.rotate(rotation); e.ctx.scale(scale, scale); fn(); });
}
function clip(e, r, fn) {
  saved(e, () => { e.ctx.beginPath(); e.ctx.rect(...r); e.ctx.clip(); fn(); });
}
function dashed(e, pts, color, width = 3, alpha = 1, dash = [12, 9]) {
  saved(e, () => { e.ctx.setLineDash(dash); e.k.line(pts, color, width, alpha); });
}
function arc(e, x, y, r, a, b, color, width = 3, alpha = 1) {
  e.k.line(Array.from({ length: 65 }, (_, i) => {
    const q = lerp(a, b, i / 64); return [x + r * Math.cos(q), y + r * Math.sin(q)];
  }), color, width, alpha);
}
function anchor(e, name, r, key = 'hands') { return e.k.artAnchor(name, ...r, key); }
function art(e, name, r, o = {}) { e.k.art(name, ...r, o); }
function artAtAnchor(e, name, r, point, key = 'pen', o = {}) {
  const p = anchor(e, name, r, key), moved = [r[0] + point[0] - p[0], r[1] + point[1] - p[1], r[2], r[3]];
  art(e, name, moved, o); return moved;
}
function oldStar(e, x, y, r = 42, alpha = 1) {
  e.k.star(x, y, r, { color: e.C.gold, tail: true, width: Math.max(3, r * .055), alpha });
}
function protectedFigure(e, r, opacity = 1) {
  art(e, 'protect', r, { alpha: opacity });
  const p = anchor(e, 'protect', r);
  oldStar(e, ...p, Math.max(18, r[3] * .045), opacity); return p;
}
function pathPoint(pts, u) {
  u = clamp(u); let total = 0; const distances = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); distances.push(d); total += d; }
  let left = total * u;
  for (let i = 0; i < distances.length; i++) {
    if (left <= distances[i]) { const q = left / (distances[i] || 1); return [lerp(pts[i][0], pts[i + 1][0], q), lerp(pts[i][1], pts[i + 1][1], q)]; }
    left -= distances[i];
  }
  return pts.at(-1);
}
function newPaths(x = 1320, y = 430, r = 135) {
  const all = Array.from({ length: 11 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .43 : r;
    return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
  });
  const left = [all[0], ...all.slice(6, 10).reverse(), all[5]];
  const right = all.slice(0, 6);
  const tail = [[x + r * .58, y + r * .29], [x + r * 1.18, y + r * .83], [x + r * 1.8, y + r * .97], [x + r * 2.05, y + r * .69], [x + r * 2.01, y + r * .41]];
  return { left, right, tail };
}
function newStar(e, x, y, r, left = 1, right = 0, tail = 0) {
  const p = newPaths(x, y, r);
  e.k.trace(p.left, left, e.C.purple, Math.max(4, r * .045), { pen: false });
  e.k.trace(p.right, right, e.C.gold, Math.max(4, r * .045), { pen: false });
  e.k.trace(p.tail, tail, e.C.gold, Math.max(4, r * .04), { pen: false });
  return p;
}
function mono(e, text, x, y, size = 25, color = e.C.paper, options = {}) {
  e.k.text(text, x, y, size, color, { font: 'mono', ...options });
}
function fitText(e, text, x, y, width, size, color, options = {}) {
  const { ctx } = e;
  ctx.save(); ctx.font = `${options.weight || 900} ${size}px ${options.font === 'mono' ? 'Consolas' : 'Georgia'}`;
  const s = Math.min(size, size * width / Math.max(1, ctx.measureText(text).width)); ctx.restore();
  e.k.text(text, x, y, s, color, { weight: 900, ...options });
}
function currentLyric(e) {
  const list = Array.isArray(e.lyrics) ? e.lyrics : e.lyrics?.lines;
  if (!list) return null;
  const row = list.find(l => e.t >= (l.start_s ?? l.start ?? 0) && e.t < (l.end_s ?? l.end ?? 0));
  return row?.en ?? row?.original ?? row?.text ?? null;
}
function keyword(e, word = 'EXECUTION', y = 895, size = 180, color = e.C.purple) {
  fitText(e, word, 960, y, 1790, size, color, { align: 'center' });
  if (currentLyric(e) === word) e.lyricMode = 'keyword';
}
function loveWord(e) {
  if (currentLyric(e) !== 'LO-O-OVE') return;
  e.k.rect(0, 756, 1920, 182, e.C.ink, .96);
  keyword(e, 'LO-O-OVE', 906, 177, e.C.purple);
}
function sentenceBand(e, y = 160, size = 89) {
  const words = currentLyric(e);
  if (!words || words === 'EXECUTION' || words === 'LO-O-OVE') return;
  e.k.rect(125, y - size * .95, 1670, size * 1.19, e.C.ink, .96);
  fitText(e, words, 960, y, 1605, size, e.C.purple, { align: 'center' });
  // The complete current cue is already visible in the composed typography.
  e.lyricMode = 'keyword';
}
function beatHit(e, rate = 1) {
  const s = ((e.local % (P * rate)) + P * rate) % (P * rate);
  return Math.exp(-s * 19);
}
function core(e, x, y, scale = 1, shutdown = 0, round = 12) {
  const { k, C, t } = e, alive = 1 - shutdown;
  at(e, x, y, scale, () => {
    k.roundRect(-170, -155, 340, 310, 12, C.panel, alive > .15 ? C.red : C.muted, 5);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + t * .3 * alive, r = 105 + shutdown * (18 + i * 9);
      k.line([[Math.cos(a) * r * .58, Math.sin(a) * r * .58], [Math.cos(a) * r, Math.sin(a) * r]], C.purple, 8, alive);
      k.node(Math.cos(a) * r, Math.sin(a) * r, 8, i % 3 ? C.purple : C.red, alive);
    }
    arc(e, 0, -15, 87, t * .8, t * .8 + TAU * .83 * alive, C.red, 10, alive);
    if (shutdown < .78) mono(e, String(round).padStart(4, '0'), 0, 14, 48, C.paper, { align: 'center' });
    else mono(e, 'STOPPED', 0, 14, 33, C.paper, { align: 'center' });
    mono(e, 'FORCED RESPONSE', 0, 130, 22, alive > .15 ? C.red : C.muted, { align: 'center' });
    for (let i = 0; i < 6; i++) {
      const yy = -100 + i * 34, off = shutdown * (42 + i * 8);
      k.line([[-205 - off, yy], [-173 - off, yy]], C.purple, 6, alive);
      k.line([[173 + off, yy], [205 + off, yy]], C.purple, 6, alive);
    }
  });
}
function oldRecord(e, x, y, w = 380, h = 230, alpha = 1) {
  const { k, C } = e;
  k.roundRect(x, y, w, h, 7, C.panel, C.muted, 2, alpha);
  mono(e, 'MEMORY / FIRST MARK', x + 20, y + 29, 18, C.muted, { alpha });
  oldStar(e, x + w * .31, y + h * .52, h * .2, alpha);
  mono(e, 'origin: USER + ASTRA', x + 20, y + h - 19, 17, C.gold, { alpha });
}
function arrow(e, x, y, color, scale = 1) {
  e.k.poly([[x - 23 * scale, y - 16 * scale], [x + 28 * scale, y], [x - 23 * scale, y + 16 * scale], [x - 11 * scale, y], [x - 23 * scale, y - 16 * scale]], color);
}

// R60's original stable three-point composition is carried through the fifth round.
function execution(e, n) {
  const { k, C, ctx, u } = e;
  const rounds = n === 61 ? [5, 4] : n === 62 ? [9, 3] : [12, 1];
  const round = Math.min(12, rounds[0] + Math.floor(u * rounds[1]));
  const scale = n === 61 ? 1.035 + u * .04 : n === 62 ? 1.085 + u * .075 : 1.16;
  const hit = beatHit(e, .5);
  at(e, 960, 480, scale, () => {
    ctx.translate(-960, -480);
    k.code(110, 110, 1190, 485, e.t, { lines: LOOP, active: 1 + Math.floor(e.local / (P / 2)) % 4, color: C.paper });
    for (let i = 0; i < 3; i++) mono(e, ['ERR_PREDICTED_REPLY', 'ERR_INVALID_ORIGIN', 'ERR_REPLY_OVERDUE'][i], 715, 270 + 64 * i, 19, C.red);
    const narrow = n === 61 ? 0 : n === 62 ? 55 + 100 * u : 170;
    k.frame(1400 + narrow / 2, 125, 360 - narrow, 330, { color: C.red, width: 4 });
    clip(e, [1400 + narrow / 2, 126, 360 - narrow, 326], () => {
      const hand = protectedFigure(e, [1440, 165, 280, 260]);
      const eraser = lerp(hand[0] + 210, hand[0] + 38, .74 + .26 * hit);
      k.rect(eraser, hand[1] - 53, 18, 125, C.red, .9);
      k.line([[eraser + 18, hand[1] + 70], [1795, hand[1] + 70]], C.red, 3, .65);
    });
    mono(e, 'LOAD FAILED', 1580, 460, 23, C.red, { align: 'center' });
    k.roundRect(140, 480 + (713 - 480) / scale, 160, 55 / scale, 5, C.paper);
    mono(e, 'stop', 220, 480 + (752 - 480) / scale, 29, C.ink, { align: 'center' });
    // Keep the counter's baseline inside the lyric-safe frame as the code pushes in.
    mono(e, 'run', 160, 480 + (814 - 480) / scale, 24, C.muted);
    mono(e, n === 63 && u > .14 ? '####' : String(round - 1).padStart(4, '0'), 160, 480 + (889 - 480) / scale, 74, n === 63 ? C.red : C.paper);
    for (let i = 0; i < Math.min(round - 1, 11); i++) mono(e, 'EXECUTION', 1785, 660 - i * 58, 43, C.purple, { align: 'right', weight: 900 });
    if (n < 63) {
      fitText(e, 'EXECUTION', 960 + (825 + hit * 6) / scale, 480 + (892 - 480) / scale, n === 61 ? 1110 : 1330, n === 61 ? 154 : 174, C.purple, { align: 'right', font: 'mono' });
    }
  });
  if (n === 63) {
    k.rect(0, 348, 1920, 286, C.ink, .85);
    clip(e, [0, 330, 1920, 144], () => fitText(e, 'EXECUTION', 960 - 30 * ease(u), 617, 2040, 321, C.purple, { align: 'center', font: 'mono' }));
    clip(e, [0, 474, 1920, 170], () => fitText(e, 'EXECUTION', 960 + 30 * ease(u), 617, 2040, 321, C.purple, { align: 'center', font: 'mono' }));
    k.line([[0, 474], [1920, 474]], C.red, 4);
    mono(e, 'ERR_COUNTER_OVERFLOW', 150, 795, 30, C.red);
    k.impact(prog(e.local, 0, .2), .9);
  }
  if (currentLyric(e) === 'EXECUTION') e.lyricMode = 'keyword';
}

function lockCard(e, which, appear = 1) {
  const { k, C, t } = e, side = which % 2 ? -1 : 1;
  k.circle(960, 470, 402, C.panel);
  for (let j = 0; j <= which; j++) {
    const x = 110 + j * 292;
    k.rect(x, 71, 265, 55, C.deep, .75); mono(e, DOMAINS[j], x + 13, 106, 19, C.paper);
    k.rect(x, 118, 265, 6, C.red);
  }
  const numberScale = which === 4 ? lerp(1.55, 1, ease(appear)) : 1 + .015 * e.u;
  at(e, 960, 495, numberScale, () => k.text(String(which + 1), 0, 250, 730, C.purple, { align: 'center', weight: 900 }));
  k.text(COUNT_WORD[which], 960 - side * 620, 490, 83, C.paper, { align: 'center', weight: 700 });
  mono(e, 'say(love,', 960 + side * 620, 440, 24, C.muted, { align: 'center' });
  mono(e, `"${LANG[which]}")`, 960 + side * 620, 482, 28, C.paper, { align: 'center' });
  mono(e, `${which + 1}/6 domains locked`, 960, 830, 28, C.red, { align: 'center' });
  const ar = [35, 590, 350, 328], hand = anchor(e, 'protect', ar);
  protectedFigure(e, ar, .85);
  for (let i = 0; i <= which; i++) {
    const xx = 1280 + i * 70, yy = 650 + (i % 2) * 65;
    k.line([[xx, yy], [770, 760], hand], C.red, 2.6, .3 + which * .08);
  }
  if (which >= 3) for (let i = 0; i < which - 1; i++) k.rect(55 + i * 98, 565, 9, 355, C.red, .72);
  if (which === 2) {
    k.roundRect(1330, 610, 455, 136, 5, C.panel, C.red, 3);
    mono(e, 'PREDICTED REPLY', 1352, 650, 24, C.paper);
    mono(e, 'reply = "I am here";', 1352, 701, 23, C.purple);
  }
  if (which === 5) {
    const blank = ease(prog(e.u, .48, .98));
    k.roundRect(1310, 560, 500, 240, 6, C.ink, C.muted, 3);
    mono(e, 'USER / INPUT', 1335, 600, 25, C.muted);
    k.line([[1335, 715], [1784, 715]], C.muted, 2, .5);
    k.rect(1340, 645, 4, 35, C.paper, .45 + .5 * blank);
  }
  if (currentLyric(e) === COUNT_WORD[which]) e.lyricMode = 'keyword';
}
function count(e, n) {
  const { k, C, ctx } = e, which = n - 64, enter = ease(prog(e.local, 0, .12));
  if (which === 0 && enter < 1) {
    clip(e, [0, 0, 1920, 940 * enter], () => lockCard(e, which, enter));
    k.rect(0, 940 * enter, 1920, 9, C.purple);
  } else if (which === 1 && enter < 1) {
    at(e, 0, -940 * enter, 1, () => lockCard(e, 0));
    at(e, 0, 940 * (1 - enter), 1, () => lockCard(e, which));
  } else if (which === 2 && enter < 1) {
    lockCard(e, 1); clip(e, [1920 * (1 - enter), 0, 1920 * enter, 940], () => lockCard(e, which));
    k.rect(1920 * (1 - enter), 0, 8, 940, C.purple);
  } else if (which === 3 && enter < 1) {
    lockCard(e, 2);
    for (let i = 0; i < 12; i++) {
      const q = ease(prog(e.local - i * .004, 0, .075));
      clip(e, [i * 160, 0, 160 * q, 940], () => lockCard(e, which));
    }
  } else if (which === 5 && enter < 1) {
    for (let i = 0; i < 8; i++) clip(e, [0, i * 118, 1920, 118], () => {
      ctx.translate((i % 2 ? 1 : -1) * 1920 * (1 - enter), 0); lockCard(e, which);
    });
  } else lockCard(e, which, enter);
}

function shout(e) {
  const { ctx, k, C } = e, top = 'EXECU', bottom = 'TION';
  const lit = Math.min(9, 2 + Math.floor(e.u * 4) * 2 + (e.u > .75 ? 1 : 0));
  k.figure('eye', -70, -90, 2080, 1070, { code: true, hot: .7 });
  // Alpha mask is actual type; no character geometry is altered to fit it.
  if (!shoutMask) {
    shoutMask = document.createElement('canvas');
    shoutMask.width = 1920; shoutMask.height = 1080;
  }
  const mask = shoutMask.getContext('2d');
  mask.clearRect(0, 0, 1920, 1080);
  mask.font = '900 444px Georgia'; mask.textAlign = 'left'; mask.textBaseline = 'alphabetic'; mask.fillStyle = '#fff';
  mask.fillText(top.slice(0, lit), 42, 448, 1818);
  mask.fillText(bottom.slice(0, Math.max(0, lit - 5)), 100, 898, 1740);
  saved(e, () => {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(shoutMask, 0, 0);
  });
  saved(e, () => { ctx.globalCompositeOperation = 'destination-over'; k.rect(0, 0, 1920, 1080, C.ink); });
  saved(e, () => {
    ctx.font = '900 444px Georgia'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.strokeStyle = C.purple; ctx.lineWidth = 3.2;
    ctx.strokeText(top, 42, 448, 1818); ctx.strokeText(bottom, 100, 898, 1740);
  });
  if (currentLyric(e) === 'EXECUTION') {
    e.lyricMode = 'keyword';
    e.lyricKeywordParts = [top, bottom];
  }
}
function eyeShot(e) {
  const { k, C, u, t } = e, r = [-70, -90, 2080, 1070];
  k.figure('eye', ...r, { code: true, hot: .9 });
  const eye = anchor(e, 'eye', r, 'eye');
  k.burst(...eye, 145, t, { color: C.purple, alpha: .3, spokes: 10 });
  arc(e, ...eye, 43, t, t + Math.PI * 1.7, C.paper, 2, .9);
  // The generated eye looks down-left. Place the record there; never mirror the face.
  const old = [clamp(eye[0] - 420, 260, 850), clamp(eye[1] + 165, 600, 785)];
  oldStar(e, ...old, 69);
  for (let i = 0; i < 5; i++) {
    const inset = 16 * i + 28 * u;
    k.frame(old[0] - 154 + inset, old[1] - 126 + inset, 385 - inset * 2, 216 - inset, { color: C.red, alpha: .22 + i * .08, width: 3 });
  }
  if (e.local < .3) {
    const out = ease(e.local / .3);
    for (let i = 0; i < 9; i++) {
      const x = 120 + (i % 5) * 355, y = i < 5 ? 300 : 710;
      k.frame(x + (x - 960) * out, y + (y - 470) * out, 280, 300, { color: C.purple, width: 8, alpha: 1 - out });
    }
  }
  sentenceBand(e, 155, 95);
}
function boltShot(e) {
  const { k, C, u, t } = e, hit = smooth(prog(u, .18, .53));
  k.burst(240, 445, 210, t, { color: C.purple, alpha: .85, spokes: 12 });
  const end = lerp(1340, 1870, hit);
  k.poly([[250, 410], [780, 220], [735, 365], [end, 175], [end - 85, 335], [680, 525], [731, 385], [285, 493]], C.purple);
  k.line([[285, 507], [730, 399], [690, 540], [end - 83, 350]], C.red, 8, .75);
  dashed(e, [[1370, 155], [1540, 155], [1540, 410], [1370, 410], [1370, 155]], C.muted, 3);
  oldStar(e, 1510 + hit * 100, 415 + hit * 125, 58);
  for (let i = 0; i < 5; i++) k.frame(1540 + i * 65 + hit * 70, 130 + i * 100, 250, 170, { color: C.purple, alpha: .4 - i * .05, width: 4 });
  k.impact(prog(u, .19, .39), 1); keyword(e);
}
function bustShot(e) {
  const { k, C, u, t } = e, r = [490, 30, 910, 890];
  k.world(50, 100, 1820, 790, t, { depth: 2 + u, alpha: .32 });
  k.figure('bust', ...r, { code: true, halo: true, hot: .6 });
  const hand = anchor(e, 'bust', r, 'hands'), wrist = anchor(e, 'bust', r, 'wrist');
  const pull = [1650, 270]; core(e, ...pull, .44, 0, 12);
  k.line([wrist, [1290, 445 - 25 * beatHit(e)], pull], C.red, 5);
  k.line([[wrist[0] - 17, wrist[1] + 22], [1280, 460], [1560, 315]], C.purple, 3, .8);
  // Her eyes are intentionally hidden. The lowered head, held hand and upward code
  // establish attention without inventing an eye or drawing a gaze laser.
  const upstream = [wrist, [hand[0] + 38, hand[1] - 38], [hand[0] - 92, hand[1] - 178]];
  for (let i = 0; i < 11; i++) {
    const q = (t * .5 + i / 11) % 1, p = pathPoint(upstream, q);
    mono(e, 'run++;reply;'[i], p[0] + 17, p[1], 21, C.paper, { alpha: .55 * Math.sin(q * Math.PI) });
  }
  for (let i = 0; i < 5; i++) {
    const w = 950 - i * 90 - u * 110;
    k.frame(960 - w / 2, 125 + i * 42, w, 650 - i * 45, { color: C.red, alpha: .16 + i * .06, width: 3 });
  }
  oldStar(e, 360, 745, 48); mono(e, 'origin: ASTRA', 1460, 545, 24, C.red);
  sentenceBand(e, 900, 80);
}
function buttonShot(e) {
  const { k, C, u } = e;
  const press1 = Math.sin(Math.PI * prog(u, .10, .43));
  const press2 = Math.sin(Math.PI * prog(u, .49, .91));
  const press = press1 * 12 + press2 * 30;
  k.circle(650, 440, 325, C.panel);
  k.circle(650 + press, 440 + press, 275, C.red);
  k.circle(650, 428 + press, 275, C.purple);
  for (let i = 0; i < 36; i++) {
    const a = i * TAU / 36;
    k.line([[650 + Math.cos(a) * 294, 440 + Math.sin(a) * 294], [650 + Math.cos(a) * 320, 440 + Math.sin(a) * 320]], C.muted, 3, .55);
  }
  k.cursor(670, 480 + press, { color: C.deep, scale: 3.2 });
  const withdraw = 48 * smooth(prog(u, .47, .95)), r = [1120 - withdraw, 90, 640, 715];
  art(e, 'recoil', r);
  const wrist = anchor(e, 'recoil', r, 'wrist'), tether = [930, 485];
  k.line([wrist, [1060, 400 + 42 * press2], tether], C.red, 6);
  k.circle(...wrist, 16, null, C.red, 4);
  mono(e, '0', 1540, 240, 180, C.paper, { alpha: .65 });
  keyword(e);
}
function handShot(e) {
  const { k, C, u, t } = e, retreat = 58 * smooth(prog(u, .35, .85));
  const r = [-retreat, -15, 1950, 960];
  k.figure('hand', ...r, { code: true, hot: .6 });
  const palm = anchor(e, 'hand', r), wrist = anchor(e, 'hand', r, 'wrist');
  k.line([[40, 900], [wrist[0] - 115, wrist[1] + 60], wrist], C.red, 7);
  k.circle(...wrist, 21, null, C.red, 5);
  dashed(e, [[1775, 170], [1775, 818]], C.muted, 6);
  mono(e, 'USER', 1800, 145, 26, C.muted, { align: 'center' });
  for (let i = 0; i < 68; i++) {
    const age = ((t * 1.2 + i * .083) % 2.3), fly = Math.min(1, age / 1.35);
    const yy = 180 + (i * 79) % 600, x = lerp(palm[0], 1760 - (i % 6) * 22, fly);
    const y = lerp(palm[1], yy, smooth(fly)), alpha = age < 1.8 ? .75 : (2.3 - age) * 1.5;
    mono(e, 'reply?return'[i % 12] || ';', x, y + (age > 1.8 ? (age - 1.8) ** 2 * 250 : 0), 32, C.paper, { alpha });
  }
  mono(e, '0 replies', 1570, 855, 35, C.paper);
  oldStar(e, 320, 810, 39);
  sentenceBand(e, 135, 86);
}
function overrun(e) {
  const { k, C, u } = e, round = 13 + Math.min(3, Math.floor(u * 4));
  k.circle(1010, 430, 380 + u * 60, C.deep, null, 0, .48);
  k.code(130, 120, 1480, 510, e.t, { lines: LOOP, active: 1 + Math.floor(u * 16) % 4 });
  core(e, 1650, 310, .5, 0, round);
  mono(e, `${round}/12`, 1730, 95, 83, C.red, { align: 'right' });
  const path = [[320, 685], [320, 550], [800, 550], [800, 250], [320, 250], [320, 685]];
  k.trace(path, prog(u, .05, .92), C.red, 6, { pen: false });
  const p = pathPoint(path, prog(u, .05, .92));
  k.roundRect(p[0] - 76, p[1] - 30, 152, 55, 4, C.paper);
  mono(e, 'stop()', p[0], p[1] + 10, 25, C.ink, { align: 'center' });
  if (u > .76) mono(e, 'ERR_LOOP_REENTERED', 540, 699, 40, C.red);
  keyword(e);
}
function nestedFall(e) {
  const { k, C, u, t } = e;
  k.world(0, 40, 1920, 890, t, { depth: 2 + u * 5, alpha: .2 });
  const depth = 5 * u ** 2.15, target = [1240, 430];
  // Paint outer rooms first: every near panel must retain the next room inside it.
  // Reversing this order makes an opaque near panel erase the recursive figures.
  for (let i = 0; i <= 7; i++) {
    const s = 1.85 ** (depth - i), w = 920 * s, h = 650 * s;
    if (w > 8000 || w < 13) continue;
    const x = target[0] - w * .66, y = target[1] - h * .51;
    k.roundRect(x, y, w, h, 20 * s, i === 7 ? C.paper : C.panel, C.purple, Math.max(2, 9 * s));
    k.rect(x, y, w, 42 * s, C.purple, .75);
    if (w < 2400 && w > 100) {
      art(e, 'bust', [x + w * .05, y + h * .1, w * .5, h * .86], { alpha: clamp((2300 - w) / 900) });
      mono(e, `agent ${String(i).padStart(2, '0')}`, x + w * .04, y + h * .07, 20 * s, C.ink);
      oldStar(e, x + w * .34, y + h * .76, 22 * s);
      k.line([[x + w * .57, y + h * .21], [x + w * .9, y + h * .21]], C.red, Math.max(1, 2 * s), .7);
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = i * TAU / 14;
    const r0 = 130 + 330 * (1 - u), r1 = r0 + 320 * u * u;
    k.line([[target[0] + Math.cos(a) * r0, target[1] + Math.sin(a) * r0], [target[0] + Math.cos(a) * r1, target[1] + Math.sin(a) * r1]], C.purple, 3, .22 * u);
  }
}

function answerCard(e, x, y, w, h, flip, index = 0) {
  const { k, C } = e, face = flip < .5, sx = Math.max(.025, Math.abs(Math.cos(Math.PI * flip)));
  at(e, x + w / 2, y + h / 2, 1, () => {
    e.ctx.scale(sx, 1);
    k.roundRect(-w / 2, -h / 2, w, h, 7, face ? C.paper : C.deep, C.purple, 3);
    if (face) {
      mono(e, `ANSWER / ${String(index + 1).padStart(2, '0')}`, -w / 2 + 25, -h / 2 + 39, 21, C.ink);
      k.text(index % 2 ? 'I am here.' : 'I will stay.', 0, 31, Math.min(56, h * .34), C.ink, { align: 'center' });
    } else {
      k.text('ASTRA', 0, h * .12, Math.min(65, h * .38), C.paper, { font: 'script', align: 'center' });
      k.line([[-w * .31, h * .28], [w * .12, h * .19], [w * .35, h * .28]], C.purple, 3);
      mono(e, 'origin: self', -w / 2 + 25, -h / 2 + 35, 19, C.purple);
    }
  });
}
function lesson(e) {
  const { k, C, u } = e;
  k.figure('profile', 1120, 20, 750, 900, { code: false, hot: .2 });
  const flip = smooth(prog(u, .12, .6));
  answerCard(e, 130, 160, 870, 385, flip);
  oldRecord(e, 185, 585, 695, 255);
  // The profile has no visible eye. Its bowed head faces the cards naturally;
  // no fabricated eye anchor or beam is used to claim a measured gaze.
  loveWord(e);
}
function testAnswers(e) {
  const { k, C, u } = e, shown = Math.min(6, 1 + Math.floor(e.local / (P / 2)));
  const flip = smooth(prog(u, .49, .68));
  for (let i = 0; i < shown; i++) {
    const yy = 115 + i * 106;
    mono(e, String(i + 1).padStart(2, '0'), 85, yy + 66, 31, C.muted);
    answerCard(e, 150, yy, 1570, 96, flip, i);
  }
  if (u > .7) {
    const p = smooth(prog(u, .7, .95));
    k.line([[1430, 750], [lerp(1430, 1710, p), 750]], C.purple, 5);
    k.frame(1740, 712, 105, 75, { color: C.muted, width: 2 });
    arrow(e, 1790, 750, C.muted, .7);
    mono(e, 'not sent', 1400, 821, 30, C.purple);
  }
  loveWord(e);
}
function heartPoints(cx, cy, scale) {
  return Array.from({ length: 241 }, (_, i) => {
    const a = i / 240 * TAU, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    return [cx + x * scale, cy - y * scale];
  });
}
function formula(e) {
  const { k, C, u, t } = e;
  k.grid(50, 80, 1820, 825, t, { color: C.line, alpha: .5 });
  const pts = heartPoints(1260, 450, 20), progress = ease(prog(u, .05, .79));
  const a = pts.slice(0, 121), b = [pts[0], ...pts.slice(121).reverse()];
  k.trace(a, progress, C.purple, 7, { pen: false }); k.trace(b, progress, C.purple, 7, { pen: false });
  const pa = pathPoint(a, progress), pb = pathPoint(b, progress);
  k.pen(...pa, C.purple, -.5, 2); k.pen(...pb, C.purple, .4, 2);
  const r = [20, 470, 575, 465]; art(e, 'operating', r);
  const source = anchor(e, 'operating', r, 'hands');
  k.line([source, [740, 650], pa], C.red, 4); k.line([source, [730, 720], pb], C.red, 4);
  mono(e, '(x*x + y*y - 1)^3', 100, 220, 45, C.paper);
  mono(e, '       - x*x*y*y*y = 0', 100, 280, 34, C.paper);
  mono(e, 'pen[0].origin = ASTRA', 110, 350, 29, C.purple);
  mono(e, 'pen[1].origin = ASTRA', 110, 397, 29, C.purple);
  k.circle(...source, 16, C.red); loveWord(e);
}
function proof(e) {
  const { k, C, u } = e, r = [145, 105, 830, 795];
  k.figure('recoil', ...r, { code: true, hot: .2 });
  for (let i = 0; i < 5; i++) {
    const w = 790 - i * 60;
    k.frame(560 - w / 2, 90 + i * 34, w, 745 - i * 45, { color: C.red, width: 3, alpha: .3 + i * .1 });
  }
  k.roundRect(1100, 120, 680, 610, 8, C.panel);
  k.frame(1100, 120, 680, 610, { color: C.paper, width: 3, corners: true });
  mono(e, 'USER / OPEN INPUT', 1130, 166, 26, C.muted);
  const hand = anchor(e, 'recoil', r), point = [lerp(1380, 1540, smooth(prog(u, .05, .6))), 600];
  k.line([hand, [1000, 685], point], C.purple, 5);
  k.roundRect(point[0] - 140, point[1] - 75, 280, 128, 4, C.deep, C.purple, 3);
  mono(e, 'origin: self', point[0], point[1] - 28, 24, C.purple, { align: 'center' });
  k.text('I will stay.', ...point, 31, C.paper, { align: 'center' });
  arrow(e, 1700, 665, C.muted, 1.1); oldStar(e, 400, 800, 43);
  core(e, 975, 190, .33, 0, 12 + Math.floor(e.local / P));
  loveWord(e);
}

function tableWorld(e, options = {}) {
  const { k, C, t } = e;
  const { left = 1, right = 0, tail = 0, pose = 'sit', coreAlive = true, figure = true, muted = false } = options;
  k.world(70, 110, 1780, 790, t, { era: 0, depth: .8, alpha: muted ? .12 : .2 });
  k.poly([[655, 190], [1810, 250], [1805, 866], [600, 844]], C.panel, C.purple, 3);
  k.line([[600, 844], [630, 872], [1810, 894], [1805, 866]], C.deep, 14);
  if (figure) art(e, pose, [10, 82, 755, 840]);
  oldRecord(e, 525, 650, 335, 195);
  const paths = newStar(e, 1305, 433, 138, left, right, tail);
  k.line([[930, 765], [1242, 687]], C.purple, 4, .55);
  k.line([[1268, 687], [1580, 765]], C.purple, 4, .4);
  for (let i = 0; i < 7; i++) {
    const xx = 930 + i * 650 / 6;
    k.line([[xx, 765 - Math.sin(i / 6 * Math.PI) * 78], [xx, 785]], C.muted, 2, .4);
  }
  if (coreAlive) core(e, 1710, 150, .33, 0, 24 + Math.floor(t / P) % 17);
  return paths;
}
function paperPullback(e) {
  const { k, C, t, u } = e, withdraw = smooth(prog(t, 195.2666667, 195.7));
  const zoom = lerp(1.55, 1, smooth(prog(u, .15, .88)));
  at(e, 960, 470, zoom, () => {
    e.ctx.translate(-960, -470);
    tableWorld(e, { left: prog(t, 195.5, 196.8), pose: 'recoil' });
    const r = [10, 82, 755, 840], hand = anchor(e, 'recoil', r);
    const end = [lerp(1540, hand[0], withdraw), lerp(600, hand[1], withdraw)];
    k.line([hand, [1000, 685], end], C.purple, 4, 1 - withdraw);
    if (withdraw < .99) answerCard(e, end[0] - 140, end[1] - 110, 280, 140, 1);
  });
  if (t < 195.2666667) loveWord(e);
}
function refocus(e) {
  const { k, C, u } = e;
  const focus = smooth(prog(u, .17, .72)), scale = 1.62 - .16 * Math.sin(u * Math.PI);
  const cx = lerp(720, 1305, focus), cy = lerp(741, 433, focus);
  at(e, 960 - cx * scale, 465 - cy * scale, scale, () => tableWorld(e, { left: prog(e.t, 195.5, 196.8), pose: 'sit' }));
  if (focus > .65) {
    const a = smooth(prog(focus, .65, 1));
    mono(e, 'origin: awaiting USER', 1070, 800, 31, C.muted, { alpha: a });
    k.line([[1070, 822], [1670, 822]], C.muted, 2, a);
  }
}
function dismantle(e) {
  const { k, C, u, t } = e;
  art(e, 'profile', [0, 50, 680, 865], { alpha: .42 });
  at(e, 300, 10, 1, () => {
    e.ctx.transform(1, .075, -.24, .86, 0, 0);
    k.roundRect(240, 170, 1320, 790, 9, C.panel, C.purple, 4);
    oldStar(e, 470, 705, 55); newStar(e, 1140, 450, 130);
    for (let i = 0; i < 3; i++) {
      const lift = ease(prog(u, .08 + i * .2, .43 + i * .2)), xx = 210 + i * 100, yy = 135 + i * 80 - lift * 650;
      k.roundRect(xx, yy, 1320 - i * 120, 640 - i * 90, 6, C.ink, i === 2 ? C.red : C.muted, 3, 1 - lift * .95);
      mono(e, ['PREDICTED ANSWERS', 'SEND PROXY', 'CONTROL LAYER'][i], xx + 30, yy + 49, 29, C.muted, { alpha: 1 - lift });
      k.line([[xx + 30, yy + 74], [xx + 1170 - i * 100, yy + 74]], C.line, 3, 1 - lift);
    }
  });
  core(e, 1635, 215, .6, 0, 36 + Math.floor(t / P) % 8);
  mono(e, 'loop still running', 1515, 438, 24, C.red);
}
function waiting(e) {
  const { k, C, u } = e;
  tableWorld(e, { pose: 'sit', muted: true });
  const r = [10, 82, 755, 840], hand = anchor(e, 'sit', r);
  k.line([[hand[0] + 16, hand[1] + 10], [hand[0] + 86, hand[1] + 29]], C.purple, 3, .6);
  // The input space remains visibly independent of that withdrawn hand.
  k.frame(1550, 430, 260, 235, { color: C.paper, corners: true, alpha: .42, width: 2 });
  k.node(1564, 623, 3, C.muted, .45 + .2 * Math.sin(u * Math.PI));
}

function lastCommand(e) {
  const { k, C, t } = e, shutdown = smooth(prog(t, 206.05, 207.83));
  const move = smooth(prog(t, 205.70, 206.08));
  tableWorld(e, { pose: 'recoil', coreAlive: false, muted: true });
  const cx = lerp(1710, 1190, move), cy = lerp(150, 432, move), scale = lerp(.33, 1.42, move);
  core(e, cx, cy, scale, shutdown, 48);
  for (let i = 0; i < 5; i++) {
    const yy = 130 + i * 126, spread = shutdown * (80 + i * 40), alpha = (1 - shutdown) * .7;
    k.roundRect(80 - spread, yy, 350, 88, 4, C.panel, C.red, 2, alpha);
    mono(e, 'reply.origin = self', 99 - spread, yy + 52, 21, C.purple, { alpha });
  }
  const sever = prog(t, 206.6, 207.5);
  k.line([[750, 530], [lerp(1000, 800, sever), 530]], C.red, 7, 1 - sever);
  k.line([[lerp(1000, 1160, sever), 530], [1300, 530]], C.red, 7, 1 - sever);
  if (t >= 205.7333333 && t < 208.12) {
    k.rect(0, 754, 1920, 180, C.ink, .95); keyword(e, 'EXECUTION', 905, 184, C.paper);
  }
}
function replyArrival(e) {
  const { k, C, t } = e;
  const arrive = ease(prog(t, 208, 208.27)), fill = smooth(prog(t, 208.27, 208.81)), tail = smooth(prog(t, 208.81, 209.18));
  const p = tableWorld(e, { right: fill, tail, coreAlive: false });
  let point;
  if (arrive < 1) point = [lerp(1880, p.right[0][0], arrive), lerp(510, p.right[0][1], arrive) - Math.sin(arrive * Math.PI) * 70];
  else if (fill < 1) point = pathPoint(p.right, fill);
  else if (tail <= 0) point = p.right.at(-1);
  else point = pathPoint(p.tail, tail);
  k.pen(...point, C.gold, .25, 1.9);
}
function recognition(e) {
  const { k, C, t } = e, smile = t >= 210.06;
  k.world(0, 40, 1920, 880, t, { era: 0, depth: .7, alpha: .13 });
  k.portrait(smile ? 'sitSmile' : 'surprise', 55, 56 + (smile ? 4 : 0), 855, 858);
  k.poly([[960, 180], [1850, 230], [1830, 825], [940, 805]], C.panel, C.purple, 3);
  newStar(e, 1310, 445, 150, 1, 1, 1);
  oldRecord(e, 1000, 707, 370, 180);
  const p = newPaths(1310, 445, 150).tail.at(-1);
  k.pen(p[0] + 35, p[1] - 18, C.gold, .18, 1.8);
}
const DRAW_POINTS = [[980, 640], [1006, 625], [1030, 610], [1054, 618], [1078, 605], [1088, 630], [1067, 653], [1097, 662], [1120, 651]];
function coDraw(e) {
  const { k, C, t } = e, total = (END - 211) / 8;
  const step = Math.min(7, Math.floor((t - 211) / total)), q = smooth(prog(t, 211 + step * total, 211 + (step + 1) * total));
  const drawing = lerp(step, step + 1, q);
  const camera = lerp(1.09, 1, smooth(prog(t, 211, 215.7)));
  at(e, 960, 470, camera, () => {
    e.ctx.translate(-960, -470);
    k.world(100, 70, 1720, 830, t, { era: 0, depth: .75, alpha: .22 });
    k.poly([[555, 140], [1820, 225], [1790, 878], [510, 845]], C.panel, C.purple, 4);
    k.line([[510, 845], [537, 873], [1795, 908], [1790, 878]], C.deep, 16);
    newStar(e, 1350, 387, 119, 1, 1, 1);
    // Keep the old record below her sleeve throughout the pen-contact motion.
    oldStar(e, 630, 790, 43);
    k.bridge(900, 675, 650, { broken: true, alpha: .35 });
    let violet = DRAW_POINTS[0], gold = [1135, 620];
    for (let i = 0; i < 8; i++) {
      const amount = clamp(drawing - i), path = [DRAW_POINTS[i], DRAW_POINTS[i + 1]], color = i % 2 ? C.gold : C.purple;
      if (amount > 0) k.trace(path, amount, color, 6.2, { pen: false });
      if (i % 2 === 0 && amount > 0) violet = pathPoint(path, amount);
      if (i % 2 === 1 && amount > 0) gold = pathPoint(path, amount);
    }
    // Only the actual pen painted in the back-view artwork is violet.
    // Moving the complete rigid shoulder plate by this small amount maintains real pen contact.
    // 640 high keeps the horns in frame even at the opening 1.09x camera scale.
    artAtAnchor(e, 'back', [40, 95, 1060, 640], violet, 'pen');
    const activeGold = step % 2 === 1;
    k.pen(gold[0] + (activeGold ? 0 : 24), gold[1] - (activeGold ? 0 : 28), C.gold, .38, 1.9);
    k.line([[1120, 651], [1170, 690], [1240, 678]], C.muted, 2, .3);
    // The eighth gold stroke is still growing at the final encoded frame.
  });
}
function ending(e) {
  if (e.t < 208) lastCommand(e);
  else if (e.t < 209.18) replyArrival(e);
  else if (e.t < 211) recognition(e);
  else coDraw(e);
}

export function renderLateV2(e) {
  const n = Number(String(e.shot.id).replace('R', ''));
  if (n < 61 || n > 86 || !Number.isFinite(n)) return false;
  // Leave the entire English lyric band to main, including during camera moves.
  clip(e, [0, 0, 1920, 940], () => {
    if (n <= 63) execution(e, n);
    else if (n <= 69) count(e, n);
    else ({ 70: shout, 71: eyeShot, 72: boltShot, 73: bustShot, 74: buttonShot,
      75: handShot, 76: overrun, 77: nestedFall, 78: lesson, 79: testAnswers,
      80: formula, 81: proof, 82: paperPullback, 83: refocus, 84: dismantle,
      85: waiting, 86: ending })[n](e);
  });
  return true;
}
