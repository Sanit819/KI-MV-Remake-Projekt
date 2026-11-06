import fs from 'node:fs';
import crypto from 'node:crypto';
import {renderEarly} from '../../src/full/early.js';
import {renderLate} from '../../src/full/late.js';
import {C,clamp,lerp,smooth,ease,prog} from '../../src/full/kit.js';
const root=new URL('../../',import.meta.url), out=new URL('./',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root));
const timeline=JSON.parse(read('docs/audio/calibrated_timeline.json'));
const bounds=JSON.parse(fs.readFileSync(new URL('source-bounds.json',out)));
const ID=[1,0,0,1,0,0];
const mult=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const pt=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
const box=(m,x,y,w,h)=>{const p=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(q=>pt(m,...q));return [Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))];};
const intersect=(a,b)=>[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])];
const area=b=>Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]);
const rnd=x=>Math.round(x*10000)/10000;
let state,stack,path,chars,texts,ops;
const methods={
 save(){stack.push({m:[...state.m],clip:[...state.clip],globalAlpha:state.globalAlpha});},restore(){state=stack.pop();if(!state)throw Error('Stack underflow');},
 translate(x,y){state.m=mult(state.m,[1,0,0,1,x,y]);},scale(x,y){state.m=mult(state.m,[x,0,0,y,0,0]);},rotate(a){state.m=mult(state.m,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);},transform(...m){state.m=mult(state.m,m);},setTransform(...m){state.m=m;},beginPath(){path=[];},rect(x,y,w,h){path.push(box(state.m,x,y,w,h));},clip(){if(path.length)state.clip=intersect(state.clip,path[0]);},setLineDash(){},
};
const ctx=new Proxy({}, {get(_,p){return p in methods?methods[p]:p in state?state[p]:(()=>{});},set(_,p,v){state[p]=v;return true;}});
function capture(method,name,x,y,w,h,options={}){
 const alias=name==='sleep'?'stand':name;
 let matrix=state.m, b;
 if(method==='character'){
  const src=bounds[alias].bounds,aspect=(src[2]-src[0])/(src[3]-src[1]),a=options.rotation||0;
  matrix=mult(matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),x,y]);
  b=box(matrix,-h*aspect/2,-h,h*aspect,h*(options.reveal??1));
 }else b=box(matrix,x,y,w,h);
 const clipped=intersect(intersect(b,state.clip),[0,0,1920,1080]);
 const alpha=(options.alpha??1)*state.globalAlpha;
 chars.push({method,name:alias,requested:name,alpha:rnd(alpha),bbox:b.map(rnd),visible_bbox:clipped.map(rnd),area:rnd(area(clipped)),screen_intersects:area(clipped)>4,active:alpha>=.05&&area(clipped)>4,mode:options.mode||'normal'});
}
const known={clamp,lerp,smooth,ease,prog,
 character(name,x,y,height,o){capture('character',name,x,y,0,height,o);},
 portrait(name,x,y,w,h,o){capture('portrait',name,x,y,w,h,o);},
 anchor(name,x,y,height,key='hands') {const a=bounds[name==='sleep'?'stand':name],b=a.bounds,s=height/(b[3]-b[1]),p=a.anchors[key];return[x+(p[0]-b[0]-(b[2]-b[0])/2)*s,y+(p[1]-b[3])*s];},
 text(text,x,y,size,color,o={}){if((o.alpha??1)*state.globalAlpha>=.05){const p=pt(state.m,x,y);texts.push({text:String(text),x:rnd(p[0]),y:rnd(p[1]),size,font:o.font||'serif'});}},
};
const k=new Proxy(known,{get(obj,p){return obj[p]??((...args)=>{ops[p]=(ops[p]||0)+1;});}});
const rows=[], poseStats=Object.fromEntries(Object.keys(bounds).map(n=>[n,{source:bounds[n].path,call_frames:0,active_frames:0,portrait_frames:0,body_frames:0,instance_frames:0,shots:new Set(),dominant_frames:0}]));
const shotStats=[];
for(const shot of timeline.shots){
 const stat={id:shot.id,start_s:shot.start_s,end_s:shot.end_s,frames:shot.end_frame-shot.start_frame,poses:{},composition:{left:0,center:0,right:0,none:0},portrait_frames:0,character_frames:0,texts:new Set(),helpers:{},keyframes:[]};
 const duration=shot.end_s-shot.start_s;
 for(let f=shot.start_frame;f<shot.end_frame;f++){
  const t=f/60,local=t-shot.start_s,u=clamp(local/duration);
  state={m:[...ID],clip:[0,0,1920,1080],globalAlpha:1};stack=[];path=[];chars=[];texts=[];ops={};
  const e={ctx,k,C,t,shot,u,local,duration,timeline};
  if(!(renderEarly(e)||renderLate(e)))throw Error('Unhandled '+shot.id);
  if(stack.length)throw Error('Stack unbalanced '+shot.id);
  const called=new Set(chars.map(c=>c.name)),active=chars.filter(c=>c.active),names=new Set(active.map(c=>c.name));
  for(const n of called)poseStats[n].call_frames++;
  for(const n of names){const p=poseStats[n];p.active_frames++;p.instance_frames+=active.filter(c=>c.name===n).length;p.shots.add(shot.id);stat.poses[n]=(stat.poses[n]||0)+1;if(active.some(c=>c.name===n&&c.method==='portrait'))p.portrait_frames++;if(active.some(c=>c.name===n&&c.method==='character'))p.body_frames++;}
  const dominant=[...active].sort((a,b)=>b.area*b.alpha-a.area*a.alpha)[0];
  let composition='none';if(dominant){poseStats[dominant.name].dominant_frames++;const x=(dominant.visible_bbox[0]+dominant.visible_bbox[2])/2;composition=x<1920*.4?'left':x>1920*.6?'right':'center';}
  stat.composition[composition]++;if(active.some(c=>c.method==='portrait'))stat.portrait_frames++;if(active.some(c=>c.method==='character'))stat.character_frames++;
  for(const v of texts)stat.texts.add(v.text);for(const [n,v]of Object.entries(ops))stat.helpers[n]=(stat.helpers[n]||0)+v;
  if(f%10===0||[shot.start_frame,shot.end_frame-1].includes(f))rows.push({frame:f,t:rnd(t),shot:shot.id,composition,characters:chars,texts,helpers:ops});
  if([.1,.5,.9].some(p=>f===shot.start_frame+Math.floor(stat.frames*p)))stat.keyframes.push({frame:f,t:rnd(t),u:rnd(u),characters:chars,texts,helpers:ops});
 }
 stat.texts=[...stat.texts];stat.pose_seconds=Object.fromEntries(Object.entries(stat.poses).map(([n,v])=>[n,rnd(v/60)]));stat.dominant_composition=Object.keys(stat.composition).sort((a,b)=>stat.composition[b]-stat.composition[a])[0];shotStats.push(stat);
}
for(const p of Object.values(poseStats)){p.shots=[...p.shots];p.shot_count=p.shots.length;for(const n of ['call','active','portrait','body','dominant'])p[n+'_seconds']=rnd(p[n+'_frames']/60);p.instance_seconds=rnd(p.instance_frames/60);}
const runs=[];let run;
for(const shot of shotStats){const ranked=Object.entries(shot.poses).sort((a,b)=>b[1]-a[1]);const dominant=ranked[0]?.[0]||'none';if(run&&run.dominant_pose===dominant){run.shots.push(shot.id);run.end_s=shot.end_s;}else{run={dominant_pose:dominant,start_s:shot.start_s,end_s:shot.end_s,shots:[shot.id]};runs.push(run);}}
const summary={created:'2026-11-05',method:{render_timestamps:'all 12740 timeline frame timestamps at 60 fps; no raster rendering',sample_rows:'every 10th frame (6 Hz) plus first/last frames',active_call:'alpha >= .05 and transformed bounding box intersects viewport/rectangular clip by >4 square pixels',position:'largest alpha-weighted visible character bounding box centroid: left <40% width, right >60%, center otherwise',limitations:['does not model later-paint occlusion, opaque source shape interior or multiply clipped polygon intersections','raw source alpha>=128 bounds are used; art tracing may shift contour by around a pixel','helper counts are scene-level calls, not raster primitives; no technical/visual acceptance implied']},hashes:Object.fromEntries(['src/full/early.js','src/full/late.js','src/full/art.js','assets/astra/final/manifest.json','docs/audio/calibrated_timeline.json'].map(p=>[p,crypto.createHash('sha256').update(read(p)).digest('hex')])),total_frames:timeline.shots.at(-1).end_frame,total_seconds:timeline.shots.at(-1).end_s,shot_count:shotStats.length,pose_stats:poseStats,shots:shotStats,consecutive_shot_dominant_pose_runs:runs.map(r=>({...r,seconds:rnd(r.end_s-r.start_s)}))};
fs.writeFileSync(new URL('pose-audit.json',out),JSON.stringify(summary,null,2));
fs.writeFileSync(new URL('samples-6hz.jsonl',out),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
console.log(JSON.stringify({total_seconds:summary.total_seconds,pose_stats:poseStats,shots:shotStats.map(s=>({id:s.id,pose_seconds:s.pose_seconds,composition:s.dominant_composition,portrait_seconds:rnd(s.portrait_frames/60)})),runs:summary.consecutive_shot_dominant_pose_runs.filter(r=>r.shots.length>1)},null,2));
