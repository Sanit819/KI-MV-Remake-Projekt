import {Art} from './art.js';
import {kit,C,clamp} from './kit.js';
import {renderEarly} from './early.js';
import {renderLate} from './late.js';

const params=new URLSearchParams(location.search),canvas=document.querySelector('#stage');
canvas.width=Number(params.get('w')||1920);canvas.height=Number(params.get('h')||1080);
const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingQuality='high';
const art=new Art(ctx),k=kit(ctx,art);let timeline;
function renderFrame(time){
 const t=clamp(time,0,12740/60-1/600),shot=timeline.shots.find(s=>t>=s.start_s&&t<s.end_s)||timeline.shots.at(-1);
 const duration=shot.end_s-shot.start_s,local=t-shot.start_s,u=clamp(local/duration);
 ctx.setTransform(canvas.width/1920,0,0,canvas.height/1080,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 k.paper(t);ctx.save();
 const e={ctx,t,shot,u,local,duration,C,k,timeline};
 const ok=renderEarly(e)||renderLate(e);ctx.restore();
 if(!ok)throw Error('Unimplemented shot '+shot.id);
 window.sample.currentShot=shot.id;return shot.id;
}
const ready=(async()=>{
 timeline=await fetch('/docs/audio/calibrated_timeline.json').then(r=>r.json());
 if(timeline.shots[0].start_frame!==0||timeline.shots.at(-1).end_frame!==12740)throw Error('Timeline coverage mismatch');
 for(let i=1;i<timeline.shots.length;i++)if(timeline.shots[i].start_frame!==timeline.shots[i-1].end_frame)throw Error('Timeline gap');
 await art.load();await document.fonts.ready;renderFrame(Number(params.get('t')||0));
 document.querySelector('#loading').textContent='Mili · world.execute(me);  /  ASTRA 与你共同创作';return true;
})();
window.sample={canvas,ready,renderFrame,renderer:'ASTRA full MV · 54 shots · native Canvas2D, three ink plates + vector closeups'};
const audio=document.querySelector('#audio'),seek=document.querySelector('#seek'),button=document.querySelector('#play'),clock=document.querySelector('#time');
let playing=false,tailTime=0;
const display=t=>{seek.value=t;clock.textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;};
button.onclick=async()=>{await ready;if(playing){audio.pause();playing=false;button.textContent='播放';}else{audio.currentTime=Math.min(Number(seek.value),212.3);await audio.play();playing=true;button.textContent='暂停';}};
seek.oninput=async()=>{await ready;const t=Number(seek.value);audio.currentTime=Math.min(t,212.3);renderFrame(t);display(t);};
audio.onended=()=>{playing=false;button.textContent='播放';renderFrame(12740/60-1/60);display(12740/60);};
function tick(){if(playing){renderFrame(audio.currentTime);display(audio.currentTime);}requestAnimationFrame(tick);}requestAnimationFrame(tick);
ready.catch(err=>{document.querySelector('#loading').textContent='画面加载失败：'+err.message;console.error(err);});
