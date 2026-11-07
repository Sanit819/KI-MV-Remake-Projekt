/**
 * A single, continuously deformed UV surface: a remembered star, its signal,
 * a closed page of rules, and the open ground on which something can grow.
 * No state is integrated across updates; every pose is a function of local time.
 */
export function createMorph({ THREE, palette, makeText, makeLine, makeArt }) {
  const group = new THREE.Group();
  group.name = 'morph-unwritten-world';
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a)); return p * p * (3 - 2 * p); };
  const mix = (a, b, p) => a + (b - a) * p;
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const ink = new THREE.Color(palette.ink);
  const pale = new THREE.Color(palette.pale);
  const gold = new THREE.Color(palette.gold);
  const purple = new THREE.Color(palette.purple);

  // These markings are drawn in material coordinates, rather than billboards.
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#22182f'; ctx.fillRect(0, 0, 2048, 1024);
  ctx.lineWidth = 1;
  for (let x = 0; x <= 2048; x += 64) {
    ctx.strokeStyle = x % 256 === 0 ? '#574261' : '#34263e';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += 64) {
    ctx.strokeStyle = y % 256 === 0 ? '#574261' : '#34263e';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke();
  }
  // Broad unprinted areas are deliberate. The page should feel designed.
  ctx.fillStyle = '#281d36'; ctx.fillRect(180, 390, 1688, 245);
  ctx.strokeStyle = '#c4a56c'; ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, 1980, 956);
  ctx.strokeStyle = '#785a94'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(112, 680); ctx.lineTo(1936, 680); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 111px "Segoe UI", sans-serif';
  ctx.fillStyle = '#eadfcb'; ctx.fillText('LEAVE ROOM', 1024, 470);
  ctx.font = '300 64px "Segoe UI", sans-serif';
  ctx.fillStyle = '#d6b982'; ctx.fillText('FOR THE UNEXPECTED', 1024, 574);
  ctx.font = '22px Consolas, monospace'; ctx.fillStyle = '#9479aa';
  for (let i = 0; i < 12; i++) {
    const x = 120 + i * 164;
    ctx.beginPath(); ctx.moveTo(x, 78); ctx.lineTo(x, 104 + (i % 3) * 9); ctx.stroke();
    ctx.fillText(String(i + 1).padStart(2, '0'), x, 140);
    ctx.fillRect(x - 14, 852, 28, 4); ctx.fillRect(x - 3, 842, 6, 24);
  }
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const NU = 224, NV = 32;
  const geo = new THREE.PlaneGeometry(1, 1, NU, NV);
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((NU + 1) * (NV + 1) * 3), 3));
  const material = new THREE.MeshBasicMaterial({
    map: texture, color: 0xffffff, vertexColors: true,
    side: THREE.DoubleSide, transparent: false, depthWrite: true,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
  });
  const surface = new THREE.Mesh(geo, material);
  surface.frustumCulled = false;
  surface.name = 'one-corresponding-uv-surface';
  group.add(surface);

  const lineObjects = [];
  function dynamicLine(count, color, opacity = 1) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const m = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false });
    const l = new THREE.Line(g, m); l.frustumCulled = false; group.add(l);
    lineObjects.push(l); return l;
  }
  const rails = [
    { line: dynamicLine(NU + 1, palette.gold, 1), v: 0.01 },
    { line: dynamicLine(NU + 1, palette.purple, 1), v: 0.99 },
    { line: dynamicLine(NU + 1, palette.pale, 0.85), v: 0.5 },
    { line: dynamicLine(NU + 1, palette.gold, 0.38), v: 0.22 },
    { line: dynamicLine(NU + 1, palette.purple, 0.38), v: 0.78 }
  ];
  const ribs = Array.from({ length: 19 }, (_, i) => ({
    u: (i + 1) / 20, line: dynamicLine(NV + 1, i % 4 === 0 ? palette.gold : palette.muted, i % 4 === 0 ? 0.52 : 0.45)
  }));
  const pointsGeo = new THREE.BufferGeometry();
  const nPoints = 88;
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nPoints * 3), 3));
  const points = new THREE.Points(pointsGeo, new THREE.PointsMaterial({ color: palette.gold, size: 0.052, sizeAttenuation: true, transparent: true, opacity: 0.92, depthWrite: false }));
  points.frustumCulled = false; group.add(points);

  // A few opaque travelling tiles have genuine depth, not glow sprite trails.
  const tileGeo = new THREE.BoxGeometry(0.18, 0.04, 0.10);
  const tiles = [];
  for (let i = 0; i < 22; i++) {
    const mesh = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? palette.purple : palette.gold }));
    group.add(mesh); tiles.push(mesh);
  }
  const pulseLines = Array.from({ length: 3 }, (_, i) => dynamicLine(20, i % 2 ? palette.purple : palette.pale, 0.8));

  // Distant contour hills and little pillars are rooted on the final surface.
  // They grow out of it during opening; no replacement scenery is dissolved in.
  const structures = [];
  const pillarGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 44; i++) {
    const h = 1.4 + 4.0 * (0.5 + 0.5 * Math.sin(i * 2.399));
    const u = 0.16 + Math.floor(i / 2) / 21 * 0.79;
    const offset = 0.16 + (i % 3) * 0.055;
    const v = i % 2 ? 0.5 + offset : 0.5 - offset;
    const m = new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0x6d567c : 0x3c2b50 });
    const mesh = new THREE.Mesh(pillarGeo, m);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), new THREE.LineBasicMaterial({ color: i % 4 === 0 ? palette.gold : palette.purple, transparent: true, opacity: 0.6 }));
    mesh.add(outline);
    // Tiered crowns and a few facade bands give the near silhouettes scale.
    const crown = new THREE.Mesh(pillarGeo, new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0x80688d : 0x49375f }));
    crown.position.y = 0.6; crown.scale.set(0.68, 0.22, 0.68); mesh.add(crown);
    for (let row = 0; row < 4; row++) {
      const band = new THREE.Mesh(pillarGeo, new THREE.MeshBasicMaterial({ color: row === 2 && i % 4 === 0 ? palette.gold : palette.muted }));
      band.position.set(0, -0.34 + row * 0.21, 0.504);
      band.scale.set(0.72, 0.015, 0.014); mesh.add(band);
    }
    group.add(mesh);
    structures.push({ mesh, u, v, h, width: 0.68 + (i % 4) * 0.22 });
  }
  const bridges = [];
  for (let i = 0; i < 3; i++) {
    const root = new THREE.Group();
    const finish = new THREE.MeshBasicMaterial({ color: 0x58426e });
    const edgeFinish = new THREE.LineBasicMaterial({ color: i % 2 ? palette.purple : palette.gold, transparent: true, opacity: 0.75 });
    for (const [x, y, sx, sy, sz] of [[0, 1.25, 7.6, 0.25, 0.38], [-3.6, -0.65, 0.26, 3.8, 0.38], [3.6, -0.65, 0.26, 3.8, 0.38]]) {
      const beam = new THREE.Mesh(pillarGeo, finish); beam.position.set(x, y, 0); beam.scale.set(sx, sy, sz);
      beam.add(new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), edgeFinish)); root.add(beam);
    }
    root.position.z = -7.5 - i * 8.0; group.add(root); bridges.push(root);
  }
  const halo = dynamicLine(121, palette.purple, 0.32);
  const horizon = dynamicLine(121, palette.gold, 0.65);

  // An approved drawing supplies a stable human scale at the start.
  let art = null, hand = null;
  try {
    art = makeArt('A02_02', 5.6);
    art.position.set(-6.1, -0.20, -0.65);
    group.add(art);
    const raw = art.userData?.anchors?.hands;
    if (raw?.isVector3) hand = raw.clone();
    else if (Array.isArray(raw) && raw[0]?.isVector3) hand = raw[0].clone();
    else if (raw && typeof raw === 'object') hand = Object.values(raw).find(p => p?.isVector3)?.clone() || null;
  } catch (_) { /* The geometry remains fully usable without the art helper. */ }
  const tether = dynamicLine(40, palette.gold, 0.7);
  const memoryStar = new THREE.Group(); group.add(memoryStar);
  // The small root-star remains as a precise motif while its tail transforms.
  const starVertices = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI / 2 + k * Math.PI / 5;
    const r = k % 2 ? 0.28 : 0.68;
    starVertices.push(V(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const star = makeLine(starVertices, palette.gold, 0.9);
  memoryStar.add(star); memoryStar.position.set(-2.55, 0.62, 0.05);

  const starPath = [];
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI / 2 + k * Math.PI / 5;
    const r = k % 2 ? 0.39 : 0.94;
    starPath.push(V(-2.55 + Math.cos(a) * r, 0.62 + Math.sin(a) * r, 0));
  }
  function seed(u, v, t) {
    let x, y, dx, dy;
    if (u < 0.33) {
      const q = u / 0.33 * 10, i = Math.min(9, Math.floor(q)), f = q - i;
      const a = starPath[i], b = starPath[i + 1];
      x = mix(a.x, b.x, f); y = mix(a.y, b.y, f); dx = b.x - a.x; dy = b.y - a.y;
    } else {
      const q = (u - 0.33) / 0.67;
      x = -2.55 + 9.2 * q;
      y = 1.56 - 2.1 * q + 0.85 * Math.sin(q * Math.PI * 2) * Math.sin(q * Math.PI);
      dx = 9.2; dy = -2.1 + 0.85 * (Math.PI * 2 * Math.cos(q * Math.PI * 2) * Math.sin(q * Math.PI) + Math.PI * Math.sin(q * Math.PI * 2) * Math.cos(q * Math.PI));
    }
    const inv = 1 / Math.max(0.001, Math.hypot(dx, dy));
    const w = (v - 0.5) * (0.045 + 0.07 * smooth(0, 1.2, t));
    return V(x - dy * inv * w, y + dx * inv * w, (v - 0.5) * 0.018);
  }
  function signal(u, v, t) {
    return V((u - 0.5) * 14, (v - 0.5) * 2.8 + Math.sin(u * Math.PI * 2 - 0.4) * 0.38, Math.sin(u * Math.PI) * 0.8 + (v - 0.5) * 0.45);
  }
  function scroll(u, v) {
    const a = (u - 0.5) * 4.65;
    return V(3.1 * Math.sin(a), (v - 0.5) * 5.6, 3.1 * (1 - Math.cos(a)) - 1.5);
  }
  function world(u, v) {
    const x = (0.5 - v) * (16 + u * 9);
    const edge = Math.pow(Math.abs(v - 0.5) * 2, 2);
    return V(x, -2.8 + edge * (0.28 + 0.50 * Math.sin(u * 11 + v * 5)), 3.5 - u * 31);
  }
  function sample(u, v, t) {
    const a = smooth(0.8, 2.6, t), b = smooth(2.8, 4.65, t), c = smooth(5.05, 7.45, t);
    return seed(u, v, t).lerp(signal(u, v, t), a).lerp(scroll(u, v), b).lerp(world(u, v), c);
  }
  const eps = 0.0015;
  function attached(u, v, t, offset = 0.025) {
    const p = sample(u, v, t);
    const du = sample(clamp(u + eps), v, t).sub(sample(clamp(u - eps), v, t)).normalize();
    const dv = sample(u, clamp(v + eps), t).sub(sample(u, clamp(v - eps), t)).normalize();
    const normal = new THREE.Vector3().crossVectors(du, dv).normalize();
    p.addScaledVector(normal, offset);
    return { p, du, dv, normal };
  }
  function writeLine(line, coords) {
    const a = line.geometry.attributes.position;
    for (let i = 0; i < coords.length; i++) a.setXYZ(i, coords[i].x, coords[i].y, coords[i].z);
    a.needsUpdate = true;
  }
  const basis = new THREE.Matrix4();
  const look = V();
  function update(t, camera) {
    t = clamp(t, 0, 8);
    const open = smooth(5.05, 7.45, t), spread = smooth(0.8, 2.6, t);
    const pos = geo.attributes.position, colors = geo.attributes.color, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = uv.getY(i), p = sample(u, v, t);
      pos.setXYZ(i, p.x, p.y, p.z);
      const shade = mix(0.76 + 0.24 * Math.sin(u * Math.PI), 0.82 + v * 0.18, open);
      colors.setXYZ(i, shade, shade, shade);
    }
    pos.needsUpdate = true; colors.needsUpdate = true;
    for (const rail of rails) {
      const ar = rail.line.geometry.attributes.position;
      for (let i = 0; i <= NU; i++) {
        const p = attached(i / NU, rail.v, t, 0.018).p; ar.setXYZ(i, p.x, p.y, p.z);
      }
      ar.needsUpdate = true;
    }
    for (const rib of ribs) {
      const ar = rib.line.geometry.attributes.position;
      for (let j = 0; j <= NV; j++) {
        const p = attached(rib.u, j / NV, t, 0.02).p; ar.setXYZ(j, p.x, p.y, p.z);
      }
      ar.needsUpdate = true;
    }
    for (let i = 0; i < nPoints; i++) {
      const u = ((i * 0.0137 + t * 0.063) % 1), v = i % 2 ? 0.22 : 0.78;
      const p = attached(u, v, t, 0.05).p;
      pointsGeo.attributes.position.setXYZ(i, p.x, p.y, p.z);
    }
    pointsGeo.attributes.position.needsUpdate = true;
    tiles.forEach((tile, i) => {
      const u = (i / tiles.length + t * (i % 2 ? 0.043 : 0.065)) % 1;
      const v = i % 2 ? 0.79 : 0.21;
      const a = attached(u, v, t, 0.05);
      tile.position.copy(a.p);
      basis.makeBasis(a.du, a.normal, a.dv.clone().negate());
      tile.quaternion.setFromRotationMatrix(basis);
      tile.scale.set(0.4 + spread * 0.9, 0.3 + spread * 0.7, 0.3 + spread * 0.7);
    });
    pulseLines.forEach((line, k) => {
      const end = (t * 0.105 + k / 3) % 1;
      writeLine(line, Array.from({ length: 20 }, (_, i) => attached(clamp(end - 0.045 + i / 19 * 0.045), k % 2 ? 0.78 : 0.22, t, 0.07).p));
    });
    const growth = smooth(6.0, 7.75, t);
    structures.forEach(({ mesh, u, v, h, width }, i) => {
      const g = smooth(5.9 + (i % 7) * 0.045, 7.05 + (i % 5) * 0.05, t);
      const p = world(u, v); mesh.position.copy(p); mesh.position.y += h * g / 2;
      mesh.scale.set(width * g, Math.max(0.001, h * g), width * 1.1 * g);
      mesh.visible = g > 0.001;
    });
    bridges.forEach((bridge, i) => {
      const g = smooth(6.3 + i * 0.12, 7.2 + i * 0.12, t);
      bridge.scale.set(g, Math.max(0.001, g), g); bridge.visible = g > 0.001;
    });
    writeLine(horizon, Array.from({ length: 121 }, (_, i) => {
      const a = i / 120 * Math.PI;
      return V(Math.cos(a) * 11, -2.7 + Math.sin(a) * 7 * growth, -25);
    }));
    writeLine(halo, Array.from({ length: 121 }, (_, i) => {
      const a = i / 120 * Math.PI;
      return V(Math.cos(a) * 12.2, -2.7 + Math.sin(a) * 8.2 * growth, -26.5);
    }));
    horizon.visible = growth > 0.001; halo.visible = growth > 0.001;
    if (art) {
      // She stays in world space. The close leftward camera move carries her
      // behind its left edge before the page curls, without sliding the figure.
      art.position.set(-6.1, -0.20, -0.65);
      art.rotation.set(0, 0, 0);
      const artAlpha = 1 - smooth(1.55, 2.08, t);
      art.visible = artAlpha > 0.0001;
      art.traverse(node => {
        const materials = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];
        materials.forEach(m => { m.transparent = true; m.opacity = artAlpha; });
      });
      art.updateMatrixWorld(true);
    }
    let a = V(-4.4, 0.7, -0.4);
    if (art && hand) a = art.localToWorld(hand.clone());
    const b = sample(0.34, 0.5, t);
    writeLine(tether, Array.from({ length: 40 }, (_, i) => {
      const q = i / 39, p = a.clone().lerp(b, q); p.y += Math.sin(q * Math.PI) * 0.35; return p;
    }));
    tether.material.opacity = 0.7 * (1 - smooth(1.55, 2.08, t));
    tether.visible = t < 2.08;
    memoryStar.position.set(-2.55, 0.62, 0.05);
    memoryStar.scale.setScalar(1 - smooth(1.1, 2.6, t));
    memoryStar.visible = t < 2.6;
    // The orbit exposes the surface's real depth; the final tilt reveals ground.
    const orbit = smooth(1.30, 3.15, t);
    camera.position.set(mix(0.2, -5.0, orbit), mix(1.6, 1.15, orbit), mix(11.4, 7.2, orbit));
    look.set(mix(-0.7, 1.2, orbit), 0.1, mix(0, 1.0, orbit));
    // Wait until the sheet is mostly down, then enter it at street height.
    const enter = smooth(5.6, 7.55, t);
    const travel = smooth(7.10, 8.0, t);
    camera.position.lerp(V(0.15, -0.8, -3.8 - 5.0 * travel), enter);
    look.lerp(V(0, -1.15, -24.0), enter);
    camera.lookAt(look); camera.fov = mix(42, 57, enter);
  }
  return { group, update, duration: 8 };
}
