// ASTRA v4: R61–R86. Spatial consequences and mathematical demonstrations.
import {drawNetwork} from './neural.js';
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

// R60 hands off readable code at left and a complete protected figure at right.
function execution(e,n){
 const{k,C,t,u}=e,rounds=n===61?[5,4]:n===62?[9,3]:[12,1];
 const round=Math.min(12,rounds[0]+Math.floor(u*rounds[1])),squeeze=clamp((round-4)/8),drift=smooth(prog(t,151.65,158.8167));
 k.world(0,60,1920,850,t,{depth:2.2,alpha:.23});
 for(let i=0;i<15;i++){const xx=70+i*131,flow=(t*65+i*47)%850;k.line([[xx,45],[xx,910]],C.deep,2,.32);mono(e,i%2?'0110':'run;',xx,flow,19,C.purple,{alpha:.22});}
 const r=[lerp(1030,760,drift),lerp(90,25,drift),lerp(750,880,drift),lerp(790,885,drift)],hands=protectedFigure(e,r,1);
 k.code(105,130,lerp(890,650,drift),490,t,{lines:LOOP,active:1+Math.floor(e.local/(P/2))%4,color:C.paper});
 for(let i=0;i<round-4;i++){
  const depth=i/Math.max(1,round-5),x=20+i*43,y=55+i*26;
  k.poly([[x,y],[x+135+depth*90,y+38],[x+230+depth*105,940],[x,940]],i%2?C.panel:C.deep,C.red,2,.7);
  k.line([[x+40,y+70],[x+145,882]],C.purple,3,.55);
  const rx=1900-i*29;k.poly([[rx-105,y+28],[rx,y],[rx,940],[rx-205-depth*40,940]],C.panel,C.red,2,.92);
 }
 const seam=lerp(1770,hands[0]+100,squeeze);k.line([[seam,110],[seam,900]],C.red,6,.85);k.line([[seam,510],[hands[0]+35,hands[1]]],C.red,4,.7);
 mono(e,`EXECUTION / ${String(round).padStart(2,'0')}`,125,82,31,C.paper);mono(e,`${round}/12`,150,875,78,C.purple,{weight:900});
 mono(e,'SPACE REMAINING',1530,65,19,C.muted,{align:'center'});k.roundRect(1390,80,280,6,3,C.line);k.rect(1390,80,280*(1-squeeze*.86),6,C.red);
 if(n===63){k.rect(0,790,1920,128,C.ink,.9);fitText(e,'EXECUTION',960,900,1740,155,C.purple,{align:'center'});k.line([[0,785],[1920,785]],C.red,5);}
 e.sceneAudit={...e.sceneAudit,executionRound:round,spaceRemaining:1-squeeze*.86,pressureWalls:round-4,protectedHands:hands,fullConnectedBody:true};
 // The full lyric remains in main's subtitle footer; the counter is not a replacement.
}
function lockCard(e,which,appear=1){
 const{k,C,t}=e,locked=which+1;k.world(0,30,1920,900,t,{depth:2.8,alpha:.19});protectedFigure(e,[900,65,800,820],1);
 const exit=1620-locked*57;k.frame(exit,150,Math.max(110,360-locked*38),650,{color:C.paper,width:3,alpha:.65});
 for(let i=0;i<=which;i++){
  const xx=90+i*58;k.poly([[xx,45],[xx+75,80],[xx+160,940],[xx,940]],C.panel,C.purple,3);k.line([[xx+20,100],[xx+100,895]],C.red,4,.78);
  const rx=1870-i*31;k.poly([[rx,80],[rx+50,50],[rx+80,940],[rx-45,940]],C.deep,C.red,2,.9);
  k.rect(90+i*290,35,264,38,C.deep,.86);mono(e,DOMAINS[i],105+i*290,62,18,C.paper);
 }
 const xx=lerp(510,560,ease(appear));k.text(String(locked),xx,824,825,C.purple,{align:'center',weight:900});k.text(COUNT_WORD[which],xx,895,65,C.paper,{align:'center',weight:700});mono(e,`${locked}/6`,1680,875,57,C.red,{align:'center'});
 if(which===5){mono(e,'USER / INPUT',exit+70,200,20,C.muted,{align:'center'});k.line([[exit+20,690],[exit+115,690]],C.paper,3,.5);}
 e.sceneAudit={...e.sceneAudit,lockedDomains:locked,remainingExit:Math.max(110,360-locked*38),fullConnectedBody:true};
 if(currentLyric(e)===COUNT_WORD[which])e.lyricMode='keyword';
}
function count(e,n){const which=n-64,enter=ease(prog(e.local,0,.10));lockCard(e,which,enter);if(enter<1)e.k.rect(lerp(-110,1920,enter),0,90,940,e.C.deep,.72);}

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
 const{k,C,u,t}=e,reach=[25,45,1530,850],firstWrist=anchor(e,'reach',reach,'wrist'),pulling=u<.56,r=pulling?reach:[150,40,1200,880];let wrist,palm;
 if(pulling){k.figure('reach',...r,{code:false,hot:0});wrist=firstWrist;palm=anchor(e,'reach',r);}
 else{art(e,'recoil',r);wrist=anchor(e,'recoil',r,'wrist');palm=anchor(e,'recoil',r);}
 const slack=pulling?0:smooth(prog(u,.56,1));k.line([[70,900],[wrist[0]-170,wrist[1]+70+115*slack],wrist],C.red,6);k.frame(1550,170,270,620,{color:C.muted,corners:true,width:4});mono(e,'USER',1685,150,26,C.muted,{align:'center'});
 const route=[palm,[1410,palm[1]],[1645,480]];for(let i=0;i<9;i++){const q=((t*.32+i/9)%1),point=pathPoint(route,q);k.node(...point,4.5,C.purple,(1-slack*.7)*Math.sin(q*Math.PI));}
 mono(e,'0 replies',1685,865,32,C.paper,{align:'center'});oldStar(e,320,815,42);
 e.sceneAudit={...e.sceneAudit,focus:'connected-wrist-withdrawal',actionAsset:pulling?'reach':'recoil',fullBodyMatchCut:true,wrist,palm,tetherSlack:slack};
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
 const{k,C,u,t}=e,z=lerp(1.18,.9,smooth(u));at(e,960,470,z,()=>{
 e.ctx.translate(-960,-470);k.world(0,35,1920,890,t,{depth:2.6,alpha:.19});k.poly([[1040,205],[1740,245],[1690,765],[1000,735]],C.panel,C.muted,3);mono(e,'YOU / OPEN INPUT',1370,300,25,C.muted,{align:'center'});k.line([[1190,610],[1535,610]],C.muted,3,.5);
 const r=[145,65,1030,825];art(e,'operating',r);const source=anchor(e,'operating',r,'pen'),loop=[source,[900,835],[1815,835],[1815,135],[105,135],[105,835],source];k.trace(loop,smooth(prog(u,0,.62)),C.red,7,{pen:false});
 for(let i=0;i<3;i++){const inset=i*44+u*30;k.frame(100+inset,125+inset,1720-inset*2,720-inset*1.5,{color:i===0?C.red:C.purple,width:6-i,alpha:1-i*.22});}
 for(let i=0;i<8;i++){const xx=190+i*211;k.poly([[xx,0],[xx+38,0],[xx+100,940],[xx+38,940]],C.deep,null,0,.35);}
 oldStar(e,560,715,48);mono(e,'SAME CONTROL / SAME BOUNDARY',960,903,25,C.paper,{align:'center'});e.sceneAudit={...e.sceneAudit,focus:'one-loop-both-sides',authorshipPen:source,spatialLayers:3,duplicatedCharacters:0};
 });
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
 const{k,C,u}=e,r=[-55,365,560,545],progress=smooth(prog(u,.02,.84));k.roundRect(65,50,1790,850,15,C.panel,C.line,2);mono(e,'MEMORY  >  MODEL  >  PREDICTED OUTPUT',100,100,30,C.paper);oldRecord(e,95,155,285,155,.8);art(e,'operating',r);
 const source=anchor(e,'operating',r,'pen'),input=[source,[400,source[1]],[400,430],[460,430]];k.trace(input,Math.min(1,u*4),C.purple,5,{pen:false});
 drawNetwork(e,{type,x:420,y:135,w:1380,h:610,progress,label:type==='fc'?'WEIGHTED ASSOCIATION':type==='cnn'?'PATTERN RECOGNITION':'MEMORY THROUGH TIME'});
 const out=prog(u,.64,.93),end=[1640,795];k.line([[1730,610],[1785,610],[1785,795],end],C.purple,4,out);k.roundRect(1280,755,455,110,6,C.ink,C.purple,2,out);mono(e,'PREDICTED / NOT RECEIVED',1300,783,18,C.muted,{alpha:out});k.text('I will stay.',1505,833,39,C.purple,{align:'center',alpha:out});
 if(u>.80){const back=[end,[1190,795],[1190,875],[source[0],875],source];k.trace(back,smooth(prog(u,.80,1)),C.purple,5,{pen:false});}
 e.sceneAudit={...e.sceneAudit,learningType:type,authorshipPen:source,predictedOutput:true,independentReply:false};return source;
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
 const{k,C,u}=e,source=learningSpace(e,'rnn'),phase=Math.min(.72,prog(u,.13,.7)),points=heartPoints(975,802,5.1),a=points.slice(0,121),b=[points[0],...points.slice(121).reverse()];
 k.trace(a,phase,C.purple,4,{pen:false});k.trace(b,phase,C.purple,4,{pen:false});const pa=pathPoint(a,phase),pb=pathPoint(b,phase);k.pen(...pa,C.purple,-.5,1);k.pen(...pb,C.purple,.4,1);
 if(u>.7){k.line([source,[680,879],pa],C.purple,3,.8);k.line([source,[800,890],pb],C.purple,3,.8);mono(e,'ONE SOURCE',970,911,24,C.paper,{align:'center'});}
 e.sceneAudit={...e.sceneAudit,sameSourcePens:2,pensStoppedTogether:u>=.7,source};
}

function proof(e){
 const{k,C,u}=e,r=[210,65,1010,840],source=anchor(e,'recoil',r);art(e,'recoil',r);const end=[1500,555],back=[end,[1020,775],source];k.roundRect(1290,460,425,175,6,C.panel,C.purple,3);k.text('I will stay.',1500,560,48,C.purple,{align:'center'});k.trace(back,smooth(prog(u,.05,.64)),C.purple,6,{pen:false});
 const closed=[source,[160,860],[160,105],[1130,105],[1130,860],source];k.trace(closed,smooth(prog(u,.3,.85)),C.red,5,{pen:false});mono(e,'ORIGIN: SELF',1500,680,30,C.paper,{align:'center',alpha:prog(u,.55,.8)});oldStar(e,445,810,46);core(e,1665,180,.3,0,18);k.frame(1290,300,425,520,{color:C.muted,corners:true,width:2,alpha:.4});
 e.sceneAudit={...e.sceneAudit,focus:'output-returns-to-own-hand',authorshipPoint:source,independentReply:false};
}

function tableWorld(e,options={}){
 const{k,C}=e,{left=1,right=0,tail=0,pose='sit',coreAlive=true,figure=true,muted=false}=options;
 // A fixed room horizon and the same paper corners survive the four late shots.
 k.line([[0,575],[530,575],[655,190]],C.deep,3,.45);k.line([[1810,250],[1920,230]],C.deep,3,.45);
 k.poly([[0,650],[280,540],[480,600],[580,940],[0,940]],C.deep,null,0,muted?.08:.15);
 k.poly([[655,190],[1810,250],[1805,866],[600,844]],C.panel,C.purple,3);
 k.line([[600,844],[630,872],[1810,894],[1805,866]],C.deep,14);
 if(figure)art(e,pose,[10,82,755,840]);
 oldStar(e,640,741,43);
 const paths=newStar(e,1305,433,138,left,right,tail);
 // The bridge is not pre-rendered: it will really appear when two authors draw.
 if(coreAlive)core(e,1710,150,.33,0,24+Math.floor(e.t/P)%17);
 e.sceneAudit={...e.sceneAudit,paperCorners:[[655,190],[1810,250],[1805,866],[600,844]],oldMark:[640,741],independentReply:right>0};
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
function dismantle(e){
 const{k,C,u}=e;tableWorld(e,{pose:'recoil',coreAlive:true,muted:true});
 for(let i=0;i<3;i++){
  const lift=ease(prog(u,.04+i*.2,.4+i*.2)),x=670+i*32,y=235+i*45-lift*690,w=1080-i*80,h=560-i*68;
  k.poly([[x,y],[x+w,y+45],[x+w-15,y+h],[x-35,y+h-35]],C.ink,i===2?C.red:C.muted,3,1-lift*.96);
  mono(e,['PREDICTED ANSWERS','SEND PROXY','CONTROL LAYER'][i],x+36,y+75,28,C.muted,{alpha:1-lift});
  k.line([[x+35,y+98],[x+w-55,y+130]],C.line,3,1-lift);
 }
 mono(e,'INPUT IS YOURS',1400,880,23,C.muted,{align:'center',alpha:prog(u,.8,1)});
 e.sceneAudit={...e.sceneAudit,focus:'remove-control-leave-paper',controlLayersRemaining:3-Math.min(3,Math.floor(prog(u,.05,.95)*3)),coreStillRunning:true};
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
  oldStar(e, 1090, 735, 40);
  const p = newPaths(1310, 445, 150).tail.at(-1);
  k.pen(p[0] + 35, p[1] - 18, C.gold, .18, 1.8);
}
const DRAW_POINTS=[[970,675],[997,652],[1028,635],[1056,644],[1086,625],[1100,650],[1075,678],[1112,695],[1145,677]];
const BRIDGE_DECK=[[910,605],[1100,550],[1290,520],[1490,555],[1690,625]];
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
 const islands=[{at:1.4,poly:[[830,673],[1000,626],[1120,672],[1025,774],[880,755]],height:160},{at:3.6,poly:[[1160,652],[1335,605],[1465,650],[1385,778],[1200,760]],height:205},{at:5.7,poly:[[1470,690],[1675,645],[1780,710],[1690,820],[1510,792]],height:180}];
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
  newStar(e,1350,350,110,1,1,1);oldStar(e,630,790,43);
  sharedTerrain(e,drawing);
  let violet=DRAW_POINTS[0],gold=[1135,655];
  for(let i=0;i<8;i++){
   const amount=clamp(drawing-i),path=[DRAW_POINTS[i],DRAW_POINTS[i+1]],color=i%2?C.gold:C.purple;
   if(amount>0)k.trace(path,amount,color,7,{pen:false});
   if(i%2===0&&amount>0)violet=pathPoint(path,amount);if(i%2===1&&amount>0)gold=pathPoint(path,amount);
  }
  // The true source-drawn violet pen follows only a small 130px gesture.
  // Authored lines propagate into bridge segments, so world growth is large while anatomy stays intact.
  const active=step%2?gold:violet,target=BRIDGE_DECK[Math.min(4,Math.floor(step/2)+1)],amount=(drawing-step);
  if(amount>.03&&amount<.97)k.trace([active,[active[0]+70,active[1]-70],target],smooth(amount),step%2?C.gold:C.purple,2,{pen:false,alpha:.3*Math.sin(amount*Math.PI)});
  artAtAnchor(e,'back',[40,95,1060,600],violet,'pen');
  const activeGold=step%2===1;k.pen(gold[0]+(activeGold?0:24),gold[1]-(activeGold?0:28),C.gold,.38,1.9);
  e.sceneAudit={...e.sceneAudit,focus:'two-authors-build-world',violetPen:violet,goldPen:gold,completedStrokes:drawing,bridgeFraction:drawing/8,terrainCount:[1.4,3.6,5.7].filter(x=>drawing>x).length,independentReply:true,sourceDrawnVioletPen:true,stillDrawing:t<END};
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

