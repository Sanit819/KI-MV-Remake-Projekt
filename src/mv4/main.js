import {Art} from './art.js';
import {kit,C,clamp} from './kit.js';
import {renderEarlyV2} from './early.js';
import {renderMiddleV2} from './middle.js';
import {renderLateV2} from './late.js';
const params=new URLSearchParams(location.search),canvas=document.querySelector('#stage');
canvas.width=Number(params.get('w')||1920);canvas.height=Number(params.get('h')||1080);
// Export reads every frame back as PNG; choose the stable readback backend at
// creation instead of allowing Chromium to migrate a GPU canvas during seeks.
const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});ctx.imageSmoothingQuality='high';
const art=new Art(ctx),k=kit(ctx,art);let timeline,lyrics,textAudit=[],subtitleAudit=[],subtitlePass=false;
for(const method of ['fillText','strokeText']){const native=ctx[method].bind(ctx);ctx[method]=(text,...args)=>{if(!subtitlePass&&/[\u3400-\u9fff\uf900-\ufaff]/u.test(String(text)))throw Error('Chinese allowed only in the requested lyric translation: '+text);textAudit.push(String(text));return native(text,...args);};}
const total=13100/60;
function renderFrame(time){
 const t=clamp(time,0,total-1/600),shot=timeline.shots.find(s=>t>=s.start_s&&t<s.end_s)||timeline.shots.at(-1);
 const duration=shot.end_s-shot.start_s,local=t-shot.start_s,u=clamp(local/duration);
 // Reset retained canvas state and pending drawing paths for frame-independent
 // rasterization, including when seeking between distant scenes.
 textAudit=[];subtitleAudit=[];art.audit=[];ctx.reset();ctx.imageSmoothingQuality='high';ctx.setTransform(canvas.width/1920,0,0,canvas.height/1080,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 k.setTime(t);k.paper(t);ctx.save();
 const e={ctx,t,shot,u,local,duration,C,k,art,timeline,lyrics,sceneAudit:{},beat:(t-.260490639)/(60/130)};
 const ok=renderEarlyV2(e)||renderMiddleV2(e)||renderLateV2(e);ctx.restore();if(!ok)throw Error('Unimplemented shot '+shot.id);
 const cue=lyrics.find(l=>t>=l.start_s&&t<l.end_s);
 if(cue){
  ctx.save();
  const g=ctx.createLinearGradient(0,933,0,1080);g.addColorStop(0,'#15101d00');g.addColorStop(.31,'#15101df5');g.addColorStop(1,'#15101d');ctx.fillStyle=g;ctx.fillRect(0,933,1920,147);
  const lines=[{text:cue.text,y:989,size:43,font:'"Segoe UI",Arial,sans-serif',color:C.paper,language:'en'},{text:cue.translation,y:1041,size:33,font:'"Microsoft YaHei UI","Microsoft YaHei",sans-serif',color:'#ded1eb',language:'zh'}];
  subtitlePass=true;
  try{for(const line of lines){ctx.font=`500 ${line.size}px ${line.font}`;const size=Math.min(line.size,line.size*1770/Math.max(1,ctx.measureText(line.text).width));ctx.font=`500 ${size}px ${line.font}`;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillStyle=line.color;ctx.fillText(line.text,960,line.y);subtitleAudit.push({index:cue.index,text:line.text,language:line.language,x:960,y:line.y,size,width:ctx.measureText(line.text).width});}}finally{subtitlePass=false;ctx.restore();}
 }
 window.sample.currentShot=shot.id;window.sample.textAudit=[...textAudit];window.sample.subtitleAudit=[...subtitleAudit];window.sample.sceneAudit=e.sceneAudit;window.sample.artAudit=[...art.audit];window.sample.lyricKeywordParts=e.lyricKeywordParts||null;return shot.id;
}
const ready=(async()=>{
 [timeline,lyrics]=await Promise.all([fetch('/data/production-v4/timeline.json').then(r=>r.json()),fetch('/data/production-v4/lyrics.en-zh.json').then(r=>r.json()).then(x=>x.lines)]);
 if(timeline.shots[0].start_frame!==0||timeline.shots.at(-1).end_frame!==13100)throw Error('Timeline coverage mismatch');
 for(let i=1;i<timeline.shots.length;i++)if(timeline.shots[i].start_frame!==timeline.shots[i-1].end_frame)throw Error('Timeline gap');
 await art.load();await document.fonts.load('500 33px "Microsoft YaHei UI"','接上电源');await document.fonts.ready;renderFrame(Number(params.get('t')||0));document.querySelector('#loading').textContent='Mili · world.execute(me); / ASTRA + USER · v4 · 86 scenes · 60 fps · EN + ZH';return true;
})();
window.sample={canvas,ready,renderFrame,renderer:'ASTRA v4 · 86 scenes · 6 second quiet coda · English and Chinese lyrics',get timeline(){return timeline;},art};
const audio=document.querySelector('#audio'),seek=document.querySelector('#seek'),button=document.querySelector('#play'),clock=document.querySelector('#time');
let playing=false,tailOrigin=0,tailOffset=0,inTail=false;
const display=t=>{seek.value=t;clock.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;};
const current=()=>inTail?tailOffset+(performance.now()-tailOrigin)/1000:audio.currentTime;
const start=async t=>{if(t>=total-1/60)t=0;inTail=t>=212.33068;if(inTail){tailOffset=t;tailOrigin=performance.now();}else{audio.currentTime=t;await audio.play();}playing=true;button.textContent='Pause';};
button.onclick=async()=>{await ready;if(playing){display(current());audio.pause();playing=false;button.textContent='Play';}else await start(Number(seek.value));};
seek.oninput=async()=>{await ready;const t=Number(seek.value);audio.pause();if(playing)await start(t);renderFrame(t);display(t);};
audio.onended=()=>{if(!playing)return;inTail=true;tailOffset=audio.duration;tailOrigin=performance.now();};
function tick(){if(playing){const t=current();renderFrame(t);display(Math.min(total,t));if(t>=total){playing=false;audio.pause();button.textContent='Play';}}requestAnimationFrame(tick);}requestAnimationFrame(tick);
ready.catch(err=>{document.querySelector('#loading').textContent='Load failed: '+err.message;console.error(err);});
