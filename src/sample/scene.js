// ASTRA: an unfinished world. Source-audio seconds, deterministic 60 fps export.
// Artwork is mandatory; failed or missing images must never become an export.
const V={width:1920,height:1080};
const START=11584/60,END=12740/60;
const CUE={answer:11702/60,face:11868/60,together:12034/60,light:12338/60,peak:12366/60,quiet:12429/60};
const C={ink:'#17151d',paper:'#f4efe5',purple:'#b9a4e6',gold:'#e9bd78',muted:'#59505f'};
const params=new URLSearchParams(location.search);
const canvas=document.querySelector('#stage');
canvas.width=Math.max(64,Number(params.get('w')||1920));
canvas.height=Math.max(64,Number(params.get('h')||1080));
const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,p)=>a+(b-a)*p;
const prog=(t,a,b)=>clamp((t-a)/(b-a));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const out=v=>1-(1-clamp(v))**3;
const TAU=Math.PI*2;
let assets=null,portraitBounds=null,seatedBounds=null;
// Populated only with approved source-image coordinates. Identity artwork must be
// an exact vector, never an approximation drawn by the character generator.
const EMBLEMS={
  seated:[{x:429/1067,y:184/1474,width:41.6/1067},{x:486/1067,y:694/1474,width:38.4/1067}],
  neutral:[{x:477/1193,y:487/1319,width:118.4/1193},{x:506/1193,y:1138/1319,width:67.2/1193}],
  smile:[{x:477/1193,y:487/1319,width:118.4/1193},{x:506/1193,y:1138/1319,width:67.2/1193}],
};
const LOGO_BOUNDS={x:118.557,y:119.958,w:484.139,h:479.818};

function loadImage(path){return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error(`Required artwork is missing: ${path}`));
  img.src=new URL(path,import.meta.url).href;
});}
function alphaBounds(img){
  const off=document.createElement('canvas');off.width=img.naturalWidth;off.height=img.naturalHeight;
  const g=off.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const {data}=g.getImageData(0,0,off.width,off.height);
  let x0=off.width,y0=off.height,x1=-1,y1=-1;
  for(let y=0;y<off.height;y+=2)for(let x=0;x<off.width;x+=2)if(data[(y*off.width+x)*4+3]>8){
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
  }
  if(x1<0)throw new Error('Required artwork is fully transparent');
  const x=Math.max(0,x0-3),y=Math.max(0,y0-3);
  return{x,y,w:Math.min(off.width,x1+5)-x,h:Math.min(off.height,y1+5)-y};
}
function asset(img){return{image:img,bounds:alphaBounds(img)};}
function line(points,color=C.paper,width=1,alpha=1){
  if(points.length<2||alpha<=0)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.lineCap='butt';ctx.lineJoin='miter';ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1))ctx.lineTo(...p);ctx.stroke();ctx.restore();
}
function polygon(points,color,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();ctx.restore();
}
function circle(x,y,r,color,width=1,alpha=1,start=0,end=TAU){
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.restore();
}
function curve(a,b,c,d,n=64){return Array.from({length:n+1},(_,i)=>{
  const t=i/n,s=1-t;return[s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]];
});}
function portion(points,p){
  if(p<=0)return[];if(p>=1)return points;
  const lengths=points.slice(1).map((v,i)=>Math.hypot(v[0]-points[i][0],v[1]-points[i][1]));
  let left=lengths.reduce((a,b)=>a+b,0)*p;const result=[points[0]];
  for(let i=1;i<points.length;i++){
    if(left>=lengths[i-1]){result.push(points[i]);left-=lengths[i-1];}
    else{const p=left/lengths[i-1];result.push([lerp(points[i-1][0],points[i][0],p),lerp(points[i-1][1],points[i][1],p)]);break;}
  }return result;
}
function nib(x,y,color,angle=-.65,scale=1){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
  polygon([[0,0],[7,-17],[11,-13]],color);line([[7,-17],[12,-26],[16,-22],[11,-13]],color,1.4);
  ctx.restore();
}
function ink(points,p,color,width=2.5,alpha=1,pen=true){
  const part=portion(points,p);if(part.length<2)return;
  line(part,color,width,alpha);
  if(p<1&&pen){const a=part.at(-2),b=part.at(-1);nib(b[0],b[1],color,Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2,.78);}
}
function drawFit(which,rect,alpha=1,b=which.bounds){
  const s=Math.min(rect.w/b.w,rect.h/b.h),w=b.w*s,h=b.h*s,x=rect.x+(rect.w-w)/2,y=rect.y+(rect.h-h)/2;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(which.image,b.x,b.y,b.w,b.h,x,y,w,h);ctx.restore();
  return{x,y,w,h,scale:s,bounds:b};
}
function emblems(key,placement,alpha=1){
  if(!assets.logo)return;
  const original=assets[key].image,b=placement.bounds;
  for(const mark of EMBLEMS[key==='seatedSmile'?'seated':key]){
    const x=placement.x+(mark.x*original.naturalWidth-b.x)*placement.scale;
    const y=placement.y+(mark.y*original.naturalHeight-b.y)*placement.scale;
    const w=mark.width*original.naturalWidth*placement.scale;
    const logoHeight=w*LOGO_BOUNDS.h/LOGO_BOUNDS.w;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);
    ctx.drawImage(assets.logo,LOGO_BOUNDS.x,LOGO_BOUNDS.y,LOGO_BOUNDS.w,LOGO_BOUNDS.h,-w/2,-logoHeight/2,w,logoHeight);ctx.restore();
  }
}
function cross(x,y,r,color=C.paper,alpha=.45){line([[x-r,y],[x+r,y]],color,1,alpha);line([[x,y-r],[x,y+r]],color,1,alpha);}

const STAR=[[0,-86],[26,-30],[84,-27],[42,13],[52,72],[0,42],[-52,72],[-42,13],[-84,-27],[-26,-30],[0,-86]];
const STAR_LEFT=STAR.slice(5),STAR_RIGHT=STAR.slice(0,6);
// A deliberate angular detour: the answer is a new decision, not an echo.
const TAIL=[[52,72],[95,101],[113,86],[153,108],[186,93],[207,101]];
const STAR_X=1294,STAR_Y=402;
const INPUT=[[1940,321],[1792,321],[1725,346],[1472,346],[1418,316],[1294,316]];
const FRAME_TOP=[[120,251],[120,98],[1792,98],[1792,251]];
const BRIDGE_CURVE=curve([810,866],[1110,748],[1485,751],[1768,838],84);
const FRAME_SEED=BRIDGE_CURVE.map((_,i)=>[lerp(810,1768,i/84),942]);
const TO_STAR_PURPLE=curve([1284,787],[1195,683],[1199,548],[1252,415]);
const TO_STAR_GOLD=curve([1464,798],[1529,684],[1493,543],[1346,474]);

function background(t){
  ctx.fillStyle=C.ink;ctx.fillRect(0,0,V.width,V.height);
  // Fixed ink marks are graphic registration, never a flashing particle field.
  cross(67,98,8,C.paper,.5);cross(1853,942,8,C.paper,.5);
  line([[49,1015],[160,1015]],C.paper,2,.55);
  line([[1760,65],[1871,65]],C.purple,2,.55);
  for(let i=0;i<5;i++)line([[60+i*8,1031],[60+i*8,1037+(i===0?7:0)]],C.paper,1,.3);
  line([[146,136],[158,136],[158,148]],C.purple,1,.5);
  line([[1750,889],[1750,901],[1738,901]],C.paper,1,.38);
}
function worldFrame(t){
  const release=smooth(prog(t,CUE.together,CUE.together+1.15));
  line(FRAME_TOP,C.paper,1.5,lerp(.34,.18,release));
  line([[120,702],[120,942],[810,942]],C.paper,1.5,.34);
  line([[1792,942],[1792,596]],C.paper,1.5,.34*(1-release));
  // The old bottom border literally lifts into the bridge.
  const path=FRAME_SEED.map((p,i)=>[lerp(p[0],BRIDGE_CURVE[i][0],release),lerp(p[1],BRIDGE_CURVE[i][1],release)]);
  line(path,C.paper,1.8,.34);
  if(release<1)line([[1768,lerp(942,838,release)],[1792,942]],C.paper,1.5,.34*(1-release));
  const open=7+8*Math.sin((t-START)*.42);
  line([[1792,251],[1792+open,251]],C.gold,2,.8);
  line([[1792,596],[1792+open,596]],C.purple,2,.7);
}
function construction(t){
  const material=smooth(prog(t,CUE.together+1,CUE.light));
  line([[1087,888],[1087,724],[1145,724],[1145,681],[1206,681],[1206,755]],C.purple,1,.20+material*.11);
  line([[1505,893],[1505,689],[1563,689],[1563,716],[1644,716],[1644,877]],C.paper,1,.16+material*.08);
  line([[1600,716],[1600,629],[1661,629],[1705,673]],C.paper,1,.1+material*.08);
  line([[917,932],[1141,846],[1714,846],[1843,932]],C.purple,1,.18);
  line([[1105,932],[1220,846]],C.paper,1,.12);
  line([[1497,932],[1464,846]],C.paper,1,.12);
}
function star(t){
  const gold=out(prog(t,CUE.answer+.35,CUE.answer+1.47));
  const tail=prog(t,CUE.answer+1.62,CUE.face-.22);
  const lift=22*smooth(prog(t,CUE.light,CUE.quiet+1.3));
  const x=STAR_X,y=STAR_Y-lift;
  ctx.save();ctx.translate(x,y);
  const lit=smooth(prog(t,CUE.light,CUE.peak));
  if(lit>0)polygon(STAR,C.gold,lit*.9);
  ink(STAR_LEFT,1,C.purple,3,1,false);
  ink(STAR_RIGHT,gold,C.gold,3,1,true);
  ink(TAIL,tail,C.gold,2,1,true);
  if(lit>0)polygon([[0,-41],[15,-7],[43,0],[15,9],[0,38],[-14,9],[-42,0],[-14,-7]],C.paper,lit);
  ctx.restore();
  if(t<CUE.face){
    const entry=out(prog(t,CUE.answer,CUE.answer+.5));
    const opacity=1-smooth(prog(t,CUE.answer+.65,CUE.face-.16));
    ink(INPUT,entry,C.gold,2,opacity,true);
  }
  // Off-center construction arcs remain open; the answer does not seal a cage.
  const rotation=(t-START)*.025;
  circle(x,y,146,C.purple,1,.28,Math.PI*.57+rotation,Math.PI*1.22+rotation);
  circle(x,y,176,C.paper,1,.17,-.65+rotation,.1+rotation);
  cross(x-185,y+7,4,C.purple,.55);cross(x+210,y-88,4,C.gold,.55);
}
function oldStar(){
  const points=[[0,-24],[8,-8],[25,-5],[11,7],[15,24],[0,15],[-15,24],[-11,7],[-25,-5],[-8,-8],[0,-24]];
  ctx.save();ctx.translate(966,914);ctx.rotate(-.22);
  line(points.slice(5),C.purple,2,.8);line(points.slice(0,6),C.paper,2,.8);
  line([[15,24],[29,29],[39,25]],C.purple,1.5,.8);ctx.restore();
}
function character(t){
  const breath=Math.sin((t-START)*1.32)*.8;
  const settle=smooth(prog(t,CUE.together+.18,CUE.together+1));
  // A held illustration with a breathing camera, not simulated skeletal motion.
  const key=t>=CUE.together?'seatedSmile':'seated';
  const placed=drawFit(assets[key],{x:233+settle*9,y:79+breath,w:720,h:916},1,seatedBounds);
  emblems(key,placed);
  // A violet pen rests above the open right palm, then leaves for the first line.
  // Coordinates are registered to the approved palm, not the superseded index tip.
  if(t<CUE.together+.72){
    const palmX=placed.x+(838-placed.bounds.x)*placed.scale;
    const palmY=placed.y+(380-placed.bounds.y)*placed.scale;
    const travel=out(prog(t,CUE.together,CUE.together+.72));
    const path=curve([palmX+22,palmY-36],[1110,370],[1040,705],[810,866],60);
    const index=travel*60,lower=Math.min(59,Math.floor(index)),mix=index-lower;
    const p=[lerp(path[lower][0],path[lower+1][0],mix),lerp(path[lower][1],path[lower+1][1],mix)];
    nib(p[0],p[1],C.purple,lerp(.55,-.65,travel),.85);
  }
}
function bridge(t){
  if(t<CUE.together)return;
  const start=CUE.together;
  // Four alternating sections make two independent authors readable.
  const sections=[
    {a:0,b:.29,begin:.72,end:1.46,color:C.purple},
    {a:.29,b:.54,begin:1.55,end:2.25,color:C.gold},
    {a:.54,b:.77,begin:2.35,end:3.00,color:C.purple},
    {a:.77,b:1,begin:3.08,end:3.66,color:C.gold},
  ];
  for(const s of sections){
    const path=BRIDGE_CURVE.slice(Math.round(s.a*84),Math.round(s.b*84)+1);
    ink(path,prog(t,start+s.begin,start+s.end),s.color,3,1,true);
  }
  for(let i=0;i<8;i++){
    const x=950+i*99,y=BRIDGE_CURVE[Math.round((x-810)/958*84)][1];
    const p=prog(t,start+1.75+i*.20,start+2.03+i*.20);
    ink([[x,y],[x+4,y+48],[x-8,y+48]],p,i%2?C.gold:C.purple,1.5,.65,false);
  }
  const light=prog(t,start+3.82,CUE.light);
  const trailAlpha=1-.7*smooth(prog(t,CUE.quiet,CUE.quiet+1));
  ink(TO_STAR_PURPLE,light,C.purple,1.9,trailAlpha,true);
  ink(TO_STAR_GOLD,light,C.gold,1.9,trailAlpha,true);
  if(t>=CUE.light&&t<CUE.quiet+.2){
    // Both authors stay in the composition at the musical peak. After the accent,
    // the two nibs travel down to the next blank patch before drawing continues.
    const returnToPaper=smooth(prog(t,CUE.quiet,CUE.quiet+.2));
    const rise=22*smooth(prog(t,CUE.light,CUE.quiet+1.3));
    nib(lerp(1252,1109,returnToPaper),lerp(415-rise,854,returnToPaper),C.purple,-.62,1.06);
    nib(lerp(1346,1161,returnToPaper),lerp(474-rise,835,returnToPaper),C.gold,.58,1.06);
  }
  if(t<start+1){const p=out(prog(t,start,start+.55));nib(lerp(1630,1030,p),lerp(686,779,p),C.gold,-.55,1);}
  if(t>=CUE.quiet){
    const p=prog(t,CUE.quiet+.2,CUE.quiet+1.8),g=prog(t,CUE.quiet+1.92,END-.5);
    const purple=curve([1109,854],[1124,821],[1141,850],[1161,835],35);
    const gold=curve([1161,835],[1185,814],[1197,842],[1217,826],35);
    ink(purple,p,C.purple,2.4,.95,true);ink(gold,g,C.gold,2.4,.95,true);
    if(p>=1)nib(1161,835,C.purple,-.82,.78);
    if(g<=0&&t>=CUE.quiet+.2)nib(1161,835,C.gold,.58,.78);
    if(g>=1)nib(1217,826,C.gold,-.82,.78);
  }
}
function colorAccent(t){
  if(t<CUE.light||t>CUE.quiet)return;
  const p=prog(t,CUE.light,CUE.peak),fade=1-smooth(prog(t,CUE.peak+.04,CUE.quiet));
  const r=lerp(31,303,out(p));
  const y=STAR_Y-22*smooth(prog(t,CUE.light,CUE.quiet+1.3));
  // One expanding print impression; it never obscures the face or the two pens.
  for(let i=0;i<8;i++){
    const a=i*TAU/8+.14,len=lerp(12,71,Math.sin(p*Math.PI/2));
    const x=STAR_X+Math.cos(a)*r,yy=y+Math.sin(a)*r;
    const tangent=[-Math.sin(a),Math.cos(a)],radial=[Math.cos(a),Math.sin(a)];
    polygon([[x-tangent[0]*4,yy-tangent[1]*4],[x+tangent[0]*4,yy+tangent[1]*4],
      [x+radial[0]*len+tangent[0]*2,yy+radial[1]*len+tangent[1]*2],
      [x+radial[0]*len-tangent[0]*2,yy+radial[1]*len-tangent[1]*2]],i%2?C.gold:C.paper,fade*.8);
  }
  circle(STAR_X,y,lerp(106,275,out(p)),C.paper,1.8,fade*.65,.12,5.27);
}
function endingPhrase(t){
  const p=smooth(prog(t,CUE.quiet+.8,CUE.quiet+1.8));if(!p)return;
  ctx.save();ctx.globalAlpha=p*.8;ctx.fillStyle=C.paper;
  ctx.font='italic 27px Georgia, "Times New Roman", serif';
  ctx.textAlign='left';ctx.fillText('keep drawing.',1320,960);ctx.restore();
}
function wideShot(t){
  background(t);
  const pull=smooth(prog(t,CUE.together,CUE.quiet+2.6));
  const zoom=t<CUE.face?lerp(1,1.022,smooth(prog(t,START,CUE.face))):lerp(1.022,1,pull);
  ctx.save();ctx.translate(960,540);ctx.scale(zoom,zoom);ctx.translate(-960,-540);
  worldFrame(t);construction(t);colorAccent(t);bridge(t);character(t);oldStar();star(t);endingPhrase(t);
  ctx.restore();
}
function closeShot(t){
  background(t);
  const push=smooth(prog(t,CUE.face,CUE.together));
  const reaction=t>=198.6?1:0;
  polygon([[1193,99],[1792,99],[1792,942],[1193,942]],C.purple,.95);
  polygon([[1656,99],[1792,99],[1792,942],[1656,942]],C.paper);
  line([[120,251],[120,98],[1059,98]],C.paper,1.5,.35);
  line([[1510,942],[1792,942]],C.paper,1.5,.55);
  const rect={x:282-push*10,y:42-push*8,w:1250+push*23,h:1138+push*20};
  // A single-frame print cut avoids overlapping eyes or mouths. The camera and
  // registered crop continue unchanged while exactly one expression is drawn.
  const key=reaction?'smile':'neutral';
  const placed=drawFit(assets[key],rect,1,portraitBounds);emblems(key,placed);
  line([[1620,456],[1735,456],[1754,443],[1790,464]],C.gold,3,1);
  cross(1754,443,8,C.ink,.7);
  line([[120,942],[401,942]],C.paper,1.5,.35);
}
function shotAt(t){return t<CUE.answer?'H01':t<CUE.face?'H02':t<CUE.together?'H03':t<CUE.light?'H04':t<CUE.quiet?'H05':'H06';}
function renderFrame(sourceSeconds){
  if(!assets)throw new Error('Artwork is not ready; await window.sample.ready');
  if(!Number.isFinite(Number(sourceSeconds)))throw new TypeError('sourceSeconds must be finite');
  const t=clamp(Number(sourceSeconds),START,END);
  ctx.setTransform(canvas.width/V.width,0,0,canvas.height/V.height,0,0);
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;
  if(t>=CUE.face&&t<CUE.together)closeShot(t);else wideShot(t);
  window.sample.current={sourceTime:t,sourceFrame:Math.round(t*60),shot:shotAt(t)};
  return window.sample.current;
}
const ready=(async()=>{
  const [seated,seatedSmile,neutral,smile,logo]=await Promise.all([
    loadImage('../../assets/astra/ending-seated.png'),
    loadImage('../../assets/astra/ending-seated-smile.png'),
    loadImage('../../assets/astra/ending-closeup-neutral.png'),
    loadImage('../../assets/astra/ending-closeup-smile.png'),
    loadImage('../../assets/astra/openai-blossom.svg'),
  ]);
  if(neutral.naturalWidth!==smile.naturalWidth||neutral.naturalHeight!==smile.naturalHeight)
    throw new Error('Expression images must have matching canvas dimensions');
  if(seated.naturalWidth!==seatedSmile.naturalWidth||seated.naturalHeight!==seatedSmile.naturalHeight)
    throw new Error('Seated expression images must have matching canvas dimensions');
  assets={seated:asset(seated),seatedSmile:asset(seatedSmile),neutral:asset(neutral),smile:asset(smile),logo};
  const sa=assets.seated.bounds,sb=assets.seatedSmile.bounds,sx=Math.min(sa.x,sb.x),sy=Math.min(sa.y,sb.y);
  seatedBounds={x:sx,y:sy,w:Math.max(sa.x+sa.w,sb.x+sb.w)-sx,h:Math.max(sa.y+sa.h,sb.y+sb.h)-sy};
  const a=assets.neutral.bounds,b=assets.smile.bounds,x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
  portraitBounds={x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};
  window.sample.assetInfo=Object.fromEntries(Object.entries(assets).filter(([k])=>k!=='logo').map(([k,v])=>[k,{width:v.image.naturalWidth,height:v.image.naturalHeight,bounds:v.bounds}]));
  window.sample.assetInfo.logo={width:logo.naturalWidth,height:logo.naturalHeight,bounds:LOGO_BOUNDS};
  renderFrame(START);return window.sample.assetInfo;
})();
const audio=new Audio(new URL('../../media/audio/mili-world-execute-original-bilibili.m4a',import.meta.url).href);
let playback=false,raf=0;
async function play(){await ready;audio.currentTime=START;await audio.play();playback=true;
  function tick(){if(!playback)return;renderFrame(audio.currentTime);if(audio.currentTime>=END-.02){pause();return;}raf=requestAnimationFrame(tick);}tick();}
function pause(){playback=false;cancelAnimationFrame(raf);audio.pause();}
window.sample={ready,canvas,renderFrame,play,pause,sourceStart:START,sourceEnd:END,fps:60,assetInfo:null,current:null,kind:'limited-palette 2.5D ending study'};
canvas.addEventListener('click',()=>{if(playback)pause();else play().catch(console.error);});
window.addEventListener('keydown',event=>{if(event.code==='Space'){event.preventDefault();if(playback)pause();else play().catch(console.error);}});
