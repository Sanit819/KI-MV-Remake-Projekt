// The approved six count shots, rebuilt as real, externally viewed enclosures.
// No simulation state is integrated: every pose is a function of local time.
export function createContainment({ THREE, palette, makeText, makeLine, makeArt }) {
  const group = new THREE.Group();
  group.name = 'six-domain-containment';
  const duration = 2.68333333333333;
  const boundaries = [0, .416666667, .75, 1.35, 1.8, 2.216666667, duration];
  const domains = ['PRESENCE', 'HISTORY', 'PREDICTED REPLY', 'BOUNDARY', 'CONTROL', 'OUTPUT'];
  const directions = ['topdown', 'split', 'hinge-left', 'bottomup', 'diagonal-split', 'hinge-right'];
  const names = ['Gemini', 'GLM', 'DeepSeek', 'Claude', 'Qwen', 'Grok'];
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const progress = (u, a, b) => smooth((u - a) / (b - a));
  const vec = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const W = 8.6, H = 6.3, D = 3.7, frontZ = .16, cellX = 2.45;
  const cells = [];
  const audit = {
    time: 0, currentGuest: 'guest0', currentGuestName: names[0], currentIndex: 0,
    closure: 0, lock: 0, doorDirection: directions[0], frontOcclusion: 0,
    gateInFrontOfGuest: true, characterHeightFractionEstimate: 0,
    cameraOutside: true, source: 'mv52final/late.js lockCard guest0..guest5',
    materialModel: 'unlit flat faces and precision outlines; no PBR',
    boundaries: boundaries.slice(), sealedDomains: 0, previousSealed: []
  };
  // Face colours are explicit inks. They do not acquire shiny gradient shading.
  const ink = new THREE.MeshBasicMaterial({ color: palette.ink, side: THREE.DoubleSide });
  const face = new THREE.MeshBasicMaterial({ color: 0x25202f, side: THREE.DoubleSide });
  const side = new THREE.MeshBasicMaterial({ color: 0x1b1823, side: THREE.DoubleSide });
  const floor = new THREE.MeshBasicMaterial({ color: 0x201b2b, side: THREE.DoubleSide });
  const barFace = new THREE.MeshBasicMaterial({ color: 0x2d263c, side: THREE.DoubleSide });
  const red = new THREE.MeshBasicMaterial({ color: palette.red, side: THREE.DoubleSide });
  const faint = new THREE.LineBasicMaterial({ color: palette.purple, transparent: true, opacity: .30 });
  const edge = new THREE.LineBasicMaterial({ color: palette.purple, transparent: true, opacity: .80 });
  const paperEdge = new THREE.LineBasicMaterial({ color: palette.pale, transparent: true, opacity: .63 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const boxEdges = new THREE.EdgesGeometry(boxGeo);
  const boxMaterials = [side, side, face, ink, barFace, ink];
  function box(w, h, d, material = boxMaterials, outline = edge) {
    const mesh = new THREE.Mesh(boxGeo, material);
    mesh.scale.set(w, h, d);
    if (outline) mesh.add(new THREE.LineSegments(boxEdges, outline));
    return mesh;
  }
  function label(parent, s, width, height, x, y, z, color = palette.pale) {
    const mesh = makeText(s, { width, height, color: hex(color), fontSize: 46, align: 'left' });
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function line(parent, points, color = palette.purple, opacity = .3) {
    const l = makeLine(points, color, opacity); parent.add(l); return l;
  }
  function drawRect(parent, x0, y0, x1, y1, z, color, opacity) {
    return line(parent, [vec(x0, y0, z), vec(x1, y0, z), vec(x1, y1, z), vec(x0, y1, z), vec(x0, y0, z)], color, opacity);
  }
  function addGrid(parent, rect, cols, rows) {
    const [x0, y0, x1, y1] = rect, bars = [];
    for (let j = 0; j <= cols; j++) {
      const x = x0 + (x1 - x0) * j / cols;
      const m = box(.105, y1 - y0, .20, boxMaterials, paperEdge);
      parent.add(m); bars.push({ m, vertical: true, fixed: x, a: y0, b: y1, stroke: .105 });
    }
    for (let j = 0; j <= rows; j++) {
      const y = y0 + (y1 - y0) * j / rows;
      const m = box(x1 - x0, .105, .20, boxMaterials, paperEdge);
      parent.add(m); bars.push({ m, vertical: false, fixed: y, a: x0, b: x1, stroke: .105 });
    }
    return { parent, bars, rect };
  }
  // Sliding gates are physically clipped at the aperture: no offscreen grille
  // drifts across the large count word or the neighbour's safe area.
  function placeGrid(grid, dx, dy, clipped = true) {
    let area = 0, visibleBars = 0;
    for (const b of grid.bars) {
      const p = b.fixed + (b.vertical ? dx : dy);
      const min = b.vertical ? -H / 2 : -W / 2, max = b.vertical ? H / 2 : W / 2;
      const shift = b.vertical ? dy : dx;
      const a = clipped ? Math.max(min, b.a + shift) : b.a + shift;
      const z = clipped ? Math.min(max, b.b + shift) : b.b + shift;
      const limit = b.vertical ? W / 2 : H / 2;
      b.m.visible = z > a + .002 && (!clipped || Math.abs(p) <= limit + .002);
      if (!b.m.visible) continue;
      if (b.vertical) { b.m.scale.set(b.stroke, z - a, .20); b.m.position.set(p, (a + z) / 2, frontZ); }
      else { b.m.scale.set(z - a, b.stroke, .20); b.m.position.set((a + z) / 2, p, frontZ); }
      area += b.stroke * (z - a); visibleBars++;
    }
    return { area, visibleBars };
  }

  for (let index = 0; index < 6; index++) {
    const cell = new THREE.Group(); cell.position.x = cellX; group.add(cell);
    cell.name = 'cell-' + (index + 1);
    const back = box(W, H, .09, face, edge); back.position.z = -D; cell.add(back);
    const bottom = box(W, .10, D, floor, edge); bottom.position.set(0, -H / 2, -D / 2); cell.add(bottom);
    const ceiling = box(W, .08, D, side, faint); ceiling.position.set(0, H / 2, -D / 2); cell.add(ceiling);
    for (const sign of [-1, 1]) {
      const wall = box(.09, H, D, sign < 0 ? side : floor, edge);
      wall.position.set(sign * W / 2, 0, -D / 2); cell.add(wall);
      for (let j = 1; j < 6; j++) {
        const z = -D * j / 6;
        line(cell, [vec(sign * (W / 2 - .055), -H / 2, z), vec(sign * (W / 2 - .055), H / 2, z)], palette.purple, .22);
        const tick = box(.16, .025, .03, red, null);
        tick.position.set(sign * (W / 2 - .06), -2.7, z); cell.add(tick);
      }
      for (const y of [-1.55, 0, 1.55]) line(cell, [vec(sign * (W / 2 - .06), y, -.05), vec(sign * (W / 2 - .06), y, -D + .06)], palette.purple, .29);
    }
    for (let j = 0; j <= 10; j++) {
      const x = -W / 2 + W * j / 10;
      line(cell, [vec(x, -H / 2 + .06, -.06), vec(x, -H / 2 + .06, -D + .05)], palette.purple, .29);
    }
    for (let j = 1; j < 6; j++) {
      const z = -D * j / 6;
      line(cell, [vec(-W / 2, -H / 2 + .06, z), vec(W / 2, -H / 2 + .06, z)], palette.purple, .25);
    }
    // Sparse, purposeful rear traces give a depth reference without competing
    // with the illustration's face and silhouette.
    for (const sign of [-1, 1]) {
      const x = sign * 3.6;
      line(cell, [vec(x, -2.6, -D + .06), vec(x, -1.8, -D + .06), vec(x - sign * .35, -1.45, -D + .06), vec(x - sign * .35, 2.55, -D + .06)], palette.pale, .22);
      for (let j = 0; j < 4; j++) drawRect(cell, x - .12, -1.4 + j * .93, x + .12, -1.13 + j * .93, -D + .07, palette.purple, .35);
    }
    drawRect(cell, -3.8, -2.8, 3.8, 2.8, -D + .055, palette.purple, .24);

    const guest = makeArt('guest' + index, 5.58);
    guest.name = 'approved-guest-' + index;
    cell.add(guest);
    const size = new THREE.Box3().setFromObject(guest).getSize(new THREE.Vector3());
    const fit = size.x > W - 1 ? (W - 1) / size.x : 1;
    const guestBaseHeight = size.y > .1 ? size.y * fit : 5.58;

    // Front structural frame sits ahead of all character pixels.
    for (const x of [-W / 2, W / 2]) {
      const post = box(.19, H + .25, .33, boxMaterials, paperEdge); post.position.set(x, 0, .12); cell.add(post);
      const rail = box(.045, H + .1, .045, barFace, paperEdge); rail.position.set(x + (x < 0 ? -.21 : .21), 0, .17); cell.add(rail);
    }
    for (const y of [-H / 2, H / 2]) {
      const header = box(W + .3, .18, .35, boxMaterials, paperEdge); header.position.set(0, y, .12); cell.add(header);
    }
    // The compositor supplies CELL/domain captions in its safe upper-left area.
    // Incremental sealed state: small red cells in the enclosure's lower rail.
    const indicators = [];
    for (let j = 0; j < 6; j++) {
      const base = box(.31, .085, .05, face, faint); base.position.set(-W / 2 + .28 + j * .43, -H / 2 - .25, .1); cell.add(base);
      const light = box(.27, .049, .055, red, null); light.position.copy(base.position); light.position.z += .025; cell.add(light); indicators.push(light);
    }

    const door = new THREE.Group(); cell.add(door);
    const grids = [];
    if (index === 1) {
      grids.push(addGrid(door, [-W / 2, -H / 2, 0, H / 2], 4, 3));
      grids.push(addGrid(door, [0, -H / 2, W / 2, H / 2], 4, 3));
    } else if (index === 4) {
      grids.push(addGrid(door, [-W / 2, 0, W / 2, H / 2], 7, 2));
      grids.push(addGrid(door, [-W / 2, -H / 2, W / 2, 0], 7, 2));
    } else if (index === 2 || index === 5) {
      const sign = index === 2 ? -1 : 1;
      door.position.x = sign * W / 2;
      grids.push(addGrid(door, sign < 0 ? [0, -H / 2, W, H / 2] : [-W, -H / 2, 0, H / 2], index === 5 ? 9 : 7, 3));
    } else grids.push(addGrid(door, [-W / 2, -H / 2, W / 2, H / 2], index === 3 ? 8 : 7, index === 3 ? 4 : 3));

    const latch = new THREE.Group(); latch.position.set(0, -.58, .42); cell.add(latch);
    const boltLeft = box(.72, .13, .15, red, null), boltRight = box(.72, .13, .15, red, null);
    latch.add(boltLeft, boltRight);
    const clasp = box(.39, .47, .14, ink, edge); clasp.position.set(0, -.15, .09); latch.add(clasp);
    const shackle = makeLine([vec(-.14, .07, .19), vec(-.14, .25, .19), vec(.14, .25, .19), vec(.14, .07, .19)], palette.red, .95);
    latch.add(shackle);
    const lockPoint = box(.035, .10, .035, red, null); lockPoint.position.set(0, -.15, .18); latch.add(lockPoint);
    cells.push({ cell, guest, fit, guestBaseHeight, door, grids, latch, boltLeft, boltRight, indicators });
  }

  function update(localTime, camera) {
    const t = clamp(localTime, 0, duration);
    let index = 5;
    for (let j = 0; j < 6; j++) if (t < boundaries[j + 1] - 1e-8) { index = j; break; }
    const u = clamp((t - boundaries[index]) / (boundaries[index + 1] - boundaries[index]));
    const closure = progress(u, .14, .73), locked = progress(u, .73, .91);
    for (let j = 0; j < cells.length; j++) cells[j].cell.visible = j === index;
    const c = cells[index];
    const retreat = 1 - closure * .035;
    c.guest.scale.setScalar(c.fit * retreat);
    c.guest.position.set(0, -H / 2 + .24 + c.guestBaseHeight * retreat / 2, -1.05 - closure * 1.05);
    c.guest.rotation.set(0, 0, 0);
    const grey = smooth((closure - .65) / .2);
    c.guest.userData.setGrey?.(grey);
    c.door.rotation.set(0, 0, 0);
    let stats = [];
    if (index === 0) stats.push(placeGrid(c.grids[0], 0, H * (1 - closure)));
    else if (index === 1) {
      stats.push(placeGrid(c.grids[0], -W / 2 * (1 - closure), 0));
      stats.push(placeGrid(c.grids[1], W / 2 * (1 - closure), 0));
    } else if (index === 2 || index === 5) {
      const sign = index === 2 ? -1 : 1;
      c.door.rotation.y = sign * 1.44 * (1 - closure);
      stats.push(placeGrid(c.grids[0], 0, 0, false));
    } else if (index === 3) stats.push(placeGrid(c.grids[0], 0, -H * (1 - closure)));
    else {
      stats.push(placeGrid(c.grids[0], -W * .55 * (1 - closure), H * .55 * (1 - closure)));
      stats.push(placeGrid(c.grids[1], W * .55 * (1 - closure), -H * .55 * (1 - closure)));
    }
    c.latch.visible = locked > .001;
    c.latch.scale.setScalar(.84 + .16 * locked);
    c.boltLeft.position.set(-.67 + .38 * locked, .04, 0);
    c.boltRight.position.set(.67 - .38 * locked, .04, 0);
    for (let j = 0; j < 6; j++) {
      c.indicators[j].visible = j < index || (j === index && locked > .005);
      c.indicators[j].scale.x = .27 * (j === index ? Math.max(.01, locked) : 1);
    }

    const cameraX = [-.42, .24, -.58, .32, -.36, .48][index];
    const cameraY = [.36, .58, .27, .52, .38, .5][index];
    const push = smooth(u);
    // Every camera remains in front of the maximum 8.6-unit hinge sweep.
    camera.position.set(cameraX + (index % 2 ? -.10 : .10) * push, cameraY - push * .09, 12.35 - push * .62);
    camera.lookAt(-.12, -.03 + (index % 2 ? -.025 : .025) * push, -1.3);
    camera.fov = 36;
    camera.near = .06; camera.far = 80;
    const apparentH = c.guestBaseHeight * retreat / (2 * (camera.position.z - c.guest.position.z) * Math.tan(camera.fov * Math.PI / 360));
    const projectedArea = stats.reduce((sum, s) => sum + s.area, 0) * (index === 2 || index === 5 ? Math.cos(1.44 * (1 - closure)) : 1);
    Object.assign(audit, {
      time: t, currentGuest: 'guest' + index, currentGuestName: names[index], currentIndex: index,
      domain: domains[index], shotProgress: u, closure, lock: locked, grey, doorDirection: directions[index],
      frontOcclusion: clamp(projectedArea / (W * H)), foregroundBars: stats.reduce((sum, s) => sum + s.visibleBars, 0),
      gateInFrontOfGuest: frontZ > c.guest.position.z, guestDepth: c.guest.position.z,
      frontGateZ: frontZ, backWallZ: -D, backWall: true, sideWalls: 2, floor: true,
      characterHeightFractionEstimate: apparentH, cameraOutside: camera.position.z > W + .3,
      sealedDomains: index + (locked > .99 ? 1 : 0), previousSealed: domains.slice(0, index),
      cumulativeIndicators: index + locked,
      frontOcclusionNote: 'Projected grille strip area estimate; intersections counted twice. Actual textured character occlusion must be checked in rendered frames.'
    });
  }
  return { group, update, duration, audit };
}
