/** Spatial accompaniment to the approved 86-shot v5.2 narrative.
 * It does not replace a figure, a lyric, a reply, a star or a prison guest.
 * The background stays in a shared camera space and is deterministic on seek.
 */
export function createWorld({ THREE, palette, makeLine, makeText }) {
  const group = new THREE.Group(); group.name = 'v6-semantic-world';
  const P = { bg: 0x15101d, ink: 0x15101d, purple: 0x9a72cf, gold: 0xe9c57a, pale: 0xf3e6c9, muted: 0x564569, ...palette };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, t) => { const q = clamp((t - a) / (b - a)); return q * q * (3 - 2 * q); };
  const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const stages = {}, lines = [], surfaces = [], signals = [], animated = {};
  function stage(name) { const g = new THREE.Group(); g.name = 'world-' + name; group.add(g); stages[name] = g; return g; }
  const stageNames = ['boot', 'conversation', 'geometry', 'approach', 'play', 'waiting', 'rules', 'neural', 'ending', 'matter', 'projection', 'control'];
  stageNames.forEach(stage);

  // Screen-space widths make the three line weights survive both 1080p and 4K.
  // Endpoint coordinates remain genuine world-space geometry, with depth tests.
  const vertex = `
    attribute vec3 segmentA;
    attribute vec3 segmentB;
    attribute vec2 corner;
    uniform vec2 viewport;
    uniform float pixelWidth;
    varying float edge;
    varying float viewW;
    varying float railDepth;
    void main(){
      vec4 a=projectionMatrix*modelViewMatrix*vec4(segmentA,1.);
      vec4 b=projectionMatrix*modelViewMatrix*vec4(segmentB,1.);
      vec2 pa=a.xy/max(.0001,a.w), pb=b.xy/max(.0001,b.w);
      vec2 d=(pb-pa)*viewport;
      float dl=max(.0001,length(d));d/=dl;
      vec4 p=mix(a,b,corner.x);
      vec2 n=vec2(-d.y,d.x);
      p.xy+=n*corner.y*pixelWidth/viewport*p.w;
      gl_Position=p;edge=corner.y;viewW=p.w;
      railDepth=(modelMatrix*vec4(mix(segmentA,segmentB,corner.x),1.)).z;
    }`;
  const fragment = `
    uniform vec3 tint;
    uniform float opacity;
    uniform float gain;
    uniform float clock;
    uniform float propagation;
    varying float edge;
    varying float viewW;
    varying float railDepth;
    void main(){
      if(viewW<=0.) discard;
      float aa=1.-smoothstep(.68,1.,abs(edge));
      float band=pow(max(0.,cos(railDepth*.32+clock*4.8)),18.);
      gl_FragColor=vec4(tint*(gain+propagation*band),opacity*aa);
    }`;
  function stroke(parent, points, color = P.muted, tier = 1, opacity = 0.4, disconnected = false) {
    const pts = points.map(p => p.isVector3 ? p : v(...p));
    const count = disconnected ? Math.floor(pts.length / 2) : Math.max(0, pts.length - 1);
    const a = new Float32Array(count * 12), b = new Float32Array(count * 12), corners = new Float32Array(count * 8), positions = new Float32Array(count * 12), idx = [];
    for (let s = 0; s < count; s++) {
      const p = pts[disconnected ? s * 2 : s], q = pts[disconnected ? s * 2 + 1 : s + 1];
      for (let k = 0; k < 4; k++) {
        a.set(p.toArray(), s * 12 + k * 3); b.set(q.toArray(), s * 12 + k * 3);
        positions.set((k < 2 ? p : q).toArray(), s * 12 + k * 3);
      }
      corners.set([0, -1, 0, 1, 1, -1, 1, 1], s * 8);
      const n = s * 4; idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('segmentA', new THREE.BufferAttribute(a, 3));
    geo.setAttribute('segmentB', new THREE.BufferAttribute(b, 3));
    geo.setAttribute('corner', new THREE.BufferAttribute(corners, 2)); geo.setIndex(idx);
    const uniforms = { viewport: { value: new THREE.Vector2(1920, 933) }, pixelWidth: { value: [0.85, 1.5, 3.15][tier] }, tint: { value: new THREE.Color(color) }, opacity: { value: opacity }, gain: { value: 1 }, clock:{value:0}, propagation:{value:0} };
    const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    const size = new THREE.Vector2();
    mesh.onBeforeRender = renderer => {
      const target = renderer.getRenderTarget();
      if (target) size.set(target.width, target.height); else renderer.getDrawingBufferSize(size);
      uniforms.viewport.value.copy(size);
      uniforms.pixelWidth.value = [0.85, 1.5, 3.15][tier] * size.y / 933;
    };
    mesh.userData.baseOpacity = opacity; parent.add(mesh); lines.push(mesh); return mesh;
  }
  function clippedBasic(color, opacity = 0.22) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: opacity > 0.8, side: THREE.DoubleSide, toneMapped: false });
    // The compositor maps this entire 1920x933 target above the lyric band.
    // Do not crop a second time in material shaders.
    surfaces.push({ material: mat, base: opacity }); return mat;
  }
  function plate(parent, x, y, z, w, h, opacity = 0.20, color = 0x30213f) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), clippedBasic(color, opacity)); g.add(mesh);
    stroke(g, [[-w / 2, -h / 2, .03], [w / 2, -h / 2, .03], [w / 2, h / 2, .03], [-w / 2, h / 2, .03], [-w / 2, -h / 2, .03]], P.purple, 1, 0.37);
    parent.add(g); return g;
  }
  function boxEdges(parent, x, y, z, w, h, d, color = P.purple, opacity = .38, tier = 1) {
    const pts = [];
    const corners = Array.from({ length: 8 }, (_, i) => [x + (i & 1 ? 1 : -1) * w / 2, y + (i & 2 ? 1 : -1) * h / 2, z + (i & 4 ? 1 : -1) * d / 2]);
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) pts.push(corners[i], corners[i | bit]);
    return stroke(parent, pts, color, tier, opacity, true);
  }
  function ring(parent, x, y, z, r, color = P.purple, opacity = .34, tier = 1, start = 0, length = Math.PI * 2) {
    return stroke(parent, Array.from({ length: 97 }, (_, i) => [x + r * Math.cos(start + i / 96 * length), y + r * Math.sin(start + i / 96 * length), z]), color, tier, opacity);
  }
  function floor(parent, y = -5.5, width = 34, depth = 38, opacity = .22) {
    const pairs = [];
    for (let x = -width / 2; x <= width / 2; x += 2) pairs.push([x, y, 4], [x, y, 4 - depth]);
    for (let z = 4; z >= 4 - depth; z -= 3) pairs.push([-width / 2, y, z], [width / 2, y, z]);
    return stroke(parent, pairs, P.muted, 0, opacity, true);
  }
  function pathSignal(parent, points, color, speed = .18, phase = 0) {
    const pts = points.map(p => v(...p));
    stroke(parent, pts, color, 0, .28);
    const signal = new THREE.Mesh(new THREE.BoxGeometry(.12, .07, .035), clippedBasic(color, .94));
    parent.add(signal); signals.push({ mesh: signal, points: pts, speed, phase, owner: parent });
    return signal;
  }
  function room(parent, opacity = .27) {
    floor(parent, -5.4, 35, 40, opacity);
    boxEdges(parent, 0, .6, -12, 29, 13, 30, P.muted, opacity, 1);
    const ribs = [];
    for (let z = 0; z >= -27; z -= 5.4) ribs.push([-14.5, -5.4, z], [-14.5, 6.9, z], [-14.5, 6.9, z], [14.5, 6.9, z], [14.5, 6.9, z], [14.5, -5.4, z]);
    stroke(parent, ribs, P.purple, 0, opacity * .8, true);
  }

  // Slender, matte load-bearing members give depth a readable silhouette.
  // These are structure, not a field of unrelated floating interface panels.
  function beam(parent,a,b,width=.16,depth=.22,color=0x64447e,opacity=.68){
    const pa=v(...a),pb=v(...b),delta=pb.clone().sub(pa);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,delta.length(),depth),clippedBasic(color,opacity));
    mesh.position.copy(pa).add(pb).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());parent.add(mesh);return mesh;
  }
  function portal(parent,z,width=32,height=15.6,strength=.76){
    const g=new THREE.Group();g.position.z=z;parent.add(g);
    const x=width/2,b=-6.2,top=b+height;
    const pts=[[-x,b,0],[-x,top-2.2,0],[-x+2.2,top,0],[x-2.2,top,0],[x,top-2.2,0],[x,b,0]];
    for(let i=0;i<pts.length-1;i++)beam(g,pts[i],pts[i+1],.22,.38,0x604178,strength*.86);
    const edge=stroke(g,pts,P.purple,2,strength);edge.userData.propagates=true;
    for(const side of[-1,1]){
      stroke(g,[[side*(x-.38),b,.05],[side*(x-.38),top-2.2,.05],[side*(x-2.35),top-.38,.05]],P.muted,1,strength*.7);
      const feet=plate(g,side*x,b+.38,0,.94,.72,.55,0x493158);feet.rotation.y=side*.08;
    }
    return g;
  }
  function rails(parent,x=15.4,y=5.3,z0=9,z1=-42,opacity=.75){
    for(const side of[-1,1])for(const yy of[y,-5.8]){
      const line=stroke(parent,[[side*x,yy,z0],[side*x,yy,z1]],yy>0?P.purple:P.gold,2,yy>0?opacity:opacity*.65);
      line.userData.propagates=true;
      stroke(parent,[[side*(x+.22),yy-.14,z0],[side*(x+.22),yy-.14,z1]],P.muted,0,.45);
    }
  }

  // BOOT: board traces terminate at actual pads; there is no random HUD rain.
  room(stages.boot, .18);
  const chip = plate(stages.boot, -10.2, 3.2, -8, 4.2, 2.7, .35);
  chip.rotation.y = .18; boxEdges(chip, 0, 0, 0, 3.3, 1.9, .12, P.purple, .7, 2);
  const bootPads = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, y = -4.8 + Math.floor(i / 2) * 1.25;
    const z = -5 - (i % 3) * 3.0;
    const route = [[side * 18, y, z], [side * 14, y, z], [side * 12.5, y + .8, z], [side * 10.5, y + .8, z]];
    pathSignal(stages.boot, route, i % 3 ? P.purple : P.gold, .15 + i % 3 * .025, i * .117);
    bootPads.push(plate(stages.boot, side * 10.3, y + .8, z, .42, .18, .34, 0x4b365e));
  }
  animated.bootPads = bootPads;
  // The opening reads as a circuit's physical enclosure around the old board.
  const bootStructure=new THREE.Group();stages.boot.add(bootStructure);
  [7,-8,-27].forEach((z,i)=>portal(bootStructure,z,32+i*1.2,16.4,.79-i*.12));
  rails(bootStructure,15.7,6.2,10,-43,.79);
  for(const side of[-1,1]){
    const bank=plate(bootStructure,side*16.6,.6,2,2.4,11.4,.72,0x453052);bank.rotation.y=-side*.38;
    for(let i=0;i<6;i++)boxEdges(bank,0,-4.5+i*1.75,.07,1.76,1.1,.1,P.purple,.58,1);
  }
  animated.bootStructure=bootStructure;

  // CONVERSATION: two flanking work surfaces leave the original exchange clear.
  room(stages.conversation, .22);
  const workplanes = [];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, z = -3 - Math.floor(i / 2) * 5.2;
    const p = plate(stages.conversation, side * (12.6 + Math.floor(i / 2) * .3), .3 + (i % 3) * .45, z, 3.6, 7.7, .15);
    p.rotation.y = -side * .24; workplanes.push(p);
    for (let j = 0; j < 5; j++) stroke(p, [[-1.45, -2.8 + j * 1.15, .05], [1.25 - (j % 2) * .55, -2.8 + j * 1.15, .05]], P.muted, 0, .4);
  }
  animated.workplanes = workplanes;
  for (const side of [-1, 1]) pathSignal(stages.conversation, [[side * 17, 5.3, 1], [side * 10, 5.3, -5], [side * 10, 6.1, -13], [side * 5.5, 6.1, -21]], side < 0 ? P.gold : P.purple, .075, side < 0 ? .2 : .66);

  // GEOMETRY: a point lattice, a measured circumference, and a depth wave.
  floor(stages.geometry, -5.6, 40, 42, .2);
  const lattice = new THREE.Group(); stages.geometry.add(lattice);
  const latticePairs = [];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 9; i++) {
    const p = [-15 + i * 3.75, -4.6 + j * 2.6, -13 - (i % 2) * .3];
    if (i < 8) latticePairs.push(p, [p[0] + 3.75, p[1], -13 - ((i + 1) % 2) * .3]);
    if (j < 4) latticePairs.push(p, [p[0], p[1] + 2.6, p[2]]);
  }
  stroke(lattice, latticePairs, P.muted, 0, .25, true); animated.lattice = lattice;
  const measure = new THREE.Group(); measure.position.set(-11.2, .7, -5); stages.geometry.add(measure);
  ring(measure, 0, 0, 0, 5.1, P.purple, .55, 2, -.2, 5.45);
  ring(measure, 0, 0, -.15, 5.4, P.muted, .35, 0);
  const ticks = [];
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; ticks.push([Math.cos(a) * 5.15, Math.sin(a) * 5.15, .02], [Math.cos(a) * (i % 4 ? 5.3 : 5.55), Math.sin(a) * (i % 4 ? 5.3 : 5.55), .02]); }
  stroke(measure, ticks, P.gold, 0, .36, true); animated.measure = measure;
  const waves = [];
  for (let k = 0; k < 5; k++) waves.push(stroke(stages.geometry, Array.from({ length: 121 }, (_, i) => { const x = -18 + i * .3; return [x, -4.6 + k * .18 + Math.sin(x * .38) * .7, -5 - k * 1.4]; }), k ? P.muted : P.purple, k ? 0 : 1, k ? .20 : .43));
  animated.waves = waves;

  // APPROACH: restrained thin building shells and a bridge with real parallax.
  floor(stages.approach, -5.4, 44, 52, .3);
  const city = new THREE.Group(); stages.approach.add(city);
  for (let i = 0; i < 30; i++) {
    const side = i % 2 ? 1 : -1, z = 2 - Math.floor(i / 2) * 3.1, x = side * (10 + i % 3 * 2.0), h = 2.8 + 4.6 * (0.5 + 0.5 * Math.sin(i * 2.399));
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.1 + i % 3 * .35, h, 1.3), clippedBasic(i % 4 ? 0x2e203c : 0x44304f, .38));
    b.position.set(x, -5.4 + h / 2, z); city.add(b);
    boxEdges(city, x, -5.4 + h / 2, z, 1.1 + i % 3 * .35, h, 1.3, i % 5 ? P.muted : P.purple, .40, i % 5 ? 0 : 1);
  }
  for (const z of [-11, -23, -35]) {
    stroke(city, [[-13,-2.6,z],[-8,-1.5,z],[0,-.8,z],[8,-1.5,z],[13,-2.6,z]], P.purple, 2, .5);
    stroke(city, [[-13,-2.85,z],[-8,-1.75,z],[0,-1.05,z],[8,-1.75,z],[13,-2.85,z]], P.muted, 1, .3);
    const supports=[]; for(let x=-10;x<=10;x+=4)supports.push([x,-1.5,z],[x,-5.4,z]);stroke(city,supports,P.muted,0,.3,true);
  }
  animated.city = city;
  // A large near bridge, middle pylons and a distant viaduct establish scale.
  const transit=new THREE.Group();stages.approach.add(transit);
  [8,-8,-28,-49].forEach((z,i)=>portal(transit,z,34,18.4,.87-i*.14));
  rails(transit,15.8,7.8,12,-58,.86);
  for(const side of[-1,1]){
    beam(transit,[side*14,-5.5,10],[side*14,-5.5,-54],.22,.35,0x72528c,.8);
    const deck=plate(transit,side*16,-4.9,-10,5.3,.34,.78,0x4c355e);deck.rotation.y=side*.12;deck.scale.z=30;
    for(let i=0;i<8;i++){
      const z=7-i*7.5;
      beam(transit,[side*14.5,-5.5,z],[side*14.5,5.5+(i%3),z],.24,.32,0x64447e,.73);
      const edge=stroke(transit,[[side*14.5,-5.5,z],[side*14.5,5.5+(i%3),z],[side*17.5,6.8+(i%3),z]],P.purple,1,.64);edge.userData.propagates=true;
    }
  }
  animated.transit=transit;

  // PLAY: two independent parameter rings. They may approach phase alignment,
  // but the background never invents a response after the user has left.
  floor(stages.play, -5.6, 36, 35, .19);
  const rings = [];
  for (let side = -1; side <= 1; side += 2) {
    const g = new THREE.Group(); g.position.set(side * 12.8, 1.4, -2); g.rotation.y = -side * .48;
    ring(g,0,0,0,6.8,side < 0 ? P.gold : P.purple,.76,2,.15,5.5);
    ring(g,0,0,-1.3,7.4,P.purple,.51,1);
    ring(g,0,0,-5.8,7.4,P.muted,.40,1);
    for(let j=0;j<12;j++){
      const a=j/12*Math.PI*2,x=Math.cos(a)*7.4,y=Math.sin(a)*7.4;
      const rail=stroke(g,[[x,y,-5.8],[x,y,-1.3]],side<0?P.gold:P.purple,1,.48);rail.userData.propagates=true;
    }
    const spokes=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;spokes.push([Math.cos(a)*6.7,Math.sin(a)*6.7,.03],[Math.cos(a)*(6.96+(i%3)*.13),Math.sin(a)*(6.96+(i%3)*.13),.03]);}
    stroke(g,spokes,side<0?P.gold:P.purple,0,.45,true);stages.play.add(g);rings.push(g);
  }
  animated.rings=rings;
  rails(stages.play,15.8,6.4,9,-34,.60);

  // WAITING: an empty room, not a spectacle. There is no new incoming signal.
  room(stages.waiting,.105);
  const emptyFrame=stroke(stages.waiting,[[-12,-4,-13],[-12,5,-13],[-5,5,-13]],P.muted,0,.18);
  animated.emptyFrame=emptyFrame;

  // RULES: persistent boards have the same order when they are finally removed.
  room(stages.rules,.22);
  const walls=[];
  for(let i=0;i<9;i++)for(const side of [-1,1]){
    const z=2-i*3.2;
    const p=plate(stages.rules,side*(17+i*.35),.7,z,2.3,12.6,.42,i%3?0x33203e:0x3b2546);
    p.rotation.y=-side*.22;
    const rail=stroke(p,[[-.9,-5.9,.05],[-.9,5.9,.05],[.9,5.9,.05]],P.purple,2,.62);
    const tags=[];
    for(let j=0;j<7;j++)tags.push([-.9,-4.8+j*1.5,.06],[-.40,-4.8+j*1.5,.06]);
    const status=stroke(p,tags,0xc45b86,1,.38,true);
    walls.push({root:p,side,index:i,z,rail,status});
  }
  animated.walls=walls;
  const closedFrames=[];
  for(let i=0;i<5;i++)closedFrames.push(boxEdges(stages.rules,0,.7,-11-i*3.3,25-i*.8,11.6,.12,P.muted,.23,0));
  animated.closedFrames=closedFrames;
  // Pressure has a front clamp and deep braces; nothing in it swings open.
  const clampStructure=new THREE.Group();stages.rules.add(clampStructure);
  const clampPortals=[7,-10,-30].map((z,i)=>portal(clampStructure,z,33,16.8,.83-i*.15));
  rails(clampStructure,15.3,6.8,10,-42,.76);
  animated.clampStructure=clampStructure;animated.clampPortals=clampPortals;

  // A bare scaffold yields the entire centre to the separate neural module.
  floor(stages.neural,-5.5,38,40,.15);
  stroke(stages.neural,[[-15,-5,-4],[-15,6,-4],[-7,6,-12]],P.muted,0,.18);
  stroke(stages.neural,[[15,-5,-4],[15,6,-4],[7,6,-12]],P.muted,0,.18);

  // ENDING: do not pre-build the bridge that the two original pens must draw.
  stroke(stages.ending,[[-16,-4.5,-18],[-12,-4.5,-24],[-8,-4.5,-26]],P.muted,0,.12);
  stroke(stages.ending,[[16,-4.5,-18],[12,-4.5,-24],[8,-4.5,-26]],P.muted,0,.12);
  stroke(stages.ending,[[-16,6.7,-20],[-10,6.7,-24]],P.purple,0,.09);

  // MATTER: abstract bonded structures, not claims about a named molecule.
  // A single transfer follows the original fruit-to-growth/protection direction.
  function wireAtom(parent,position,radius=.34,color=P.purple){
    const atom=new THREE.Group();atom.position.copy(v(...position));parent.add(atom);
    const a=ring(atom,0,0,0,radius,color,.73,1),b=ring(atom,0,0,0,radius,color,.44,0);
    b.rotation.y=Math.PI/2;return atom;
  }
  const substance=new THREE.Group();stages.matter.add(substance);floor(stages.matter,-5.7,38,36,.20);
  const molecules=[];
  for(const [cx,cy,cz,scale] of[[-13.7,1.6,-4,1.0],[12.8,-1.5,-8,.88],[-2,6.8,-23,.65]]){
    const molecule=new THREE.Group();molecule.position.set(cx,cy,cz);molecule.scale.setScalar(scale);substance.add(molecule);
    const nodes=Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return[Math.cos(a)*2.1,Math.sin(a)*2.1,Math.sin(a*2)*.65];});
    nodes.forEach((p,i)=>wireAtom(molecule,p,i%3===0?.42:.28,i%3===0?P.gold:P.purple));
    for(let i=0;i<6;i++){
      const next=(i+1)%6;stroke(molecule,[nodes[i],nodes[next]],P.purple,2,.62);
      if(i%2===0){const a=nodes[i].map((x,j)=>j<2?x*.86:x),b=nodes[next].map((x,j)=>j<2?x*.86:x);stroke(molecule,[a,b],P.muted,1,.60);}
      if(i%2===1){const outer=nodes[i].map((x,j)=>j<2?x*1.55:x+.8);stroke(molecule,[nodes[i],outer],P.purple,1,.58);wireAtom(molecule,outer,.22,P.gold);}
    }
    molecules.push(molecule);
  }
  const matterCurve=new THREE.CubicBezierCurve3(v(-13.5,1.6,-4),v(-7,6.8,-10),v(8,5.6,-21),v(12.8,-1.5,-8));
  stroke(substance,matterCurve.getPoints(96),P.purple,1,.36);
  const carriers=[];
  for(let i=0;i<4;i++){
    const carrier=new THREE.Group();substance.add(carrier);
    const pts=[[0,.32,0],[-.27,-.18,.18],[.27,-.18,.18],[0,-.18,-.28]];
    const pairs=[];for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)pairs.push(pts[a],pts[b]);
    stroke(carrier,pairs,i?P.purple:P.gold,1,.9,true);carriers.push(carrier);
  }
  animated.substance=substance;animated.molecules=molecules;animated.carriers=carriers;

  // PROJECTION: two translucent coordinate planes hold one continuous identity.
  floor(stages.projection,-5.6,38,36,.24);
  const projections=[];
  for(const side of[-1,1]){
    const sheet=plate(stages.projection,side*12.1,.6,-3,7.2,12.4,.32,0x392b48);sheet.rotation.y=-side*.47;
    for(let j=0;j<7;j++)stroke(sheet,[[-3.1,-4.8+j*1.6,.05],[3.1,-4.8+j*1.6,.05]],P.muted,0,.40);
    const frame=stroke(sheet,[[-3.5,-6,.09],[-3.5,6,.09],[3.5,6,.09],[3.5,-6,.09]],P.purple,2,.72);
    for(const y of[-4.8,0,4.8])for(const x of[-2.5,2.5]){
      stroke(sheet,[[x-.15,y,.08],[x,y+.15,.08],[x+.15,y,.08],[x,y-.15,.08],[x-.15,y,.08]],P.gold,1,.7);
    }
    const scan=stroke(sheet,[[-3.1,0,.13],[3.1,0,.13]],P.gold,2,.7);
    projections.push({sheet,frame,scan,side});
  }
  for(const y of[-5.8,6.6])stroke(stages.projection,[[-12,y,-4],[-6,y,-16],[6,y,-16],[12,y,-4]],P.muted,1,.54);
  animated.projections=projections;

  // CONTROL: two modes of one spatial grammar: give/receive rails, then
  // phase paths crossing at different depths. Original palm contact is retained.
  const directionSpace=new THREE.Group(),phaseSpace=new THREE.Group();stages.control.add(directionSpace,phaseSpace);
  floor(stages.control,-5.6,38,36,.22);
  const guideCurves=[],guideMarkers=[];
  for(let lane=0;lane<2;lane++){
    const y=lane?-5.0:5.5;
    const curve=new THREE.CubicBezierCurve3(v(-18,y,1),v(-7,y+1.2,-18),v(7,y-1.2,-18),v(18,y,1));guideCurves.push(curve);
    const rail=stroke(directionSpace,curve.getPoints(96),lane?P.purple:P.gold,2,.70);rail.userData.propagates=true;
    const rail2=stroke(directionSpace,curve.getPoints(96).map(p=>p.clone().add(v(0,.17,-.2))),P.muted,0,.5);
    for(let j=0;j<4;j++){
      const mark=stroke(directionSpace,[[-.42,.20,0],[.08,0,0],[-.42,-.20,0]],P.purple,2,.88);
      guideMarkers.push({mark,curve,lane,phase:j*.19});
    }
    for(const x of[-16.6,16.6])boxEdges(directionSpace,x,y,-1,1.4,1,.65,P.purple,.55,1);
  }
  const phasePaths=[],phaseMarkers=[];
  const phasePoint=(a,i)=>v(Math.cos(a)*16,.55+Math.sin(a)*6.4,-13+Math.sin(a*2+i*.8)*8+i*1.8);
  for(let i=0;i<4;i++){
    const path=new THREE.Group();phaseSpace.add(path);
    const coords=Array.from({length:145},(_,j)=>phasePoint(j/144*Math.PI*2+i*.27,i));
    stroke(path,coords,i===0?P.gold:P.purple,i===0?2:1,i===0?.52:.46);
    for(let j=0;j<8;j++){const a=j/8*Math.PI*2+i*.27;stroke(path,[phasePoint(a,i),phasePoint(a+.08,i)],i?P.pale:P.gold,2,.6);}
    phasePaths.push(path);
    const marker=wireAtom(path,[0,0,0],.17,i?P.purple:P.gold);phaseMarkers.push(marker);
  }
  animated.directionSpace=directionSpace;animated.phaseSpace=phaseSpace;animated.guideMarkers=guideMarkers;animated.phasePaths=phasePaths;animated.phaseMarkers=phaseMarkers;

  function indexFor(time, shot) {
    const match = typeof shot === 'string' ? shot.match(/R(\d+)/i) : String(shot?.id || '').match(/R(\d+)/i);
    if(match)return Number(match[1]);
    // Safe fallback at the broad semantic boundaries; normal caller passes id.
    if(time<15.0334)return time<3.95?1:time<7.65?2:time<11.3334?3:4;
    if(time<29.3334)return 6;if(time<44.5667)return 9;if(time<48.2667)return 13;
    if(time<59.3334)return 15;if(time<88.8834)return 25;if(time<103.65)return 33;
    if(time<110.8)return 40;if(time<125.5667)return 44;if(time<147.95)return 51;
    if(time<177.1667)return 60;if(time<188.4)return 78;if(time<192.2667)return 81;
    if(time<205.7334)return 82;return 86;
  }
  function modeFor(n,time){
    if(n===26||n===28)return 'matter';if(n===33||n===34)return 'projection';if(n===36||n===38)return 'control';
    if([3,30,35,78,79,80].includes(n))return 'neural';
    if(n<=5)return 'boot';if(n<=8)return 'conversation';if(n<=12)return 'geometry';
    if(n===13)return 'play';if(n===14)return 'conversation';if(n<=16)return 'approach';
    if(n<=39)return 'conversation';if(n<=43)return 'play';if(n<=50)return 'waiting';
    if(n<=59)return 'pressure';if(n<=77)return 'execution';if(n===81)return 'pressure';
    if(n<=85 || time<208)return 'release';return 'ending';
  }
  const semantics = {};
  for(let n=1;n<=86;n++)semantics['R'+String(n).padStart(2,'0')]=modeFor(n,n===86?208:0);
  const audit={
    version:'v6-world-3',sourceTimeline:'data/production-v5/timeline.json',sourceScenes:'src/mv52final/{early,middle,late}.js',
    semantics,subtitleSafeBottomY:933,subtitleCropOwner:'compositor',targetBaseSize:[1920,933],lineWidths1080:[.85,1.5,3.15],deterministic:true,
    preserves:{figures:true,lyrics:true,prisonGuests:true,oldStar:true,independentReplyTiming:true},
    releaseBeginsBody:192.26666666666668,replyBeginsBody:208,quietCodaBeginsBody:211,
    excluded:['PBR specular','metallic blocks','extra foreground labels','invented early replies','replacement stars'],current:null
  };
  function update(bodyTime,shot,camera,energy={}){
    const time=clamp(Number(bodyTime)||0,0,218.3333333333),n=indexFor(time,shot),mode=modeFor(n,time),key=['pressure','execution','release'].includes(mode)?'rules':mode;
    for(const name of stageNames)stages[name].visible=name===key;
    const quiet=mode==='waiting'||mode==='ending'||mode==='neural'||n===50;
    const pulse=quiet?0:clamp(Number(energy.pulse)||0),kick=quiet?0:clamp(Number(energy.kick)||0);
    const release=smooth(192.2666667,207.9,time);
    const restraint=mode==='waiting'?0.57:mode==='ending'?0.35:mode==='neural'?0.57:mode==='release'?lerp(1,.12,release):1;
    for(const line of lines){line.material.uniforms.gain.value=1+.16*pulse+.075*kick;line.material.uniforms.opacity.value=line.userData.baseOpacity*restraint;line.material.uniforms.clock.value=time;line.material.uniforms.propagation.value=line.userData.propagates&&!quiet?(.08+.5*pulse+.24*kick)*restraint:0;}
    for(const s of surfaces)s.material.opacity=s.base*restraint;
    // A shared, slow path has no per-cut teleport. The quiet coda freezes it.
    const clock=Math.min(time,211),drift=Math.sin(clock*.035),rise=Math.sin(clock*.019);
    camera.position.set(1.7*drift,2.5+.36*rise,25.2-1.35*Math.sin(clock*.026));
    if(mode==='approach'){
      const travel=smooth(48.2667,59.3333,time);
      camera.position.x+=Math.sin(travel*Math.PI)*1.45;camera.position.z-=travel*3.4;
      camera.position.y-=travel*.72;
    }
    camera.position.x+=kick*(mode==='execution'?.055:.020);
    camera.lookAt(.15*drift,.65,-7.5);camera.fov=42;
    stages.boot.scale.setScalar(.98+.02*smooth(0,12,time));
    animated.bootStructure.position.z=smooth(0,15.0333,time)*1.6;
    animated.bootPads.forEach((pad,i)=>{pad.scale.y=.75+.25*smooth(i*.18,i*.18+.8,time);});
    animated.workplanes.forEach((p,i)=>{p.position.y=.3+(i%3)*.45+Math.sin(time*.16+i*.3)*.08;});
    animated.lattice.rotation.y=Math.sin(time*.09)*.055;
    animated.measure.rotation.z=(n===10?time*.018:time*.009);
    animated.waves.forEach((wave,i)=>{wave.position.y=Math.sin(time*.6-i*.5)*.055;});
    animated.city.position.z=mode==='approach'?smooth(51.95,59.3333,time)*2.1:0;
    animated.transit.position.z=mode==='approach'?smooth(48.2667,59.3333,time)*2.8:0;
    animated.rings.forEach((r,i)=>{r.rotation.z=(i?-1:1)*time*.028;r.rotation.x=Math.sin(time*.13+i)*.045;});
    const localRanges={26:[74.5666667,77.5666667],28:[78.2666667,81.2666667],33:[88.8833333,90.7166667],34:[90.7166667,92.5666667],36:[96.2666667,99.95],38:[100.4166667,103.1833333]};
    const range=localRanges[n]||[0,1],localProgress=clamp((time-range[0])/(range[1]-range[0]));
    animated.substance.scale.x=n===28?-1:1;
    animated.molecules.forEach((m,i)=>{m.rotation.y=Math.sin(time*.27+i)*.28;m.rotation.z=Math.sin(time*.19+i)*.09;});
    for(let i=0;i<carriers.length;i++){
      const q=(localProgress-.39)/.55-i*.09;carriers[i].visible=mode==='matter'&&q>=0&&q<=1;
      carriers[i].position.copy(matterCurve.getPoint(clamp(q)));carriers[i].rotation.set(time*.3+i,time*.4,0);
    }
    const projectionChange=n===34?smooth(.17,.78,localProgress):0;
    for(const {sheet,frame,scan,side} of projections){
      sheet.rotation.y=-side*(.47-.15*projectionChange);sheet.position.z=-3+(side>0?projectionChange:1-projectionChange)*1.1;
      frame.material.uniforms.opacity.value=(side>0?lerp(.35,.82,projectionChange):lerp(.82,.35,projectionChange))*restraint;
      scan.position.y=lerp(-5.7,5.7,n===34?projectionChange:smooth(.08,.92,localProgress));
    }
    directionSpace.visible=n===36;phaseSpace.visible=n===38;
    const returning=n===36&&localProgress>=.52;
    for(const {mark,curve,phase} of guideMarkers){
      const progress=returning?1-smooth(.52,.9,localProgress):smooth(.06,.42,localProgress);
      const q=clamp(progress*(1-phase)+phase*.5);mark.position.copy(curve.getPoint(q));
      mark.quaternion.setFromUnitVectors(v(1,0,0),curve.getTangent(q).normalize());mark.scale.x=returning?-1:1;
      mark.material.uniforms.tint.value.set(returning?P.gold:P.purple);
    }
    phasePaths.forEach((path,i)=>{
      path.rotation.y=Math.sin(time*.28+i*.5)*.15;path.rotation.z=Math.sin(time*.16+i*.7)*.09;
      phaseMarkers[i].position.copy(phasePoint(time*.35+i*Math.PI*.5,i));
    });
    const pressure=n===81?.90:smooth(125.5667,147.95,time);
    const execution=smooth(147.95,161.5,time);
    const inward=mode==='execution'?.72+.28*execution:mode==='release'?1:pressure*.72;
    animated.clampPortals.forEach((p,i)=>{
      const peel=mode==='release'?smooth(193+i*2.5,199+i*2.5,time):0;
      p.scale.x=1-inward*.08+peel*.65;p.position.y=-peel*15;
      p.position.z=[7,-10,-30][i]-peel*9;
    });
    animated.clampStructure.visible=mode!=='release'||time<207.8;
    for(const wall of walls){
      const peel=mode==='release'?smooth(192.2667+wall.index*1.28,196.0+wall.index*1.28,time):0;
      wall.root.position.x=wall.side*(17+wall.index*.35-inward*(5.0-wall.index*.13)+peel*(13+wall.index*.5));
      wall.root.position.y=.7-peel*(1.2+wall.index*.22);
      wall.root.position.z=wall.z-peel*5;
      wall.root.rotation.y=-wall.side*(.22+peel*.60);
      wall.root.rotation.z=wall.side*peel*.075;
      wall.status.material.uniforms.opacity.value=.38*(1-peel)*restraint;
      wall.rail.material.uniforms.gain.value=1+.2*pulse+.08*kick;
    }
    animated.closedFrames.forEach((frame,i)=>{
      const peel=mode==='release'?smooth(195.0+i*1.6,199.0+i*1.6,time):0;
      frame.position.y=-peel*(13+i);frame.position.z=-peel*8;
      frame.material.uniforms.opacity.value=frame.userData.baseOpacity*(1-peel)*restraint;
    });
    // Incoming packets exist only in the early mutually responsive workspace.
    for(const signal of signals){
      const q=(time*signal.speed+signal.phase)%1, span=q*(signal.points.length-1),i=Math.min(signal.points.length-2,Math.floor(span)),f=span-i;
      signal.mesh.position.copy(signal.points[i]).lerp(signal.points[i+1],f);
      signal.mesh.scale.setScalar(.85+.18*pulse);
    }
    if(n===47||n===50){stages.waiting.visible=false;}
    audit.current={bodyTime:time,shot:'R'+String(n).padStart(2,'0'),mode,stage:key,pulse,kick,release,quiet,
      ruleState:mode==='execution'?'closed-and-tightening':mode==='pressure'?'constricting':mode==='release'?'withdrawing-layers':null,
      detailMode:mode==='matter'?(n===26?'bonded-transfer-to-growth':'bonded-transfer-to-protection'):mode==='projection'?'two-planes-one-identity':mode==='control'?(n===36?(returning?'rail-receive':'rail-give'):'depth-crossed-phase-paths'):null,
      camera:camera.position.toArray(),backgroundOnly:true};
    return audit.current;
  }
  return {group,update,audit};
}
