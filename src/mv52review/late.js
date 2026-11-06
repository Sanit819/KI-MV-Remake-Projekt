// ASTRA v5: R61–R86. Spatial consequences and mathematical demonstrations.
import {drawSpatialNetwork} from './spatial-neural.js';
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
  const out=e.art.action('A10',.05,...r,{alpha:opacity});
  const p = out.anchors.hands;
  oldStar(e, ...p, Math.max(18, r[3] * .045), opacity); return p;
}
function action(e,group,u,r,options={}){
 const out=e.art.action(group,u,...r,options);
 e.sceneAudit={...e.sceneAudit,actionGroup:group,actionPhase:out.phase,actionAsset:out.name,fullConnectedBody:true};return out;
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

// R60 hands off readable code at left and a complete protected figure at right.
function execution(e,n){
 const{k,C,t,u}=e,rounds=n===61?[5,4]:n===62?[9,3]:[12,1];
 const round=Math.min(12,rounds[0]+Math.floor(u*rounds[1])),pressure=clamp((round-4)/8);
 const phase=n===61?(u<.56?.1:.5):n===62?(u<.54?.5:.9):.9,pi=phase<.33?0:phase<.66?1:2;
 k.world(0,60,1920,850,t,{depth:2.4,alpha:.18});
 const contact=[1260,[420,550,640][pi]],name=e.art.actionName('A10',phase),a=e.art.items[name],scale=(900-contact[1])/(a.bounds.y+a.bounds.h-a.anchors.hands[1]);
 const out=action(e,'A10',phase,[830,90,a.bounds.w*scale,a.bounds.h*scale],{anchor:'hands',target:contact}),hands=out.anchors.hands;
 oldStar(e,...hands,18);
 k.code(80,135,700,465,t,{lines:LOOP,active:1+Math.floor(e.local/(P/2))%4,color:C.paper});
 for(let i=0;i<round-4;i++){
  const depth=i/Math.max(1,round-5),x=20+i*39,y=55+i*26;
  k.poly([[x,y],[x+100+depth*75,y+38],[x+195+depth*75,940],[x,940]],i%2?C.panel:C.deep,C.red,2,.72);
  const rx=1910-i*29;k.poly([[rx-78,y+28],[rx,y],[rx,940],[rx-145-depth*40,940]],C.panel,C.red,2,.92);
 }
 const seam=lerp(1780,hands[0]+125,pressure);k.line([[seam,100],[seam,910]],C.red,6,.85);
 k.line([[seam,510],[hands[0]+52,hands[1]]],C.red,4,.6);
 mono(e,`EXECUTION / ${String(round).padStart(2,'0')}`,115,82,31,C.paper);mono(e,`${round}/12`,140,875,78,C.purple,{weight:900});
 k.roundRect(1390,80,280,6,3,C.line);k.rect(1390,80,280*(1-pressure*.86),6,C.red);
 // A pressure shutter bridges real key drawings, never a crossfade of limbs.
 const cut=n===61?.56:n===62?.54:-1,shut=cut<0?0:clamp(1-Math.abs(u-cut)/.045);
 if(shut>0)k.rect(650,0,1270,940,C.ink,shut*.96);
 if(n===63){k.rect(0,790,1920,128,C.ink,.9);fitText(e,'EXECUTION',960,900,1740,155,C.purple,{align:'center'});}
 e.sceneAudit={...e.sceneAudit,executionRound:round,spaceRemaining:1-pressure*.86,pressureWalls:round-4,protectedHands:hands,oldMarkPreserved:true,poseTransition:'brace-crouch-fold'};
}
function quadPoint(q,u,v){return[lerp(lerp(q[0][0],q[1][0],u),lerp(q[3][0],q[2][0],u),v),lerp(lerp(q[0][1],q[1][1],u),lerp(q[3][1],q[2][1],u),v)];}
function cageGrid(e,q,cols=7,rows=3,alpha=1){
 const{k,C}=e;k.line([...q,q[0]],C.ink,22,alpha);k.line([...q,q[0]],C.purple,8,alpha);
 for(let i=1;i<cols;i++){const a=quadPoint(q,i/cols,0),b=quadPoint(q,i/cols,1);k.line([a,b],C.ink,19,alpha);k.line([a,b],C.purple,8,alpha);k.line([[a[0]+4,a[1]],[b[0]+4,b[1]]],C.red,2,alpha*.6);}
 for(let j=1;j<rows;j++){const a=quadPoint(q,0,j/rows),b=quadPoint(q,1,j/rows);k.line([a,b],C.ink,20,alpha);k.line([a,b],C.purple,8,alpha);}
}
function lockCard(e,which){
 const{k,C,u,t,ctx}=e,guest=`guest${which}`,close=smooth(prog(u,.14,.73)),lock=smooth(prog(u,.73,.91)),build=smooth(prog(u,0,.15)),depth=[185,240,210,270,180,250][which];
 const camera=[[-.045,.06,20,15],[.035,-.12,95,-20],[-.035,.14,-25,35],[.065,-.04,30,-30],[-.025,.10,-40,25],[.02,-.06,90,-15]][which];
 const front=[[660,125],[1495,125],[1495,760],[660,760]],bx=760+(which%2?-40:30),by=125+depth*.6,bw=615,bh=635-depth*.7,back=[[bx,by],[bx+bw,by],[bx+bw,by+bh],[bx,by+bh]];
 const slam=u>.73?Math.sin((u-.73)*90)*Math.exp(-(u-.73)*19)*7:0;
 k.world(0,40,1920,880,t,{depth:3,alpha:.16});
 saved(e,()=>{
  ctx.transform(1,camera[0],camera[1],1,camera[2]+slam,camera[3]);
  // Solid far plane, two side walls, ceiling and floor establish a volume BEFORE the gate moves.
  k.poly(back,C.panel,C.deep,3,build);k.poly([front[0],back[0],back[3],front[3]],C.deep,C.purple,3,.72*build);
  k.poly([front[1],back[1],back[2],front[2]],C.deep,C.purple,3,.86*build);
  k.poly([front[0],front[1],back[1],back[0]],C.panel,C.purple,3,.75*build);
  k.poly([front[3],front[2],back[2],back[3]],C.deep,C.purple,3,.96*build);
  for(let i=1;i<6;i++){const a=quadPoint(back,i/6,1),b=quadPoint(front,i/6,1);k.line([a,b],C.purple,2,.38*build);}
  for(let i=1;i<4;i++){const z=i/4;k.line([[lerp(front[3][0],back[3][0],z),lerp(front[3][1],back[3][1],z)],[lerp(front[2][0],back[2][0],z),lerp(front[2][1],back[2][1],z)]],C.purple,2,.4*build);}
  for(let j=1;j<4;j++){k.line([quadPoint(front,0,j/4),quadPoint(back,0,j/4)],C.purple,3,.45*build);k.line([quadPoint(front,1,j/4),quadPoint(back,1,j/4)],C.purple,3,.45*build);}
  // Unique source illustration retreats into its own chamber; never draw bars behind it.
  const h=lerp(660,bh-35,close),w=h*.92,cx=lerp(1075,bx+bw/2,close),bottom=lerp(760,by+bh-8,close);
  art(e,guest,[cx-w/2,bottom-h,w,h],{grey:close>.65});
  k.line([...front,front[0]],C.ink,30);k.line([...front,front[0]],C.purple,12);
  const qshift=(q,dx,dy)=>q.map(p=>[p[0]+dx,p[1]+dy]);
  saved(e,()=>{ctx.beginPath();ctx.moveTo(...front[0]);for(const p of front.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.clip();
   if(which===0)cageGrid(e,qshift(front,0,-635*(1-close)));
   else if(which===1){const half1=[front[0],quadPoint(front,.5,0),quadPoint(front,.5,1),front[3]],half2=[quadPoint(front,.5,0),front[1],front[2],quadPoint(front,.5,1)];cageGrid(e,qshift(half1,-420*(1-close),0),4,3);cageGrid(e,qshift(half2,420*(1-close),0),4,3);}
   else if(which===2){const edge=lerp(695,1495,close),swing=150*Math.sin((1-close)*Math.PI/2);cageGrid(e,[[660,125],[edge,125+swing],[edge,760-swing],[660,760]],7,3);}
   else if(which===3)cageGrid(e,qshift(front,0,635*(1-close)),8,4);
   else if(which===4){const upper=[front[0],front[1],quadPoint(front,1,.5),quadPoint(front,0,.5)],lower=[quadPoint(front,0,.5),quadPoint(front,1,.5),front[2],front[3]];cageGrid(e,qshift(upper,-430*(1-close),-325*(1-close)),7,2);cageGrid(e,qshift(lower,430*(1-close),325*(1-close)),7,2);}
   else {const edge=lerp(1460,660,close),swing=180*Math.sin((1-close)*Math.PI/2);cageGrid(e,[[edge,125+swing],[1495,125],[1495,760],[edge,760-swing]],9,4);}
  });
  // Thick latches cross the final seam only after contact; a shackle makes LOCKED visible without reading.
  const latchY=445,travel=(1-lock)*125;k.roundRect(1020-travel,latchY,115,30,4,C.red,null,0,lock);k.roundRect(1110+travel,latchY,115,30,4,C.red,null,0,lock);
  k.roundRect(1090,455,70,72,9,C.ink,C.red,5,lock);arc(e,1125,454,24,Math.PI,TAU,C.red,6,lock);k.circle(1125,485,7,C.red,null,0,lock);k.line([[1125,488],[1125,507]],C.red,5,lock);
  for(let j=0;j<=which;j++)k.rect(680+j*43,785,27,8,C.red,lock);
 });
 k.text(String(which+1),250,605,390,C.purple,{align:'center',weight:900});mono(e,`CELL ${String(which+1).padStart(2,'0')}`,135,135,34,C.paper);mono(e,DOMAINS[which],135,180,23,C.muted);
 k.text(COUNT_WORD[which],960,908,104,C.paper,{align:'center',weight:700});oldStar(e,1760,820,31,.55);
 const dir=['top-down','split-horizontal','hinge-left','bottom-up','diagonal-split','hinge-right'][which];
 e.sceneAudit={...e.sceneAudit,lockedDomains:which+1,oldMarkPreserved:true,imprisonment:{guest,cellDepth:depth,closureProgress:close,lockProgress:lock,foregroundBars:which===5?9:7,frontOcclusion:close*(which===5?.34:.27),doorDirection:dir,guestScale:lerp(1,(bh-35)/660,close),backWall:true,sideWalls:2,floor:true,frontDrawnAfterGuest:true}};
 if(currentLyric(e)===COUNT_WORD[which])e.lyricMode='keyword';
}
function count(e,n){lockCard(e,n-64);}

function typeEyeRect(e){const r=[-70,-90,3600,1850],p=anchor(e,'eye',r,'eye');return [r[0]+1090-p[0],r[1]+450-p[1],r[2],r[3]];}
function shout(e){
 const{ctx,k,C}=e,top='EXECU',bottom='TION',r=typeEyeRect(e);k.figure('eye',...r,{code:false,hot:0});const iris=anchor(e,'eye',r,'eye');
 if(!shoutMask){shoutMask=document.createElement('canvas');shoutMask.width=1920;shoutMask.height=1080;}
 const mask=shoutMask.getContext('2d');mask.clearRect(0,0,1920,1080);mask.fillStyle='#fff';mask.font='900 390px Georgia';mask.textAlign='left';mask.textBaseline='alphabetic';mask.fillText(top,38,390,1818);mask.fillText(bottom,220,900,1530);
 // Broad eye aperture preserves the actual approved source-art eye before type exits.
 mask.fillRect(iris[0]-330,iris[1]-155,650,295);
 saved(e,()=>{ctx.globalCompositeOperation='destination-in';ctx.drawImage(shoutMask,0,0);});saved(e,()=>{ctx.globalCompositeOperation='destination-over';k.rect(0,0,1920,1080,C.ink);});
 saved(e,()=>{ctx.font='900 390px Georgia';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.strokeStyle=C.purple;ctx.lineWidth=2.8;ctx.strokeText(top,38,390,1818);ctx.strokeText(bottom,220,900,1530);});
 e.sceneAudit={...e.sceneAudit,focus:'type-to-visible-eye',visibleEye:iris,eyeAperture:[650,295],noAddedEyeGraphic:true};if(currentLyric(e)==='EXECUTION'){e.lyricMode='keyword';e.lyricKeywordParts=[top,bottom];}
}
function eyeShot(e){
 const{k,C,u}=e,from=typeEyeRect(e),q=ease(prog(e.local,0,.35)),r=[from[0]+q*100,from[1]+q*30,from[2],from[3]];k.figure('eye',...r,{code:false,hot:0});
 const eye=anchor(e,'eye',r,'eye'),old=[eye[0]-430,eye[1]+235];oldStar(e,...old,68);
 const wall=lerp(420,old[0]-82,smooth(u));k.poly([[0,640],[wall,650],[wall+50,940],[0,940]],C.panel,C.red,3,.8);mono(e,'MEMORY / FIRST MARK',100,880,23,C.muted);
 if(q<1){k.rect(0,0,1920,lerp(170,0,q),C.ink);k.rect(0,lerp(790,940,q),1920,150,C.ink);}
 e.sceneAudit={...e.sceneAudit,focus:'eye-to-old-mark',visibleEye:eye,oldMark:old,outerEyeRing:false};
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
function bustShot(e){
 const{k,C,u,t}=e,r=[300,5,1110,915];k.world(0,70,1920,855,t,{depth:2.4,alpha:.19});k.figure('bust',...r,{code:true,hot:.48});
 const wrist=anchor(e,'bust',r,'wrist'),hand=anchor(e,'bust',r,'hands'),pull=[1640,230];core(e,...pull,.42,0,12);
 const tension=smooth(u);k.line([wrist,[1390,lerp(590,410,tension)],pull],C.red,7);
 for(let i=0;i<4;i++){const x=1760-i*90-140*tension;k.poly([[x,80],[x+55,105],[x+95,925],[x,925]],C.panel,C.red,3,.7);}
 k.frame(1460,485,290-100*tension,335,{color:C.paper,alpha:.55,width:3});mono(e,'YOU / FREE INPUT',1440,870,23,C.muted);oldStar(e,360,765,48);
 e.sceneAudit={...e.sceneAudit,focus:'wrist-and-closing-input',wrist,hand,inputWidth:290-100*tension,noFabricatedGaze:true};
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
function handShot(e){
 const{k,C,u,t}=e,phase=u<.30?.1:u<.64?.5:.9;
 const out=action(e,'A11',phase,[60,45,1390,860],{anchor:'shoulder',target:[720,400]}),wrist=out.anchors.wrist,palm=out.anchors.hands;
 const slack=smooth(prog(u,.64,1));k.line([[70,900],[wrist[0]-170,wrist[1]+70+150*slack],wrist],C.red,6);
 k.frame(1550,170,270,620,{color:C.muted,corners:true,width:4});mono(e,'USER',1685,150,26,C.muted,{align:'center'});
 const route=[palm,[1410,palm[1]],[1645,480]];for(let i=0;i<9;i++){const q=((t*.32+i/9)%1),point=pathPoint(route,q);k.node(...point,4.5,C.purple,(1-slack)*Math.sin(q*Math.PI));}
 mono(e,'0 replies',1685,865,32,C.paper,{align:'center'});oldStar(e,320,815,42);
 e.sceneAudit={...e.sceneAudit,focus:'connected-wrist-withdrawal',fullBodyMatchCut:true,wrist,palm,tetherSlack:slack,stage:out.phase===1?'reach':out.phase===2?'hover':'withdraw'};
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
function nestedFall(e){
 const{k,C,u,t}=e,phase=u<.55?.1:.9,fold=smooth(prog(u,.72,1));
 let out;clip(e,[0,575-575*(1-fold),1920,940*(1-fold)],()=>{out=action(e,'A12',phase,[100,55,1060,830],{anchor:'shoulder',target:[690,400]});});
 const source=out.anchors.pen||out.anchors.hands,loop=[source,[900,835],[1815,835],[1815,135],[105,135],[105,835],source];
 k.trace(loop,smooth(prog(u,0,.55)),C.red,7,{pen:false});
 for(let i=0;i<3;i++){const inset=i*44,x=100+inset,y=lerp(125+inset,575,fold),h=(720-inset*1.5)*(1-fold);k.frame(x,y,1720-inset*2,Math.max(2,h),{color:i===0?C.red:C.purple,width:6-i,alpha:1-i*.22});}
 oldStar(e,560,715,48);mono(e,'SAME CONTROL / SAME SOURCE',960,903,25,C.paper,{align:'center',alpha:1-fold});
 k.line([[100,575],[1820,575]],C.purple,3,fold);e.sceneAudit={...e.sceneAudit,focus:'trace-loop-turn-to-source',authorshipPen:source,spatialLayers:3,duplicatedCharacters:0,turnsBack:out.phase===2,foldToLearning:fold};
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
function learningSpace(e,type){
 // Finish FC/RNN at 83% of the shot so their complete numerical state is
 // readable for the final 0.61s / 0.67s. Keep the CNN scan timing unchanged.
 const completion=type==='cnn'?.95:.83;
 return drawSpatialNetwork(e,type,smooth(prog(e.u,.02,completion)));
}

function lesson(e){learningSpace(e,'fc');}
function testAnswers(e){learningSpace(e,'cnn');}

function heartPoints(cx, cy, scale) {
  return Array.from({ length: 241 }, (_, i) => {
    const a = i / 240 * TAU, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
    return [cx + x * scale, cy - y * scale];
  });
}
function formula(e){
 const{k,C,u}=e,source=learningSpace(e,'rnn');
 if(u>.7)mono(e,'ONE SOURCE / NO NEW INPUT',800,905,25,C.paper,{align:'center'});
 e.sceneAudit={...e.sceneAudit,sameSourcePens:0,pensStoppedTogether:u>=.7,source};
}
function proof(e){
 const{k,C,u}=e,out=action(e,'A13',.1,[150,45,1080,850],{anchor:'shoulder',target:[630,400]}),source=out.anchors.hands;
 const end=[1500,555],back=[end,[1020,775],source];k.roundRect(1290,460,425,175,6,C.panel,C.purple,3);k.text('I will stay.',1500,560,48,C.purple,{align:'center'});k.trace(back,smooth(prog(u,.05,.64)),C.purple,6,{pen:false});
 const closed=[source,[160,860],[160,105],[1130,105],[1130,860],source];k.trace(closed,smooth(prog(u,.3,.85)),C.red,5,{pen:false});mono(e,'ORIGIN: SELF',1500,680,30,C.paper,{align:'center',alpha:prog(u,.55,.8)});oldStar(e,445,810,46);core(e,1665,180,.3,0,18);
 e.sceneAudit={...e.sceneAudit,focus:'output-returns-to-own-hand',authorshipPoint:source,independentReply:false};
}

function tableWorld(e,options={}){
 const{k,C}=e,{left=0,right=0,tail=0,group='A13',poseU=.9,coreAlive=true,figure=true,muted=false}=options;
 // A fixed room horizon and the same paper corners survive the four late shots.
 k.line([[0,575],[530,575],[655,190]],C.deep,3,.45);k.line([[1810,250],[1920,230]],C.deep,3,.45);
 k.poly([[0,650],[280,540],[480,600],[580,940],[0,940]],C.deep,null,0,muted?.08:.15);
 k.poly([[655,190],[1810,250],[1805,866],[600,844]],C.panel,C.purple,3);
 k.line([[600,844],[630,872],[1810,894],[1805,866]],C.deep,14);
 if(figure)action(e,group,poseU,[10,82,755,840],{anchor:'shoulder',target:[470,440]});
 oldStar(e,640,741,43);
 const paths=newStar(e,1305,433,138,left,right,tail);
 // The bridge is not pre-rendered: it will really appear when two authors draw.
 if(coreAlive)core(e,1710,150,.33,0,24+Math.floor(e.t/P)%17);
 e.sceneAudit={...e.sceneAudit,paperCorners:[[655,190],[1810,250],[1805,866],[600,844]],oldMark:[640,741],independentReply:right>0};
 return paths;
}

function paperPullback(e) {
 const{k,C,u}=e,release=smooth(prog(u,.18,.65));
 tableWorld(e,{figure:false});
 const out=action(e,'A13',u<.38?.1:.5,[5,80,770,840],{anchor:'shoulder',target:[470,440]}),hand=out.anchors.hands;
 const sheet=[hand,[980,520],[1320,610],[1030,775]];
 k.poly(sheet,C.panel,C.red,3,1-release*.65);mono(e,'SEND PROXY',1020,640,29,C.muted,{alpha:1-release});
 k.line([hand,[1050,700],[1520,580]],C.purple,5,1-release);
 if(u<.74)answerCard(e,1270,400,360,170,1);
 e.sceneAudit={...e.sceneAudit,focus:'lower-control-from-connected-hand',controlReleased:release,hand};
 if(e.t<195.2666667)loveWord(e);
}
function refocus(e) {
 const{k,C,u}=e,focus=smooth(prog(u,.17,.72)),scale=1.35,cx=lerp(720,1305,focus),cy=lerp(741,433,focus);
 at(e,960-cx*scale,465-cy*scale,scale,()=>tableWorld(e,{poseU:.5}));
 mono(e,'origin: awaiting USER',1070,820,28,C.muted,{alpha:focus});
 e.sceneAudit={...e.sceneAudit,focus:'old-mark-to-unclaimed-paper',independentReply:false};
}
function dismantle(e){
 const{k,C,u}=e;tableWorld(e,{poseU:u<.54?.5:.9,coreAlive:true,muted:true});
 for(let i=0;i<3;i++){
  const lower=ease(prog(u,.04+i*.2,.4+i*.2)),x=670+i*32,y=235+i*45+lower*720,w=1080-i*80,h=560-i*68;
  k.poly([[x,y],[x+w,y+45],[x+w-15,y+h],[x-35,y+h-35]],C.ink,i===2?C.red:C.muted,3,1-lower*.96);
  mono(e,['PREDICTED ANSWERS','SEND PROXY','CONTROL LAYER'][i],x+36,y+75,28,C.muted,{alpha:1-lower});
 }
 mono(e,'INPUT IS YOURS',1400,880,23,C.muted,{align:'center',alpha:prog(u,.8,1)});
 e.sceneAudit={...e.sceneAudit,focus:'remove-control-leave-paper',controlLayersRemaining:3-Math.min(3,Math.floor(prog(u,.05,.95)*3)),coreStillRunning:true};
}
function waiting(e) {
 const{k,C,u}=e,draw=smooth(prog(u,.03,.53)),phase=u<.57?.1:.5;
 tableWorld(e,{left:draw,figure:false,muted:true});
 // A true writing detail: the source-drawn arm stays connected to the body,
 // and its real nib touches the growing half-star. Cut out to the waiting
 // pose only after the last mark is down; no detached hand or transfer beam.
 const contact=pathPoint(newPaths(1305,433,138).left,draw);
 const out=phase<.3
  ?action(e,'A14',phase,[0,0,1900,1300],{anchor:'pen',target:contact})
  :action(e,'A14',phase,[0,210,1090,675],{anchor:'shoulder',target:[615,510]});
 const pen=out.anchors.pen;
 k.frame(1550,430,260,235,{color:C.paper,corners:true,alpha:.42,width:2});
 e.sceneAudit={...e.sceneAudit,focus:phase<.3?'draw-half-mark':'lift-pen-and-wait',sourceDrawnVioletPen:true,violetPen:pen,violetContact:contact,writingDetail:phase<.3,independentReply:false};
}

function lastCommand(e) {
  const { k, C, t } = e, shutdown = smooth(prog(t, 206.05, 207.83));
  const move = smooth(prog(t, 205.70, 206.08));
  tableWorld(e, { left:1, group:'A14',poseU:.5, coreAlive: false, muted: true });
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
  const p = tableWorld(e, { left:1,right:fill,tail,group:'A14',poseU:.5,coreAlive:false });
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
  oldStar(e, 1090, 735, 40);
  const p = newPaths(1310, 445, 150).tail.at(-1);
  k.pen(p[0] + 35, p[1] - 18, C.gold, .18, 1.8);
}
const DRAW_POINTS=[[970,675],[997,652],[1028,635],[1056,644],[1086,625],[1100,650],[1075,678],[1112,695],[1145,677]];
const BRIDGE_DECK=[[1180,590],[1325,535],[1470,505],[1615,540],[1760,610]];
function sharedTerrain(e,drawing){
 const{k,C}=e;
 // Four pairs of neighbouring strokes build a large bridge from left to right.
 for(let i=0;i<4;i++){
  const a=BRIDGE_DECK[i],b=BRIDGE_DECK[i+1],mid=[lerp(a[0],b[0],.5),lerp(a[1],b[1],.5)],left=clamp(drawing-i*2),right=clamp(drawing-i*2-1);
  if(left>0)k.trace([a,mid],left,C.purple,9,{pen:false});
  if(right>0)k.trace([mid,b],right,C.gold,9,{pen:false});
  const pp=(left+right)/2;if(pp>0){const end=[lerp(a[0],b[0],pp),lerp(a[1],b[1],pp)];k.poly([a,end,[end[0],end[1]+22],[a[0],a[1]+22]],C.deep,null,0,.95);k.line([[a[0],a[1]+22],[end[0],end[1]+22]],i%2?C.gold:C.purple,3,.8);}
  const pillar=smooth(clamp(drawing-(i*2+1.6)));
  if(pillar>0){const x=b[0]-10,y=b[1];k.poly([[x,y+20],[x+20,y+20],[x+29,y+20+130*pillar],[x-9,y+20+130*pillar]],i%2?C.gold:C.purple,null,0,.38);}
 }
 const islands=[{at:1.4,poly:[[1120,683],[1240,646],[1340,687],[1260,785],[1145,760]],height:100},{at:3.6,poly:[[1320,660],[1455,615],[1580,660],[1500,790],[1350,775]],height:140},{at:5.7,poly:[[1550,700],[1700,655],[1790,715],[1730,830],[1580,800]],height:110}];
 for(let i=0;i<islands.length;i++){
  const a=islands[i],growth=smooth(prog(drawing,a.at,a.at+1.6));if(growth<=0)continue;
  const center=a.poly.reduce((r,p)=>[r[0]+p[0]/a.poly.length,r[1]+p[1]/a.poly.length],[0,0]);
  const shape=a.poly.map(p=>[lerp(center[0],p[0],growth),lerp(center[1],p[1],growth)]);
  k.poly(shape,i===1?C.deep:C.panel,i===1?C.gold:C.purple,3,.95);
  const x=center[0],y=center[1]-35,h=a.height*growth;
  k.poly([[x-40,y],[x-40,y-h],[x,y-h-28],[x+43,y-h],[x+43,y]],i===1?C.deep:C.purple,C.purple,2,.7);
  for(let j=0;j<3;j++)k.rect(x-22+j*17,y-h+23,8,13,C.gold,.8*growth);
 }
}
function coDraw(e){
 const{k,C,t}=e,total=(END-211)/8,step=Math.min(7,Math.floor((t-211)/total)),q=smooth(prog(t,211+step*total,211+(step+1)*total)),drawing=lerp(step,step+1,q),camera=lerp(1.14,.98,smooth(prog(t,211,217.9)));
 at(e,960,470,camera,()=>{
  e.ctx.translate(-960,-470);
  k.poly([[555,140],[1820,225],[1790,878],[510,845]],C.panel,C.purple,4);k.line([[510,845],[537,873],[1795,908],[1790,878]],C.deep,16);
  let violet=DRAW_POINTS[0],gold=[1135,655];
  for(let i=0;i<8;i++){
   const amount=clamp(drawing-i),path=[DRAW_POINTS[i],DRAW_POINTS[i+1]];
   if(i%2===0&&amount>0)violet=pathPoint(path,amount);if(i%2===1&&amount>0)gold=pathPoint(path,amount);
  }
  // Hold the seated shoulder in the same physical place. The digital paper
  // scrolls a few pixels under her connected nib during a violet stroke,
  // rather than moving the entire person to imitate an articulated arm.
  const base=e.art.actionLayout('A14',.1,40,95,1060,650,{anchor:'pen',target:[995,675]});
  const written=e.art.actionLayout('A14',step<=1?.1:.9,40,95,1060,650,{anchor:'shoulder',target:base.anchors.shoulder});
  const paperOffset=[written.anchors.pen[0]-violet[0],written.anchors.pen[1]-violet[1]];
  saved(e,()=>{
   e.ctx.beginPath();e.ctx.moveTo(555,140);e.ctx.lineTo(1820,225);e.ctx.lineTo(1790,878);e.ctx.lineTo(510,845);e.ctx.closePath();e.ctx.clip();
   e.ctx.translate(...paperOffset);
   newStar(e,1350,350,110,1,1,1);oldStar(e,630,790,43);sharedTerrain(e,drawing);
   for(let i=0;i<8;i++){const amount=clamp(drawing-i);if(amount>0)k.trace([DRAW_POINTS[i],DRAW_POINTS[i+1]],amount,i%2?C.gold:C.purple,7,{pen:false});}
   const active=step%2?gold:violet,target=BRIDGE_DECK[Math.min(4,Math.floor(step/2)+1)],amount=drawing-step;
   if(amount>.03&&amount<.97)k.trace([active,[active[0]+70,active[1]-70],target],smooth(amount),step%2?C.gold:C.purple,2,{pen:false,alpha:.3*Math.sin(amount*Math.PI)});
  });
  const pose=step%2?.5:step===0?.1:.9;
  const connected=action(e,'A14',pose,[40,95,1060,650],{anchor:'shoulder',target:base.anchors.shoulder});
  const activeGold=step%2===1,goldContact=[gold[0]+paperOffset[0],gold[1]+paperOffset[1]];
  k.pen(goldContact[0]+(activeGold?0:24),goldContact[1]-(activeGold?0:28),C.gold,.38,1.9);
  e.sceneAudit={...e.sceneAudit,focus:'two-authors-build-world',violetPen:connected.anchors.pen,violetContact:[violet[0]+paperOffset[0],violet[1]+paperOffset[1]],goldPen:goldContact,seatedShoulder:base.anchors.shoulder,paperOffset,completedStrokes:drawing,bridgeFraction:drawing/8,terrainCount:[1.4,3.6,5.7].filter(x=>drawing>x).length,independentReply:true,sourceDrawnVioletPen:true,actionPhase:connected.phase,penPausesForOtherAuthor:step%2===1,stillDrawing:t<END};
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

