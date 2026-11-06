// Original ASTRA motion-graphic staging. All times are original-audio seconds.
// Portraits are ink plates with pose/expression cuts, not a full skeletal rig.
const WIDTH=1920,HEIGHT=1080,FPS=60,START=11584/FPS,END=12740/FPS;
const CUE={answer:11702/FPS,face:11868/FPS,together:12034/FPS,light:12338/FPS,peak:12366/FPS,quiet:12429/FPS};
const COLOR={ink:'#17151d',paper:'#f4efe5',purple:'#b9a4e6',gold:'#e9bd78'};
const RGB=[[23,21,29],[244,239,229],[185,164,230]];
const canvas=document.querySelector('#stage'),query=new URLSearchParams(location.search);
canvas.width=Math.max(64,Number(query.get('w')||WIDTH));canvas.height=Math.max(64,Number(query.get('h')||HEIGHT));
const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
ctx.imageSmoothingQuality='high';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const progress=(t,a,b)=>clamp((t-a)/(b-a));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const ease=t=>1-(1-clamp(t))**3,TAU=2*Math.PI;
const ROOT=new URL('../../assets/astra/v02/',import.meta.url);
let art=null,layout=null,bodyBounds=null,faceBounds=null,grain=null;

function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Required artwork missing: ${url}`));image.src=url;});}
function union(a,b){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return{x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};}
function inkPlate(image){
  const plate=document.createElement('canvas');plate.width=image.naturalWidth;plate.height=image.naturalHeight;
  const g=plate.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);
  const data=g.getImageData(0,0,plate.width,plate.height),p=data.data;
  let left=plate.width,top=plate.height,right=-1,bottom=-1,opaque=0;
  for(let y=0;y<plate.height;y++)for(let x=0;x<plate.width;x++){
    const i=(y*plate.width+x)*4;
    if(p[i+3]<16){p[i]=p[i+1]=p[i+2]=p[i+3]=0;continue;}
    const r=p[i],gr=p[i+1],b=p[i+2];let best=0,error=Infinity;
    for(let n=0;n<RGB.length;n++){const q=RGB[n],d=(r-q[0])**2+(gr-q[1])**2+(b-q[2])**2;if(d<error){best=n;error=d;}}
    [p[i],p[i+1],p[i+2]]=RGB[best];
    if(p[i+3]>247)p[i+3]=255;
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++;
  }
  if(!opaque)throw new Error('Character art has no visible ink');
  g.putImageData(data,0,0);
  return{image:plate,width:plate.width,height:plate.height,bounds:{x:left,y:top,w:right-left+1,h:bottom-top+1}};
}
function line(points,color=COLOR.paper,width=1,alpha=1){
  if(points.length<2||alpha<=0)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...points[0]);
  for(const p of points.slice(1))ctx.lineTo(...p);ctx.stroke();ctx.restore();
}
function polygon(points,color,alpha=1){if(alpha<=0)return;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();ctx.restore();}
function arc(x,y,r,start,end,color,width=1,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.stroke();ctx.restore();}
function bezier(a,b,c,d,n=72){return Array.from({length:n+1},(_,i)=>{const t=i/n,s=1-t;return[s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]];});}
function pointAt(points,p){const t=clamp(p)*(points.length-1),i=Math.min(points.length-2,Math.floor(t)),f=t-i;return[lerp(points[i][0],points[i+1][0],f),lerp(points[i][1],points[i+1][1],f)];}
function partial(points,p){
  if(p<=0)return[];if(p>=1)return points;
  const distances=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1]));
  let remaining=distances.reduce((s,n)=>s+n,0)*p;const output=[points[0]];
  for(let i=0;i<distances.length;i++){
    if(remaining>=distances[i]){output.push(points[i+1]);remaining-=distances[i];}
    else{const f=remaining/(distances[i]||1);output.push([lerp(points[i][0],points[i+1][0],f),lerp(points[i][1],points[i+1][1],f)]);break;}
  }return output;
}
function pen(p,color,angle=-.6,scale=1){
  ctx.save();ctx.translate(...p);ctx.rotate(angle);ctx.scale(scale,scale);
  polygon([[0,0],[-4,-15],[5,-23],[10,-19],[7,-10]],color);line([[0,-6],[4,-15]],COLOR.ink,1.1,.9);ctx.restore();
}
function trace(points,p,color,width=2.5,alpha=1,drawPen=true){
  const part=partial(points,p);if(part.length<2)return null;line(part,color,width,alpha);
  const a=part.at(-2),b=part.at(-1);
  if(drawPen)pen(b,color,Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2,.87);
  return b;
}
function makeGrain(){
  const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const g=c.getContext('2d');let seed=90521;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  g.fillStyle=COLOR.paper;g.globalAlpha=.055;
  for(let n=0;n<4800;n++){const x=Math.floor(random()*WIDTH),y=Math.floor(random()*HEIGHT);g.fillRect(x,y,random()>.95?2:1,1);}
  return c;
}
function background(){ctx.fillStyle=COLOR.ink;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.drawImage(grain,0,0);}

function fitted(key,rect,bounds){const a=art[key],b=bounds||a.bounds,s=Math.min(rect.w/b.w,rect.h/b.h);return{key,b,x:rect.x+(rect.w-b.w*s)/2,y:rect.y+(rect.h-b.h*s)/2,s,w:b.w*s,h:b.h*s};}
function localPoint(placed,x,y){return[placed.x+(x-placed.b.x)*placed.s,placed.y+(y-placed.b.y)*placed.s];}
function drawCharacter(key,rect,bounds,{rotation=0,dy=0}={}){
  const placed=fitted(key,rect,bounds),a=art[key],pivot=[placed.x+placed.w*.51,placed.y+placed.h*.7];
  ctx.save();ctx.translate(pivot[0],pivot[1]+dy);ctx.rotate(rotation);ctx.translate(-pivot[0],-pivot[1]);
  ctx.drawImage(a.image,placed.b.x,placed.b.y,placed.b.w,placed.b.h,placed.x,placed.y,placed.w,placed.h);
  for(const mark of layout.assets[key].marks||[]){
    const p=localPoint(placed,mark.x,mark.y),w=mark.width*placed.s,h=w*art.logo.naturalHeight/art.logo.naturalWidth;
    ctx.save();ctx.translate(...p);ctx.rotate((mark.rotation||0)*Math.PI/180);ctx.drawImage(art.logo,-w/2,-h/2,w,h);ctx.restore();
  }
  ctx.restore();
  const palm=layout.assets[key].palm;
  if(palm){const p=localPoint(placed,palm.x,palm.y),vx=p[0]-pivot[0],vy=p[1]-pivot[1];placed.palm=[pivot[0]+vx*Math.cos(rotation)-vy*Math.sin(rotation),pivot[1]+dy+vx*Math.sin(rotation)+vy*Math.cos(rotation)];}
  return placed;
}

const STAR_X=1302,STAR_Y=375;
const STAR=[[0,-89],[28,-31],[89,-28],[45,15],[55,76],[0,44],[-55,76],[-45,15],[-89,-28],[-28,-31],[0,-89]];
const GOLD_ENTRY=[[1935,305],[1772,305],[1740,325],[1505,325],[1447,286],[STAR_X,286]];
const NEW_TAIL=[[55,76],[89,94],[113,78],[146,104],[181,91],[209,102]];
const BRIDGE=bezier([805,828],[1040,741],[1515,736],[1773,812],100);
const BRIDGE_SEED=BRIDGE.map((_,i)=>[lerp(805,1773,i/100),937]);
const TURN_START=CUE.together;
const PARTS=[{a:0,b:29,color:COLOR.purple,begin:.60,end:1.37},{a:29,b:55,color:COLOR.gold,begin:1.53,end:2.18},{a:55,b:78,color:COLOR.purple,begin:2.35,end:2.95},{a:78,b:100,color:COLOR.gold,begin:3.12,end:3.68}];
const TO_STAR_P=bezier([BRIDGE[55][0],BRIDGE[55][1]],[1204,627],[1200,481],[1257,390]);
const TO_STAR_G=bezier([BRIDGE[78][0],BRIDGE[78][1]],[1552,610],[1458,500],[1357,451]);
const FINAL_PURPLE=bezier([1119,863],[1137,831],[1168,831],[1193,859],48);
const FINAL_GOLD=bezier([1193,859],[1215,883],[1241,883],[1262,853],48);

function frame(t){
  const free=smooth(progress(t,TURN_START,TURN_START+1.1));
  line([[122,235],[122,100],[1773,100],[1773,238]],COLOR.paper,1.4,lerp(.38,.17,free));
  line([[122,704],[122,937],[805,937]],COLOR.paper,1.4,.34);
  line([[1773,600],[1773,937]],COLOR.paper,1.4,.32*(1-free));
  line(BRIDGE_SEED.map((p,i)=>[lerp(p[0],BRIDGE[i][0],free),lerp(p[1],BRIDGE[i][1],free)]),COLOR.paper,1.6,.35);
  // Two visible gaps stay open; there is no ending shutdown or sealed enclosure.
  line([[1773,238],[1785,238]],COLOR.gold,2,.75);line([[1773,600],[1785,600]],COLOR.purple,2,.65);
}
function skyline(t){
  const emerge=.12+.12*smooth(progress(t,TURN_START+1,CUE.light));
  line([[1070,930],[1070,707],[1122,707],[1122,672],[1175,672],[1175,750]],COLOR.purple,1,emerge);
  line([[1495,929],[1495,684],[1557,684],[1557,721],[1633,721],[1633,916]],COLOR.paper,1,emerge);
  line([[1610,720],[1610,624],[1666,624],[1708,666]],COLOR.paper,1,emerge*.8);
  line([[943,929],[1147,856],[1708,856],[1819,929]],COLOR.paper,1,emerge*.75);
}
function oldStar(){
  ctx.save();ctx.translate(933,909);ctx.rotate(-.22);
  const s=STAR.map(p=>[p[0]*.28,p[1]*.28]);line(s.slice(5),COLOR.purple,2,.8);line(s.slice(0,6),COLOR.paper,2,.8);
  line([[15,21],[27,29],[39,26]],COLOR.purple,1.5,.8);ctx.restore();
}
function newStar(t){
  const p=ease(progress(t,CUE.answer+.4,CUE.answer+1.51)),tail=progress(t,CUE.answer+1.69,CUE.face-.18);
  const lift=18*smooth(progress(t,CUE.light,CUE.quiet+1)),lit=smooth(progress(t,CUE.light,CUE.peak));
  ctx.save();ctx.translate(STAR_X,STAR_Y-lift);
  if(lit)polygon(STAR,COLOR.gold,lit);
  line(STAR.slice(5),COLOR.purple,3);trace(STAR.slice(0,6),p,COLOR.gold,3,1,p>0&&p<1);
  trace(NEW_TAIL,tail,COLOR.gold,2.5,1,tail>0&&tail<1);
  if(lit)polygon([[0,-40],[14,-9],[40,0],[14,10],[0,39],[-14,10],[-40,0],[-14,-9]],COLOR.paper,lit);
  ctx.restore();
  if(t>=CUE.answer&&t<CUE.face){
    const enter=ease(progress(t,CUE.answer,CUE.answer+.48)),fade=1-smooth(progress(t,CUE.answer+.7,CUE.face-.1));
    trace(GOLD_ENTRY,enter,COLOR.gold,2,fade,enter<1);
  }
  const r=(t-START)*.023;
  arc(STAR_X,STAR_Y-lift,151,1.9+r,3.65+r,COLOR.purple,1,.3);
}
function lightAccent(t){
  if(t<CUE.light||t>CUE.quiet)return;
  const p=progress(t,CUE.light,CUE.peak),fade=1-smooth(progress(t,CUE.peak+.06,CUE.quiet)),radius=lerp(40,265,ease(p));
  for(let i=0;i<6;i++){const a=TAU*i/6+.1,dx=Math.cos(a),dy=Math.sin(a);line([[STAR_X+dx*radius,STAR_Y+dy*radius],[STAR_X+dx*(radius+50),STAR_Y+dy*(radius+50)]],i%2?COLOR.paper:COLOR.gold,4,fade);}
  arc(STAR_X,STAR_Y,lerp(105,233,ease(p)),.14,5.26,COLOR.paper,1.6,fade*.65);
}
function body(t){
  const drawing=t>=TURN_START,key=drawing?'draw':'wait';
  const shift=smooth(progress(t,TURN_START,TURN_START+.85));
  // Rotation/translation only: no face warping, row tearing, or invented finger rig.
  const breath=Math.sin((t-START)*1.26)*.65;
  const rotation=drawing?lerp(-.006,.004,shift):-.004;
  const placed=drawCharacter(key,{x:178+shift*18,y:83,w:765,h:910},bodyBounds,{rotation,dy:breath+shift*4});
  if(t<TURN_START+.6){
    const palm=placed.palm||[811,435];
    // The violet pen visibly stops when the independent gold answer arrives.
    const hover=t<CUE.answer?Math.sin((t-START)*2)*3:0;
    const start=[palm[0]+18,palm[1]-33+hover];
    const flight=bezier(start,[1030,448],[1030,748],BRIDGE[0]);
    pen(pointAt(flight,ease(progress(t,TURN_START,TURN_START+.6))),COLOR.purple,-.64,.94);
  }
}
function sharedDrawing(t){
  if(t<TURN_START)return;
  let violet=null,gold=null;
  for(const part of PARTS){
    const path=BRIDGE.slice(part.a,part.b+1),p=progress(t,TURN_START+part.begin,TURN_START+part.end);
    if(p>0){const tip=trace(path,p,part.color,3,1,false);if(part.color===COLOR.purple)violet=tip;else gold=tip;}
  }
  // Waiting partner approaches the other's unfinished endpoint before taking over.
  if(t<TURN_START+1.53){gold=pointAt(bezier([1675,607],[1540,683],[1200,738],[BRIDGE[29][0]+18,BRIDGE[29][1]-18]),ease(progress(t,TURN_START,TURN_START+1.46)));}
  for(let i=0;i<8;i++){const j=13+i*11,p=BRIDGE[j];trace([p,[p[0]+2,p[1]+46],[p[0]-9,p[1]+46]],progress(t,TURN_START+1.5+i*.26,TURN_START+1.78+i*.26),i%2?COLOR.gold:COLOR.purple,1.7,.65,false);}
  const rise=progress(t,TURN_START+3.8,CUE.light);
  if(rise>0){violet=trace(TO_STAR_P,rise,COLOR.purple,2,1,false);gold=trace(TO_STAR_G,rise,COLOR.gold,2,1,false);}
  if(t>=CUE.light){
    const lift=18*smooth(progress(t,CUE.light,CUE.quiet+1));violet=[1257,390-lift];gold=[1357,451-lift];
  }
  if(t>=CUE.quiet){
    const down=smooth(progress(t,CUE.quiet,CUE.quiet+.42));
    violet=[lerp(1257,FINAL_PURPLE[0][0],down),lerp(372,FINAL_PURPLE[0][1],down)];
    gold=[lerp(1357,FINAL_GOLD[0][0]+18,down),lerp(433,FINAL_GOLD[0][1]-18,down)];
    const p=progress(t,CUE.quiet+.45,CUE.quiet+1.94),g=progress(t,CUE.quiet+2.15,END-.45);
    if(p>0)violet=trace(FINAL_PURPLE,p,COLOR.purple,3,1,false);
    if(g>0)gold=trace(FINAL_GOLD,g,COLOR.gold,3,1,false);
    if(p===1&&g>0)violet=[FINAL_PURPLE.at(-1)[0]-14,FINAL_PURPLE.at(-1)[1]-17];
    // The old connection fades down while the next, joint, line remains distinct.
  }
  if(violet)pen(violet,COLOR.purple,-.6,1);if(gold)pen(gold,COLOR.gold,.5,1);
}
function finalWords(t){
  const p=smooth(progress(t,CUE.quiet+1.1,CUE.quiet+2));if(!p)return;
  ctx.save();ctx.fillStyle=COLOR.paper;ctx.globalAlpha=p*.8;ctx.font='italic 29px Georgia, serif';ctx.fillText('keep drawing.',1373,950);ctx.restore();
}
function wide(t){
  background();
  const enter=smooth(progress(t,START,CUE.face)),pull=smooth(progress(t,TURN_START,CUE.quiet+1.8));
  const z=t<CUE.face?lerp(1,1.026,enter):lerp(1.026,1,pull);
  ctx.save();ctx.translate(960,540);ctx.scale(z,z);ctx.translate(-960,-540);
  frame(t);skyline(t);lightAccent(t);sharedDrawing(t);body(t);oldStar();newStar(t);finalWords(t);
  ctx.restore();
}
function close(t){
  background();
  const release=smooth(progress(t,198.65,199.5)),push=smooth(progress(t,CUE.face,TURN_START));
  polygon([[1221,100],[1784,100],[1784,936],[1221,936]],COLOR.purple);
  polygon([[1629,100],[1784,100],[1784,936],[1629,936]],COLOR.paper);
  line([[120,238],[120,100],[1080,100]],COLOR.paper,1.5,.35);
  line([[120,937],[434,937]],COLOR.paper,1.5,.35);
  let key=t<198.65?'recognize':'smile';
  if(art.blink&&t>=198.55&&t<198.65)key='blink';
  drawCharacter(key,{x:170-push*10,y:40,w:1280+push*20,h:1134},faceBounds,{rotation:lerp(.003,-.004,release),dy:release*10});
  // Her eyeline and the gold irregular tail share one height; no caption covers her face.
  const stroke=[[1509,481],[1590,481],[1612,466],[1643,491],[1679,478],[1727,490]];
  trace(stroke,1,COLOR.gold,3,1,false);
  if(t>=199.35){const response=progress(t,199.35,TURN_START-.05);trace([[1508,512],[1536,519],[1567,508]],response,COLOR.purple,2.5,.85,true);}
}
function shot(t){return t<CUE.answer?'H01':t<CUE.face?'H02':t<TURN_START?'H03':t<CUE.light?'H04':t<CUE.quiet?'H05':'H06';}
function renderFrame(sourceSeconds){
  if(!art)throw new Error('Artwork is not ready; await window.sample.ready');
  const t=Number(sourceSeconds);if(!Number.isFinite(t))throw new TypeError('Expected finite source-audio seconds');
  const time=clamp(t,START,END);
  ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.filter='none';
  if(time>=CUE.face&&time<TURN_START)close(time);else wide(time);
  window.sample.current={sourceTime:time,sourceFrame:Math.round(time*FPS),shot:shot(time)};return window.sample.current;
}
const ready=(async()=>{
  const response=await fetch(new URL('animation-layout.json',ROOT));if(!response.ok)throw new Error('Missing v02 animation-layout.json');
  layout=await response.json();
  for(const key of ['wait','draw','recognize','smile'])if(!layout.assets?.[key]?.file)throw new Error(`Missing v02 asset definition: ${key}`);
  const plates=await Promise.all(Object.entries(layout.assets).map(async([key,spec])=>{
    const image=await loadImage(new URL(spec.file,ROOT));
    if(spec.width&&spec.width!==image.naturalWidth||spec.height&&spec.height!==image.naturalHeight)throw new Error(`Wrong canvas dimensions for ${key}`);
    return[key,inkPlate(image)];
  }));
  art=Object.fromEntries(plates);art.logo=await loadImage(new URL(layout.logo||'openai-openwork.svg',ROOT));
  bodyBounds=union(art.wait.bounds,art.draw.bounds);
  if(art.wait.width!==art.draw.width||art.wait.height!==art.draw.height)throw new Error('Body states need the same canvas registration');
  faceBounds=union(art.recognize.bounds,art.smile.bounds);if(art.blink)faceBounds=union(faceBounds,art.blink.bounds);
  if(art.recognize.width!==art.smile.width||art.recognize.height!==art.smile.height)throw new Error('Portrait states need the same canvas registration');
  grain=makeGrain();
  window.sample.assetInfo=Object.fromEntries(Object.entries(art).filter(([k])=>k!=='logo').map(([key,a])=>[key,{width:a.width,height:a.height,bounds:a.bounds,palette:RGB,alpha_cutoff:16}]));
  renderFrame(START);return window.sample.assetInfo;
})();
const audio=new Audio(new URL('../../media/audio/mili-world-execute-original-bilibili.m4a',import.meta.url).href);
let playing=false,raf=0;
async function play(){await ready;audio.currentTime=START;await audio.play();playing=true;function tick(){if(!playing)return;renderFrame(audio.currentTime);if(audio.currentTime>=END-.02){pause();return;}raf=requestAnimationFrame(tick);}tick();}
function pause(){playing=false;cancelAnimationFrame(raf);audio.pause();}
window.sample={ready,canvas,renderFrame,play,pause,sourceStart:START,sourceEnd:END,fps:FPS,renderer:'Canvas2D / three-ink plates / v02',current:null,assetInfo:null};
canvas.addEventListener('click',()=>{if(playing)pause();else play().catch(console.error);});
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(playing)pause();else play().catch(console.error);}});
