// These are the original, computed teaching models, not a claim about GPT internals.
import { fcForward, cnnForward, rnnForward } from '../mv52final/neural.js';

export function createNeuralWorld({ THREE, palette, makeText, makeLine }) {
  const group = new THREE.Group(); group.name = 'computed-memory-world';
  // The network occupies the original story compositor's wide central strip.
  // Text and node discs retain their own aspect while layer spacing contracts.
  const verticalSpacing = .9;
  group.scale.y = verticalSpacing; group.position.y = .2;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const fmt = n => Math.abs(n) < .0005 ? '0.00' : n.toFixed(2);
  const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const basic = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  const dark = basic(palette.ink), panelInk = basic(0x201b2b), darkSide = basic(0x14121c);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const boxEdgeGeometry = new THREE.EdgesGeometry(boxGeometry);
  const thinEdge = new THREE.LineBasicMaterial({ color: palette.purple, transparent: true, opacity: .56 });
  const paleEdge = new THREE.LineBasicMaterial({ color: palette.pale, transparent: true, opacity: .96 });
  const pulseMaterial = basic(palette.pale);
  const pointGeometry = new THREE.SphereGeometry(.045, 8, 6);
  const tubeGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
  const discGeometry = new THREE.CircleGeometry(.205, 32);
  const ringGeometry = new THREE.RingGeometry(.22, .235, 32);
  const models = {};
  const audit = { scope: 'computed educational toy model; not GPT architecture', independentReply: false, predictedOutput: true, source: 'FIRST MARK / MEMORY', result: 'PREDICTED / NOT RECEIVED', text: 'I will stay.', returnOrigin: 'SAME RECORD' };
  function plate(parent, w, h, x, y, z, opacity = 1) {
    const p = new THREE.Mesh(boxGeometry, opacity < 1 ? basic(0x201b2b, opacity) : [darkSide, darkSide, panelInk, darkSide, panelInk, darkSide]);
    p.position.set(x, y, z); p.scale.set(w, h, .075);
    p.add(new THREE.LineSegments(boxEdgeGeometry, thinEdge)); parent.add(p); return p;
  }
  function label(parent, text, w, h, x, y, z, color = palette.pale) {
    // Ask the shared raster helper for a proportional canvas above its minimum
    // dimensions, then reduce the plane; small labels keep natural letter shapes.
    const height = h * 1.38;
    const quality = Math.max(1, 256 / (w * 180), 128 / (height * 180));
    const m = makeText(text, { width: w * quality, height: height * quality, color: hex(color), fontSize: 58, align: 'center' });
    m.scale.set(1 / quality, 1 / (quality * verticalSpacing), 1);
    m.userData.neuralLabel = true;
    m.position.set(x, y, z); parent.add(m); return m;
  }
  function line(parent, points, color = palette.purple, opacity = .4) {
    const l = makeLine(points, color, opacity); parent.add(l); return l;
  }
  function rectangle(parent, w, h, x, y, z, material = thinEdge) {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, .045));
    const l = new THREE.LineSegments(geo, material); l.position.set(x, y, z); parent.add(l); return l;
  }
  function panel(parent, w, h, position, title) {
    const g = new THREE.Group(); g.position.copy(position); parent.add(g);
    plate(g, w, h, 0, 0, -.04);
    rectangle(g, w, h, 0, 0, -.34);
    for (const xx of [-w / 2, w / 2]) for (const yy of [-h / 2, h / 2]) {
      line(g, [vec(xx, yy, -.34), vec(xx, yy, .025)], palette.purple, .36);
    }
    label(g, title, w * .87, .25, 0, h / 2 - .32, .075, palette.purple);
    line(g, [vec(-w / 2 + .15, h / 2 - .55, .065), vec(w / 2 - .15, h / 2 - .55, .065)], palette.purple, .4);
    for (let j = 0; j < 6; j++) {
      const yy = -h / 2 + .3 + j * (h - 1) / 5;
      line(g, [vec(-w / 2, yy, .05), vec(-w / 2 + .10, yy, .05)], palette.pale, .38);
    }
    return g;
  }
  function point(parent, at) {
    const p = new THREE.Mesh(pointGeometry, pulseMaterial); p.position.copy(at); parent.add(p); return p;
  }
  function tube(parent, a, b, weight) {
    const mat = basic(weight < 0 ? palette.muted : palette.purple, .14);
    const m = new THREE.Mesh(tubeGeometry, mat), d = b.clone().sub(a);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(vec(0, 1, 0), d.clone().normalize());
    const radius = .008 + Math.abs(weight) * .012;
    m.scale.set(radius, d.length(), radius); parent.add(m);
    return m;
  }
  function dynamicLine(parent, points, color = palette.pale, opacity = .7) {
    const l = line(parent, points, color, opacity);
    return { line: l, set(p) { const attr = l.geometry.attributes.position; p.forEach((q, i) => attr.setXYZ(i, q.x, q.y, q.z)); attr.needsUpdate = true; l.geometry.computeBoundingSphere(); } };
  }

  // FC: four separate thin slabs, 52 actual weighted connections, actual tanh values.
  {
    const g = new THREE.Group(); group.add(g);
    const data = fcForward(), positions = [], nodes = [], edges = [];
    const xs = [-5.65, -1.88, 1.88, 5.65];
    data.layers.forEach((values, l) => {
      const base = vec(xs[l], .45 + l * .075, -.78 * l);
      const p = panel(g, 2.12, 4.95, base, ['INPUT', 'HIDDEN 1', 'HIDDEN 2', 'OUTPUT'][l]);
      positions[l] = values.map((value, i) => {
        const y = .08 + (values.length - 1) * .78 / 2 - i * .78;
        const material = basic(palette.purple, .5);
        const disc = new THREE.Mesh(discGeometry, material); disc.position.set(0, y, .11); p.add(disc);
        const rim = new THREE.Mesh(ringGeometry, basic(palette.pale)); rim.position.set(0, y, .115); p.add(rim);
        disc.scale.y = rim.scale.y = 1 / verticalSpacing;
        const number = label(p, fmt(value), .83, .25, .61, y, .14);
        const waiting = label(p, '--', .83, .25, .61, y, .14, palette.muted);
        nodes.push({ disc, material, number, waiting, value, layer: l });
        return base.clone().add(vec(0, y, .14));
      });
    });
    for (let l = 0; l < 3; l++) for (let j = 0; j < data.layers[l + 1].length; j++) for (let i = 0; i < data.layers[l].length; i++) {
      const a = positions[l][i], b = positions[l + 1][j], weight = data.weights[l][j][i];
      edges.push({ a, b, weight, layer: l, mesh: tube(g, a, b, weight), pulse: point(g, a) });
    }
    const axis = line(g, [vec(-6.7, -2.3, .2), vec(6.8, -2.3, -1.6)], palette.purple, .25);
    models.fc = {
      group: g, input: positions[0][0].clone(), output: positions[3][2].clone(),
      update(p, energy) {
        const q = p * 3;
        for (const n of nodes) {
          const a = n.layer === 0 ? 1 : smooth(clamp(q - n.layer + 1));
          n.material.opacity = .13 + a * (.34 + .47 * Math.abs(n.value));
          n.material.color.set(q >= n.layer - .15 && q <= n.layer + .65 ? palette.pale : palette.purple);
          n.number.visible = a > .95; n.waiting.visible = !n.number.visible;
        }
        for (const e of edges) {
          const a = clamp(q - e.layer);
          const current = q > e.layer && q < e.layer + 1;
          e.mesh.material.opacity = (.16 + Math.abs(e.weight) * .47) * (current ? .94 + energy * .06 : .36 + a * .27);
          e.mesh.material.color.set(current ? (e.weight < 0 ? palette.purple : palette.pale) : (e.weight < 0 ? palette.muted : palette.purple));
          e.pulse.visible = q > e.layer && q < e.layer + 1;
          e.pulse.position.copy(e.a).lerp(e.b, smooth(a));
          e.pulse.scale.setScalar(1.08 + energy * .32);
        }
        return { type: 'fc', dimensions: [4, 5, 4, 3], connections: 52, layer: Math.min(2, Math.floor(q)), values: data.layers, preactivations: data.pre, weights: data.weights, biases: data.biases, weightEncoding: 'signed colour and radius/opacity proportional to absolute weight', completed: p >= .999 };
      }
    };
  }

  function matrixPanel(parent, values, position, cell, title, wExtra = .32) {
    const rows = values.length, cols = values[0].length;
    const w = cols * cell, h = rows * cell;
    const g = panel(parent, w + wExtra, h + .85, position, title);
    const tiles = [];
    values.forEach((row, r) => row.forEach((value, c) => {
      const x = (c - (cols - 1) / 2) * cell, y = ((rows - 1) / 2 - r) * cell - .16;
      const mat = basic(value < 0 ? palette.muted : palette.purple, .65);
      const tile = new THREE.Mesh(boxGeometry, mat); tile.scale.set(cell - .075, cell - .075, .065); tile.position.set(x, y, .085);
      tile.add(new THREE.LineSegments(boxEdgeGeometry, thinEdge)); g.add(tile);
      const text = label(g, String(value), cell * .8, cell * .45, x, y, .14);
      const waiting = label(g, '-', cell * .8, cell * .45, x, y, .14, palette.muted);
      tiles.push({ tile, mat, text, waiting, value, r, c, local: vec(x, y, .15) });
    }));
    return { group: g, tiles, rows, cols, cell, center(r, c) { return vec((c - (cols - 1) / 2) * cell, ((rows - 1) / 2 - r) * cell - .16, .18); }, world(r, c) { return this.center(r, c).add(position); } };
  }
  // CNN: an actual 5 x 5 x 3 memory volume and one shared 3 x 3 x 3
  // cross-correlation kernel (the convention used by CNN convolution layers).
  // The depth samples come from the same FIRST MARK; no outside reply is added.
  {
    const g = new THREE.Group(); group.add(g);
    const legacy = cnnForward('star'), depthGains = [.5, 1, .75], kernelGains = [.5, 1, .5], depthOffsets = [-1, 0, 1];
    const input3D = depthGains.map((gain, z) => legacy.input.map(row => row.map((v, x) => (row[x + depthOffsets[z]] ?? 0) * gain)));
    const kernel3D = kernelGains.map(gain => legacy.kernel.map(row => row.map(v => v * gain)));
    const convolution3D = [Array.from({ length: 3 }, (_, y) => Array.from({ length: 3 }, (_, x) => {
      let sum = 0;
      for (let z = 0; z < 3; z++) for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) sum += input3D[z][y + ky][x + kx] * kernel3D[z][ky][kx];
      return sum;
    }))];
    const relu3D = convolution3D.map(layer => layer.map(row => row.map(v => Math.max(0, v))));
    const pool3D = [Array.from({ length: 2 }, (_, y) => Array.from({ length: 2 }, (_, x) => Math.max(relu3D[0][y][x], relu3D[0][y + 1][x], relu3D[0][y][x + 1], relu3D[0][y + 1][x + 1])))];
    const volume = new THREE.Group(); volume.position.set(-3.45, .45, -.1); volume.rotation.set(.13, -.43, 0); g.add(volume);
    const cell = .83, voxels = [], shell = new THREE.Group(); volume.add(shell);
    function volumeOutline(parent, w, h, d, material = thinEdge) {
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), material); parent.add(frame); return frame;
    }
    const space = (x, y, z) => vec((x - 2) * cell, (2 - y) * cell, (1 - z) * cell);
    const world = v => v.clone().applyEuler(volume.rotation).add(volume.position);
    const inputAnchor = world(space(0, 2, 1));
    volumeOutline(volume, 5 * cell, 5 * cell, 3 * cell, paleEdge);
    for (let z = 0; z < 3; z++) for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const value = input3D[z][y][x], pos = space(x, y, z);
      const edgeMat = new THREE.LineBasicMaterial({ color: palette.purple, opacity: .16, transparent: true, depthWrite: false });
      const frame = volumeOutline(shell, cell * .9, cell * .9, cell * .9, edgeMat); frame.position.copy(pos);
      const mat = basic(palette.purple, .2); mat.depthWrite = false;
      const block = new THREE.Mesh(boxGeometry, mat); block.scale.setScalar(cell * .46); block.position.copy(pos); block.visible = value !== 0; volume.add(block);
      voxels.push({ z, y, x, value, pos, frame, edgeMat, block, mat });
    }
    const kernelFrameMat = new THREE.LineBasicMaterial({ color: palette.pale, opacity: 1, transparent: true, depthWrite: false });
    const kernelFrame = volumeOutline(volume, 3 * cell + .05, 3 * cell + .05, 3 * cell + .05, kernelFrameMat);
    // Depth rulers are attached to the volume, not a flat diagram behind it.
    for (let z = 0; z < 3; z++) {
      const at = space(0, 4, z).add(vec(-.62, -.24, 0));
      label(volume, 'd' + z, .6, .24, at.x, at.y, at.z, palette.purple);
    }
    label(g, 'MEMORY 5 x 5 x 3', 4.9, .33, -3.45, 3.03, -.15);
    label(g, 'SHARED KERNEL 3 x 3 x 3', 5.2, .29, -3.35, -2.47, .3, palette.purple);
    line(volume, [vec(-2.36, -2.35, 1.3), vec(1.9, -2.35, 1.3)], palette.purple, .65);
    line(volume, [vec(-2.36, -2.35, 1.3), vec(-2.36, 1.9, 1.3)], palette.purple, .65);
    line(volume, [vec(-2.36, -2.35, 1.3), vec(-2.36, -2.35, -1.35)], palette.pale, .65);
    label(volume, 'x', .3, .25, 2.08, -2.35, 1.3);
    label(volume, 'y', .3, .25, -2.36, 2.1, 1.3);
    label(volume, 'depth', 1.05, .24, -2.36, -2.35, -1.68);
    function outputVolume(values, base, spacing, title) {
      const v = new THREE.Group(); v.position.copy(base); g.add(v); const rows = values.length, cols = values[0].length, entries = [];
      volumeOutline(v, cols * spacing + .14, rows * spacing + .14, .52, thinEdge);
      label(v, title, cols * spacing + .55, .29, 0, rows * spacing / 2 + .48, .2, palette.purple);
      values.forEach((row, y) => row.forEach((value, x) => {
        const pos = vec((x - (cols - 1) / 2) * spacing, ((rows - 1) / 2 - y) * spacing, .02);
        const mat = basic(palette.purple, .06); mat.depthWrite = false;
        const cube = new THREE.Mesh(boxGeometry, mat); cube.position.copy(pos); cube.scale.set(spacing * .83, spacing * .83, .38); v.add(cube);
        const edge = volumeOutline(v, spacing * .87, spacing * .87, .42, thinEdge); edge.position.copy(pos);
        const text = label(v, fmt(value), spacing * .82, .31, pos.x, pos.y, .28);
        const zero = label(v, '0.00', spacing * .82, .31, pos.x, pos.y, .28);
        const waiting = label(v, '--', spacing * .82, .31, pos.x, pos.y, .28, palette.muted);
        entries.push({ value, cube, mat, text, zero, waiting, pos: pos.clone().add(base) });
      }));
      return { group: v, entries };
    }
    const feature = outputVolume(convolution3D[0], vec(1.7, .5, -1.1), .87, 'FEATURE 3 x 3 x 1');
    const pool = outputVolume(pool3D[0], vec(5.25, .5, -1.65), .91, 'POOL 2 x 2 x 1');
    const streams = Array.from({ length: 3 }, () => ({ route: dynamicLine(g, [vec(), vec(), vec()], palette.purple, .62), pulse: point(g, vec()) }));
    const poolRoute = dynamicLine(g, [vec(), vec(), vec()], palette.pale, .8), poolPulse = point(g, vec());
    const selected = volumeOutline(g, .84, .84, .47, paleEdge);
    models.cnn = {
      group: g, input: inputAnchor, output: pool.entries[3].pos.clone(),
      update(p, energy) {
        const scan = clamp(p / .72) * 9, idx = Math.min(8, Math.floor(scan)), row = Math.floor(idx / 3), col = idx % 3;
        const fraction = scan >= 9 ? 1 : scan % 1;
        const isRelu = p >= .76, shown = Math.min(9, Math.floor(scan) + (fraction > .8 ? 1 : 0));
        const pooled = p < .84 ? 0 : Math.min(4, Math.floor((p - .84) / .16 * 4) + 1);
        const sample = [], selectedCenter = space(col + 1, row + 1, 1);
        kernelFrame.position.copy(selectedCenter); kernelFrame.visible = p < .76;
        kernelFrameMat.opacity = .75 + energy * .25;
        for (const v of voxels) {
          const active = v.y >= row && v.y < row + 3 && v.x >= col && v.x < col + 3 && p < .76;
          const weight = active ? kernel3D[v.z][v.y - row][v.x - col] : 0;
          v.edgeMat.opacity = active ? .53 + energy * .3 : .105;
          v.edgeMat.color.set(active ? palette.pale : palette.purple);
          v.mat.opacity = active ? .48 + v.value * .3 + energy * .12 : .11 + v.value * .19;
          v.mat.color.set(active && weight > 0 ? palette.pale : palette.purple);
          v.block.scale.setScalar(cell * (active ? .47 + energy * .045 : .40));
          if (active) sample.push({ index: [v.z, v.y, v.x], input: v.value, weight, product: v.value * weight });
        }
        feature.entries.forEach((v, i) => {
          const visible = i < shown, current = i === idx && !isRelu;
          v.text.visible = visible && !(isRelu && v.value < 0); v.zero.visible = visible && isRelu && v.value < 0; v.waiting.visible = !visible;
          v.mat.color.set(current ? palette.pale : v.value < 0 && !isRelu ? palette.muted : palette.purple);
          v.mat.opacity = visible ? .22 + Math.min(1, Math.abs(isRelu ? Math.max(0, v.value) : v.value) / 4.875) * .53 : current ? .08 + fraction * .27 : .035;
        });
        pool.entries.forEach((v, i) => { v.text.visible = i < pooled; v.zero.visible = false; v.waiting.visible = !v.text.visible; v.mat.opacity = i < pooled ? .64 : .035; });
        const target = feature.entries[idx].pos.clone(); target.z += .29;
        selected.position.copy(target); selected.visible = p < .76;
        for (let z = 0; z < 3; z++) {
          const start = world(space(col + 1, row + 1, z));
          const bend = vec(-.10, start.y, -.1 - z * .3), stream = streams[z];
          stream.route.set([start, bend, target]); stream.route.line.visible = p < .76;
          stream.route.line.material.opacity = .35 + energy * .35;
          stream.pulse.visible = p < .72; const f = (fraction + z / 6) % 1;
          stream.pulse.position.copy(f < .5 ? start : bend).lerp(f < .5 ? bend : target, (f % .5) * 2);
          stream.pulse.scale.setScalar(1.1 + energy * .45);
        }
        const poolIndex = Math.max(0, pooled - 1), py = Math.floor(poolIndex / 2), px = poolIndex % 2;
        const a = feature.entries[py * 3 + px].pos, b = pool.entries[poolIndex].pos;
        poolRoute.set([a, vec(3.6, .5, -.9), b]); poolRoute.line.visible = p >= .76;
        poolPulse.visible = p >= .84 && p < 1; poolPulse.position.copy(a).lerp(b, smooth(((p - .84) / .16 * 4) % 1));
        return { type: 'cnn', kind: 'conv3d', dimensionality: 3, pattern: 'same star memory with authored shifted depth samples', tensorOrder: 'depth / y / x', axisOrderForSizes: 'x / y / depth', input: input3D, kernel: kernel3D, convolution: convolution3D, relu: relu3D, pool: pool3D,
          input3D, kernel3D, convolution3D, relu3D, pool3D, legacy2D: legacy, depthGains, depthOffsets, depthSampling: 'X[z,y,x] = gain[z] * FIRST_MARK[y,x+offset[z]], zero outside; authored memory volume, not measured physical depth', kernelDepthGains: kernelGains,
          inputSize: [5, 5, 3], kernelSize: [3, 3, 3], outputSize: [3, 3, 1], poolSize: [2, 2, 1], poolWindow: [2, 2, 1], stride: 1, padding: 0, poolStride: 1,
          scanIndex: idx, patch: [0, row, col], activeSampleCount: p < .76 ? 27 : 0, sampledTerms: sample, currentDotProduct: convolution3D[0][row][col], phase: p < .76 ? 'convolution3d' : p < .84 ? 'relu' : 'pool',
          operator: 'CNN cross-correlation: no kernel reversal', formula: 'Y[z,y,x] = sum(K[dz,dy,dx] * X[z+dz,y+dy,x+dx])', sharedKernel: true, completed: p >= .999 };
      }
    };
  }

  // RNN: three time slices of the same recurrence, with a single shared rail.
  {
    const g = new THREE.Group(); g.scale.y = 1.04; group.add(g); const steps = rnnForward(), units = [], links = [];
    const bases = [vec(-4.65, .55, .15), vec(0, .65, -.8), vec(4.65, .75, -1.75)];
    steps.forEach((s, i) => {
      const p = panel(g, 3.38, 4.5, bases[i], 't = ' + (i + 1));
      label(p, 'x = [' + s.x.map(fmt).join(', ') + ']', 2.85, .29, 0, 1.24, .12, i === 2 ? palette.muted : palette.pale);
      rectangle(p, 2.82, .58, 0, 1.24, .07);
      line(p, [vec(0, .92, .1), vec(0, .45, .1)], palette.purple, .65);
      const node = plate(p, 2.82, 1.58, 0, -.38, .04);
      label(p, 'tanh', 1.4, .31, 0, .07, .13);
      const number = label(p, '[' + s.h.map(fmt).join(', ') + ']', 2.6, .36, 0, -.63, .15);
      const waiting = label(p, '[ -- , -- ]', 2.6, .36, 0, -.63, .15, palette.muted);
      const inputPulse = point(p, vec(0, .92, .17));
      const stateBars = [];
      s.h.forEach((value, j) => {
        const m = new THREE.Mesh(boxGeometry, basic(palette.purple, .7));
        m.position.set(-.9, -1.52 - j * .20, .12); m.scale.set(.02, .075, .06); p.add(m); stateBars.push({ m, value });
      });
      label(p, 'h' + (i + 1), .4, .25, 1.16, -1.58, .13, palette.purple);
      units.push({ p, node, number, waiting, inputPulse, stateBars, i });
      if (i < 2) {
        const a = bases[i].clone().add(vec(1.73, -.4, .15));
        const b = bases[i + 1].clone().add(vec(-1.73, -.4, .15));
        const carrier = tube(g, a, b, .85), pulse = point(g, a);
        label(g, 'h(t)', .7, .24, (a.x + b.x) / 2, (a.y + b.y) / 2 + .35, (a.z + b.z) / 2, palette.purple);
        links.push({ a, b, carrier, pulse, i });
      }
    });
    const shared = [vec(-5.4, 3.15, -2.3), vec(5.4, 3.15, -2.3)];
    line(g, shared, palette.purple, .5);
    label(g, 'SAME W_x / W_h / b', 4.1, .25, 0, -2.17, -2.3, palette.purple);
    for (const b of bases) line(g, [vec(b.x, 3.15, -2.3), b.clone().add(vec(0, 2.25, 0))], palette.purple, .34);
    models.rnn = {
      group: g, input: bases[0].clone().add(vec(-1.73, -.4, .15)), output: bases[2].clone().add(vec(1.73, -.4, .15)),
      update(p, energy) {
        const q = p * 3;
        for (const n of units) {
          const a = smooth(clamp(q - n.i));
          n.number.visible = a > .98; n.waiting.visible = !n.number.visible;
          n.inputPulse.visible = q > n.i && q < n.i + .5;
          n.inputPulse.position.y = .92 - .47 * smooth(clamp((q - n.i) * 2));
          n.inputPulse.scale.setScalar(1.1 + energy * .3);
          for (const s of n.stateBars) { const width = Math.max(.012, Math.abs(s.value) * a * 2.1); s.m.scale.x = width; s.m.position.x = -.95 + width / 2; }
        }
        for (const l of links) {
          const a = clamp(q - l.i - .25);
          l.carrier.material.opacity = .18 + smooth(clamp(q - l.i)) * .67;
          l.carrier.material.color.set(a > 0 && a < 1 ? palette.pale : palette.purple);
          l.pulse.visible = a > 0 && a < 1; l.pulse.position.copy(l.a).lerp(l.b, smooth(a));
        }
        return { type: 'rnn', activeStep: Math.min(2, Math.floor(q)), steps, sharedWeights: true, initialState: [0, 0], zeroInputRetainsState: steps[2].h.some(n => Math.abs(n) > .001), completed: p >= .999 };
      }
    };
  }

  // Local spacing may expand independently, but labels preserve their aspect.
  for (const model of Object.values(models)) model.group.traverse(o => {
    if (o.userData.neuralLabel) o.scale.y /= model.group.scale.y;
  });

  // INITIALIZATION alone: the network's last output builds the first small world.
  const initializationWorld = new THREE.Group(); group.add(initializationWorld);
  const worldBase = vec(6.05, -2.55, -2.25), growingColumns = [];
  for (let i = 0; i < 3; i++) {
    const column = new THREE.Mesh(boxGeometry, panelInk);
    column.add(new THREE.LineSegments(boxEdgeGeometry, paleEdge));
    initializationWorld.add(column);
    growingColumns.push({ column, x: 5.35 + i * .62, z: -2.1 - i * .18, height: [.38, .78, 1.18][i] });
  }
  for (let i = 0; i < 4; i++) {
    const x = 5.02 + i * .64;
    line(initializationWorld, [vec(x, -2.57, -2.85), vec(x, -2.57, -1.65)], palette.purple, .65);
  }
  for (const z of [-2.85, -2.25, -1.65]) line(initializationWorld, [vec(5.02, -2.57, z), vec(6.94, -2.57, z)], palette.purple, .65);
  line(initializationWorld, [models.fc.output.clone(), vec(6.05, -.1, -2.25), worldBase], palette.pale, .78);

  function shotNumber(e) {
    if (typeof e.shot === 'number') return e.shot;
    const s = typeof e.shot === 'string' ? e.shot : e.shot?.id ?? e.shot?.name ?? e.shot?.n ?? '';
    const match = String(s).match(/(\d+)/); return match ? Number(match[1]) : 78;
  }
  function update(e, camera, energy = 0) {
    const n = shotNumber(e), type = n === 79 ? 'cnn' : n === 80 ? 'rnn' : 'fc';
    const u = clamp(Number.isFinite(e.u) ? e.u : (e.local || 0) / (e.duration || 1));
    const initialization = n === 3;
    const worldGrowth = initialization ? smooth((u - .72) / .28) : 0;
    initializationWorld.visible = worldGrowth > .001;
    for (const c of growingColumns) {
      const height = Math.max(.006, c.height * worldGrowth);
      c.column.scale.set(.43, height, .43); c.column.position.set(c.x, -2.55 + height / 2, c.z);
    }
    const completion = type === 'cnn' ? .95 : .83;
    const p = initialization ? smooth((u - .06) / .9) : smooth((u - .02) / (completion - .02));
    const audio = clamp(typeof energy === 'number' ? energy : Math.max(energy?.pulse || 0, (energy?.kick || 0) * .85));
    for (const [key, m] of Object.entries(models)) m.group.visible = key === type;
    const model = models[type], state = model.update(p, audio);
    const arc = smooth(u);
    camera.position.set(1.8 + arc * 1.45, 1.62 + arc * .48, 13.65 - arc * .25);
    camera.lookAt(-.55, .30, -.8);
    camera.fov = 36; camera.near = .06; camera.far = 100;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    group.updateMatrixWorld(true);
    const sourceWorld = model.input.clone().applyMatrix4(model.group.matrixWorld), targetWorld = model.output.clone().applyMatrix4(model.group.matrixWorld);
    const source = sourceWorld.clone().project(camera), target = targetWorld.clone().project(camera);
    const grownWorld = worldBase.clone().applyMatrix4(group.matrixWorld), grownNDC = grownWorld.clone().project(camera);
    for (const key of Object.keys(audit)) delete audit[key];
    Object.assign(audit, state, {
      scope: 'computed educational toy model; not GPT architecture',
      shot: n, progress: p, shotProgress: u, trueSpatialLayers: true, audioModulation: audio,
      materialModel: 'unlit paper-dark slabs, thin purple/paper-white geometry; no PBR',
      source: initialization ? 'INITIAL PARAMETERS' : 'FIRST MARK / MEMORY', predictedOutput: !initialization, independentReply: false,
      outputText: initialization ? null : 'I will stay.', outputClassification: initialization ? 'WORLD' : 'PREDICTED / NOT RECEIVED',
      returnedToSameRecord: !initialization && p >= .88, origin: initialization ? 'INITIALIZATION' : 'SAME RECORD',
      initialization, worldGrowth,
      anchors: { inputWorld: sourceWorld.toArray(), outputWorld: targetWorld.toArray(), inputNDC: [source.x, source.y], outputNDC: [target.x, target.y], ...(initialization ? { worldGrowthWorld: grownWorld.toArray(), worldGrowthNDC: [grownNDC.x, grownNDC.y] } : {}) },
      captionOwnership: 'Root compositor keeps the original story source, output, return loop, title and formula captions.'
    });
  }
  return { group, update, audit };
}
