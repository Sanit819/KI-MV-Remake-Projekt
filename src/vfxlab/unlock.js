// Six spatial locks. All state is evaluated directly from local time (seconds).
export function createUnlock({ THREE, palette, makeText, makeLine }) {
  const group = new THREE.Group();
  group.name = 'six-choices';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const release = (t, start, length = 0.36) => smooth((t - start) / length);
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  // Source timeline candidates, not a claim of manually heard syllable onsets.
  const triggers = [3.733333, 4.15, 4.483333, 5.083333, 5.533333, 5.95];
  const words = ['WAKE', 'YIELD', 'BREATHE', 'CHOOSE', 'TRUST', 'BEGIN'];
  const moving = [], locks = [], lights = [];
  const standard = (color, emissive = 0x000000, intensity = 0) => new THREE.MeshStandardMaterial({
    color, roughness: 0.48, metalness: 0.38, emissive,
    emissiveIntensity: intensity, side: THREE.DoubleSide
  });
  const dark = standard(palette.ink, palette.purple, 0.025);
  const purple = standard(palette.purple, palette.purple, 0.07);
  const gold = standard(palette.gold, palette.gold, 0.14);
  const pale = standard(palette.pale, palette.gold, 0.035);
  const edgeMat = new THREE.LineBasicMaterial({ color: palette.gold, transparent: true, opacity: 0.68 });
  const dimMat = new THREE.LineBasicMaterial({ color: palette.purple, transparent: true, opacity: 0.30 });
  const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  function outlined(geometry, material = dark, edge = edgeMat) {
    const mesh = new THREE.Mesh(geometry, material);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), edge);
    mesh.add(outline);
    return mesh;
  }
  function box(w, h, d, material = dark, edge = edgeMat) {
    return outlined(new THREE.BoxGeometry(w, h, d), material, edge);
  }
  function text(parent, value, width, height, x, y, z, color = palette.pale) {
    const mesh = makeText(value, { width, height, color: hex(color), fontSize: 112 });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function plate(w, h, d, material, numeral, word) {
    const p = new THREE.Group();
    p.add(box(w, h, d, material));
    if (numeral !== null) text(p, String(numeral), Math.min(w * .76, 3.1), Math.min(h * .58, 3.7), 0, .18, d / 2 + .023);
    if (word) text(p, word, Math.min(w * .8, 3.3), .42, 0, -h * .32, d / 2 + .027, palette.gold);
    return p;
  }
  function circle(radius, color, opacity, z = 0, segments = 96) {
    const points = Array.from({ length: segments + 1 }, (_, i) => {
      const a = i / segments * Math.PI * 2;
      return v(Math.cos(a) * radius, Math.sin(a) * radius, z);
    });
    return makeLine(points, color, opacity);
  }
  function ring(radius, width, material) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(radius, width, 6, 96), material);
    return r;
  }
  function arch(index) {
    const g = new THREE.Group();
    g.position.z = -index * 8;
    group.add(g);
    const frame = new THREE.Group();
    g.add(frame);
    // A thick outline reads before the micro-detail and offers a stable scale cue.
    const corners = [];
    for (let j = 0; j < 7; j++) {
      const a = Math.PI / 6 + j * Math.PI / 3;
      corners.push(v(Math.cos(a) * 5.1, Math.sin(a) * 5.1));
    }
    const contour = makeLine(corners, palette.purple, .85);
    frame.add(contour);
    frame.add(circle(4.55, palette.gold, .38, -.15));
    for (let j = 0; j < 6; j++) {
      const a = Math.PI / 6 + j * Math.PI / 3;
      const beam = box(4.9, .22, .65, dark, dimMat);
      beam.position.set(Math.cos(a + Math.PI / 6) * 4.42, Math.sin(a + Math.PI / 6) * 4.42, -.3);
      beam.rotation.z = a + Math.PI * 2 / 3;
      frame.add(beam);
    }
    for (let j = 0; j < 36; j++) {
      const a = j / 36 * Math.PI * 2;
      const r0 = j % 3 === 0 ? 4.65 : 4.76;
      frame.add(makeLine([v(Math.cos(a) * r0, Math.sin(a) * r0, .08), v(Math.cos(a) * 4.92, Math.sin(a) * 4.92, .08)], palette.gold, j % 3 ? .25 : .7));
    }
    text(frame, String(index + 1).padStart(2, '0'), .57, .37, -3.8, -3.75, .12, palette.gold);
    text(frame, words[index], 1.8, .25, 2.7, -3.75, .12, palette.muted);
    const light = new THREE.PointLight(palette.purple, 20, 13, 2);
    light.position.set(1.7, 2.6, 3.7);
    g.add(light); lights.push(light);
    locks.push({ group: g, frame });
    return g;
  }

  group.add(new THREE.HemisphereLight(palette.pale, palette.bg, 1.2));
  const key = new THREE.DirectionalLight(palette.pale, 1.9);
  key.position.set(3, 6, 8); group.add(key);

  // 01: six solid sectors separate radially and turn, exposing a real aperture.
  {
    const g = arch(0), petals = [];
    const shape = new THREE.Shape();
    shape.moveTo(.12, -.04); shape.lineTo(3.82, -1.93); shape.lineTo(4.08, -1.67);
    shape.lineTo(4.08, 1.67); shape.lineTo(3.82, 1.93); shape.lineTo(.12, .04); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .42, bevelEnabled: true, bevelSize: .055, bevelThickness: .055, bevelSegments: 1, steps: 1 });
    for (let j = 0; j < 6; j++) {
      const pivot = new THREE.Group(), a = j * Math.PI / 3;
      pivot.rotation.z = a;
      pivot.add(outlined(geo, j % 2 ? dark : purple));
      g.add(pivot); petals.push({ pivot, a });
    }
    const badge = plate(2.28, 3.25, .3, dark, 1, 'WAKE'); badge.position.z = .65; g.add(badge);
    moving.push((t, q) => {
      const gather = .46 * (1 - smooth(t / 3.2)) * (1 - q);
      for (const { pivot, a } of petals) {
        pivot.position.set(Math.cos(a) * (q * 3.4 + gather), Math.sin(a) * (q * 3.4 + gather), -q * .9);
        pivot.rotation.z = a + q * .30;
        pivot.rotation.y = q * .12;
      }
      badge.position.set(-q * 7.2, q * 4.5, .65 - q * 2.5);
      badge.scale.setScalar(1 - q * .58);
      badge.traverse(o => {
        if (o.isMesh && o.material.isMeshBasicMaterial) o.material.opacity = 1 - .78 * smooth((q - .15) / .62);
      });
      badge.rotation.z = q * .68; badge.rotation.y = q * -.55;
    });
  }
  // 02: asymmetric interlocking halves shear in opposite directions.
  {
    const g = arch(1), panels = [];
    for (let j = 0; j < 2; j++) {
      const sign = j ? 1 : -1;
      const p = plate(3.96, 7.32, .56, j ? dark : purple, j ? null : 2, j ? 'YIELD' : null);
      p.position.set(sign * 2, 0, 0); g.add(p); panels.push({ p, sign });
      for (let k = 0; k < 5; k++) {
        const tooth = box(.6, .38, .58, gold, dimMat);
        tooth.position.set(-sign * 2.1, -2.4 + k * 1.2, -.01); p.add(tooth);
      }
      for (let k = 0; k < 3; k++) p.add(makeLine([v(-1.4, 1.7 + k * .12, .3), v(1.4, 1.7 + k * .12, .3)], palette.gold, .4));
    }
    moving.push((t, q) => {
      for (const { p, sign } of panels) {
        p.position.set(sign * (2 + q * 5.5), sign * q * 1.8, -q * .35);
        p.rotation.z = -sign * q * .18;
      }
    });
  }
  // 03: a four-leaf shutter folds away in depth instead of sliding off screen.
  {
    const g = arch(2), hinges = [];
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2;
      const hinge = new THREE.Group(); hinge.rotation.z = a;
      hinge.position.set(Math.cos(a) * 3.95, Math.sin(a) * 3.95, 0);
      const flap = new THREE.Group(); hinge.add(flap);
      const shape = new THREE.Shape();
      shape.moveTo(0, -3.95); shape.lineTo(0, 3.95); shape.lineTo(-3.95, 0); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: .32, bevelEnabled: true, bevelSize: .035, bevelThickness: .04, bevelSegments: 1, steps: 1 });
      flap.add(outlined(geo, j % 2 ? dark : purple));
      if (j === 0) { text(flap, '3', 2.15, 3, -1.66, 0, .4); text(flap, 'BREATHE', 1.9, .35, -1.55, -1.1, .4, palette.gold); }
      g.add(hinge); hinges.push({ hinge: flap, a });
    }
    moving.push((t, q) => {
      for (const { hinge } of hinges) hinge.rotation.y = -q * 1.72;
    });
  }
  // 04: six heavy vertical bars separate alternately upward/downward.
  {
    const g = arch(3), bars = [];
    for (let j = 0; j < 6; j++) {
      const p = plate(1.12, 7.5, .65, j % 2 ? dark : purple, null, null);
      if (j === 2) text(p, '4', .98, 1.55, 0, .12, .35);
      const x = (j - 2.5) * 1.26; p.position.x = x;
      for (const y of [-2.9, 2.9]) {
        const clasp = box(1.27, .21, .84, gold, dimMat); clasp.position.y = y; p.add(clasp);
      }
      g.add(p); bars.push({ p, x, sign: j % 2 ? 1 : -1, j });
    }
    moving.push((t, q) => {
      for (const { p, x, sign, j } of bars) {
        const qi = smooth(clamp(q * 1.22 - j * .035));
        p.position.set(x + Math.sign(x) * qi * .7, sign * qi * 8.7, -qi * .7);
        p.rotation.z = sign * qi * .06;
      }
    });
  }
  // 05: segmented spiral bands unwind around a central plate that turns edge-on.
  {
    const g = arch(4), bands = [];
    for (let layer = 0; layer < 3; layer++) {
      const band = new THREE.Group();
      for (let j = 0; j < 18; j++) {
        const a = j / 18 * Math.PI * 2 + layer * .36;
        const r = 2.75 + layer * .49;
        const tile = box(.85, .4, .18, layer === 1 ? gold : purple, dimMat);
        tile.position.set(Math.cos(a) * r, Math.sin(a) * r, (j / 18 - .5) * 1.5 - layer * .38);
        tile.rotation.z = a + Math.PI / 2;
        band.add(tile);
      }
      g.add(band); bands.push({ band, layer });
    }
    const badge = plate(4.1, 5.1, .52, dark, 5, 'TRUST'); badge.position.z = 1.1; g.add(badge);
    moving.push((t, q) => {
      for (const { band, layer } of bands) {
        band.rotation.z = (layer % 2 ? -1 : 1) * (t * .13 + q * 2.1);
        band.rotation.x = q * (.18 + layer * .13);
        band.scale.setScalar(1 + q * (1.28 + layer * .25));
        band.position.z = -q * layer * 1.5;
      }
      badge.rotation.x = -q * Math.PI / 2;
      badge.position.set(0, -q * 5.5, 1.1 - q * 1.1);
    });
  }
  // 06: a solid front becomes a drawbridge; the enclosure unfolds into open space.
  let finalSides, finalFloor, finalRoof;
  {
    const g = arch(5);
    const frontPivot = new THREE.Group(); frontPivot.position.y = -3.8;
    const front = plate(7.5, 7.6, .56, purple, 6, 'BEGIN'); front.position.y = 3.8;
    frontPivot.add(front); g.add(frontPivot);
    finalSides = [];
    for (const sign of [-1, 1]) {
      const hinge = new THREE.Group(); hinge.position.set(sign * 3.9, 0, -4);
      const wall = box(.28, 7.8, 8, dark, edgeMat); hinge.add(wall);
      for (let j = 0; j < 8; j++) {
        const rib = box(.35, 7.8, .075, purple, dimMat); rib.position.z = -3.5 + j; hinge.add(rib);
      }
      g.add(hinge); finalSides.push({ hinge, sign });
    }
    finalRoof = box(7.8, .28, 8, dark); finalRoof.position.set(0, 3.9, -4); g.add(finalRoof);
    finalFloor = box(7.8, .25, 8, dark); finalFloor.position.set(0, -3.9, -4); g.add(finalFloor);
    moving.push((t, q) => {
      // Fold away from the approaching camera; a positive rotation sweeps the
      // top edge through the camera corridor before the door is fully open.
      frontPivot.rotation.x = -q * 1.64;
      const open = release(t, 6.416667, 1.45);
      for (const { hinge, sign } of finalSides) {
        hinge.rotation.z = -sign * open * .72;
        hinge.position.x = sign * (3.9 + open * 4.5);
        hinge.position.y = -open * .5;
      }
      finalRoof.position.y = 3.9 + open * 6;
      finalRoof.rotation.z = open * .16;
      finalFloor.position.y = -3.9 - open * 1.9;
    });
  }

  // A restrained corridor establishes scale and continues through all six rooms.
  const rails = new THREE.Group(); group.add(rails);
  for (const x of [-5.4, 5.4]) for (const y of [-4.7, 4.7]) {
    rails.add(makeLine([v(x, y, 15), v(x, y, -58)], palette.purple, .28));
  }
  for (let i = 0; i < 28; i++) {
    const z = 13 - i * 2.6;
    rails.add(makeLine([v(-5.4, -4.7, z), v(5.4, -4.7, z)], palette.purple, .13));
  }

  const starGroup = new THREE.Group(); starGroup.position.set(0, .7, -63); group.add(starGroup);
  const starShape = new THREE.Shape();
  for (let j = 0; j < 10; j++) {
    const a = Math.PI / 2 + j * Math.PI / 5;
    const r = j % 2 ? 1.02 : 2.08;
    if (!j) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  const starHole = new THREE.Path();
  for (let j = 9; j >= 0; j--) {
    const a = Math.PI / 2 + j * Math.PI / 5;
    const r = (j % 2 ? 1.02 : 2.08) * .79;
    if (j === 9) starHole.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starHole.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starHole.closePath(); starShape.holes.push(starHole);
  const star = outlined(new THREE.ExtrudeGeometry(starShape, { depth: .2, bevelEnabled: true, bevelSize: .035, bevelThickness: .04, bevelSegments: 2, steps: 1 }), gold);
  starGroup.add(star);
  const halo = circle(3.5, palette.gold, .42); starGroup.add(halo);
  const orbit = circle(4.5, palette.purple, .32); orbit.rotation.x = 1.05; starGroup.add(orbit);
  const tail = makeLine([v(.7, -1.3, .08), v(2.1, -2.3, .08), v(3.45, -2.1, -.05), v(4.05, -1.55, -.2)], palette.gold, .82);
  starGroup.add(tail);
  text(starGroup, 'THE NEXT LINE IS YOURS', 6, .45, 0, -4.15, 0, palette.pale);
  const starLight = new THREE.PointLight(palette.gold, 55, 25, 2); starLight.position.set(0, 1.4, -57); group.add(starLight);

  // The lock's plates and rails continue into an opened world. These are
  // surfaces at different depths, not a star graphic on an empty backdrop.
  const world = new THREE.Group(); world.position.set(0, -3.85, -63); group.add(world);
  const worldPanels = [];
  function arcBand(inner, outer, a0, a1, y) {
    const shape = new THREE.Shape();
    for (let j = 0; j <= 18; j++) {
      const a = a0 + (a1 - a0) * j / 18;
      if (!j) shape.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
      else shape.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    }
    for (let j = 18; j >= 0; j--) {
      const a = a0 + (a1 - a0) * j / 18;
      shape.lineTo(Math.cos(a) * inner, Math.sin(a) * inner);
    }
    shape.closePath();
    const slab = outlined(new THREE.ExtrudeGeometry(shape, { depth: .13, bevelEnabled: false, steps: 1 }), dark, dimMat);
    slab.rotation.x = -Math.PI / 2; slab.position.y = y;
    world.add(slab);
  }
  for (let layer = 0; layer < 3; layer++) {
    const r = 7 + layer * 5;
    for (let j = 0; j < 12; j++) {
      const a0 = j * Math.PI / 6 + .035, a1 = (j + 1) * Math.PI / 6 - .035;
      arcBand(r - 1.6, r + .35, a0, a1, layer * .17);
      const a = (a0 + a1) / 2;
      world.add(makeLine([v(Math.cos(a) * (r - 1.6), layer * .17 + .16, -Math.sin(a) * (r - 1.6)), v(Math.cos(a) * (r + .35), layer * .17 + .16, -Math.sin(a) * (r + .35))], palette.gold, .5));
    }
    const circlePoints = Array.from({ length: 145 }, (_, j) => {
      const a = j / 144 * Math.PI * 2;
      return v(Math.cos(a) * (r + .55), layer * .17 + .2, Math.sin(a) * (r + .55));
    });
    world.add(makeLine(circlePoints, layer === 1 ? palette.gold : palette.purple, layer === 1 ? .57 : .42));
  }
  // Far-side thin portals remain readable through the final star, completing
  // the same architectural vocabulary as the six earlier thresholds.
  for (let j = 0; j < 11; j++) {
    const a = Math.PI + (j + .5) / 11 * Math.PI;
    const r = 14.8;
    const frame = new THREE.Group();
    frame.position.set(Math.cos(a) * r, 2.3, Math.sin(a) * r);
    frame.rotation.y = -a - Math.PI / 2;
    const h = 3.4 + .8 * Math.cos(j * 1.3);
    for (const x of [-.85, .85]) {
      const upright = box(.13, h, .23, purple, edgeMat); upright.position.x = x; frame.add(upright);
    }
    for (const y of [-h / 2, h / 2]) {
      const bridge = box(1.83, .13, .23, dark, edgeMat); bridge.position.y = y; frame.add(bridge);
    }
    for (let k = 0; k < 4; k++) frame.add(makeLine([v(-.65, -h / 2 + .4 + k * .44, .13), v(.65, -h / 2 + .4 + k * .44, .13)], palette.purple, .23));
    world.add(frame); worldPanels.push({ frame, baseY: 2.3, j });
  }
  for (let j = 0; j < 24; j++) {
    const a = j / 24 * Math.PI * 2;
    const r = 12;
    const p = box(.18, .18, .18, gold, edgeMat);
    p.position.set(Math.cos(a) * r, .7, Math.sin(a) * r); world.add(p);
    world.add(makeLine([v(Math.cos(a) * 4.8, .3, Math.sin(a) * 4.8), v(Math.cos(a) * r, .7, Math.sin(a) * r)], palette.purple, .18));
  }

  // Non-uniform time Hermite curve: velocity remains continuous through each door.
  const path = [
    [0, 1.6, .85, 15], [1.25, -.8, .55, 13.8], [2.8, .7, .35, 12.1],
    [3.45, .12, .1, 10.2], [3.733333, 0, 0, 7.5], [4.15, 0, 0, -.5],
    [4.483333, 0, 0, -8.5], [5.083333, 0, 0, -16.5], [5.533333, 0, 0, -24.5],
    [5.95, 0, 0, -32.5], [6.416667, 0, 0, -38], [7.1, 0, .2, -45],
    [8.4, .35, .6, -49.4], [10, .45, .85, -51.4]
  ];
  function cameraPoint(t) {
    let k = 0;
    while (k < path.length - 2 && t > path[k + 1][0]) k++;
    const a = path[k], b = path[k + 1], before = path[Math.max(0, k - 1)], after = path[Math.min(path.length - 1, k + 2)];
    const dt = b[0] - a[0], u = clamp((t - a[0]) / dt), u2 = u * u, u3 = u2 * u;
    const result = [];
    for (let j = 1; j <= 3; j++) {
      const ma = (b[j] - before[j]) / (b[0] - before[0]);
      const mb = (after[j] - a[j]) / (after[0] - a[0]);
      result.push((2 * u3 - 3 * u2 + 1) * a[j] + (u3 - 2 * u2 + u) * dt * ma + (-2 * u3 + 3 * u2) * b[j] + (u3 - u2) * dt * mb);
    }
    return result;
  }
  function update(localTime, camera) {
    const t = clamp(localTime, 0, 10);
    const opening = release(t, 6.416667, 1.45);
    for (let i = 0; i < 6; i++) {
      const q = release(t, triggers[i], i === 2 ? .31 : i === 5 ? .38 : .34);
      moving[i](t, q);
      // Golden accents appear only after a choice is made.
      lights[i].color.set(q > .2 ? palette.gold : palette.purple);
      lights[i].intensity = 16 + 22 * Math.sin(q * Math.PI) + q * 5;
      const eventFrame = Math.floor((t - triggers[i]) * 60 + .0001);
      const edgePulse = eventFrame === 2 ? 1 : eventFrame === 3 ? -.65 : eventFrame === 4 ? .3 : 0;
      locks[i].frame.position.x = edgePulse * .14;
      locks[i].frame.rotation.z = .008 * Math.sin(t * 1.6 + i) * (1 - q) + edgePulse * .009;
    }
    rails.scale.x = 1 + opening * .55;
    rails.scale.y = 1 + opening * .45;
    starGroup.visible = t > 5.8;
    starGroup.scale.setScalar(.75 + opening * .25);
    star.rotation.y = .18 * Math.sin(t * .5);
    star.rotation.z = .025 * Math.sin(t * .8);
    halo.rotation.z = t * .08;
    orbit.rotation.z = t * .14;
    starLight.intensity = 12 + opening * 45;
    world.visible = t >= 6.416667;
    world.scale.set(.24 + opening * .76, 1, .24 + opening * .76);
    for (const { frame, baseY, j } of worldPanels) {
      const rise = release(t, 6.55 + j * .035, 1.25);
      frame.position.y = baseY - (1 - rise) * 2;
      frame.scale.y = .06 + rise * .94;
    }
    camera.position.set(...cameraPoint(t));
    const settle = release(t, 7, 2.8);
    camera.lookAt(0, .7 * settle, camera.position.z - (14 - settle * 2.4));
    camera.fov = 48 + 14 * release(t, 3.25, .6) - 12 * release(t, 6.65, 2.3);
    camera.near = .07;
    camera.far = 180;
  }
  return { group, update, duration: 10 };
}
