/** Executes unchanged v4 scene functions at every source frame with no-op drawing.
 * Counts source artwork submissions, NOT visible pixels, animation quality or
 * decoded-video durations. Clips, occlusion, masks and text metrics are not drawn.
 * Cross-checks asset names against the accepted real-browser QA samples.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Art} from '../../src/mv4/art.js';
import {kit,C,clamp} from '../../src/mv4/kit.js';
import {renderEarlyV2} from '../../src/mv4/early.js';
import {renderMiddleV2} from '../../src/mv4/middle.js';
import {renderLateV2} from '../../src/mv4/late.js';

const DIR=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(DIR,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');
function context(){
 const state={globalAlpha:1,font:'20px sans-serif',globalCompositeOperation:'source-over'},stack=[];
 return new Proxy(state,{get(o,k){
  if(k in o)return o[k];
  if(k==='save')return()=>stack.push({...state});
  if(k==='restore')return()=>{const s=stack.pop();if(s)Object.assign(state,s)};
  if(k==='reset')return()=>{stack.length=0;state.globalAlpha=1;state.globalCompositeOperation='source-over'};
  if(k==='measureText')return s=>({width:String(s).length*Number(state.font.match(/([\d.]+)px/)?.[1]||20)*.6});
  if(k==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)});
  if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});
  return()=>{};
 }});
}
globalThis.document={createElement(){const ctx=context();return{width:0,height:0,getContext(){return ctx}}}};
const ctx=context(), art=new Art(ctx),meta=JSON.parse(fs.readFileSync(path.join(DIR,'v4-art-metadata.json'),'utf8'));
for(const [name,a] of Object.entries(meta))art.items[name]={...a,paths:[{}, {}, {}],dark:{},canvas:{},gray:{}};
art.logoPath={};art.logoDots=[[.5,.5]];
// Real layout and source-point math; placement is no-op drawing but keeps audit.
const place=art.place.bind(art),portrait=art.portrait.bind(art);
art.place=(name,x,y,w,h,o={})=>{const alpha=ctx.globalAlpha*(o.alpha??1);place(name,x,y,w,h,o);art.audit.at(-1).effectiveAlpha=alpha;};
art.portrait=(name,x,y,w,h,o={})=>{portrait(name,x,y,w,h,o);art.audit.push({name,x,y,w,h,kind:'portrait',effectiveAlpha:ctx.globalAlpha*(o.alpha??1)});};
const k=kit(ctx,art), timeline=read('data/production-v4/timeline.json'), lyrics=read('data/production-v4/lyrics.en-zh.json').lines;
const actual=read('docs/validation/astra-v4-runtime.json'),sourcePaths=fs.readdirSync(path.join(ROOT,'src/mv4')).filter(p=>/\.(js|html)$/.test(p)).map(p=>'src/mv4/'+p);
for(const record of actual.source_sha256)assert.equal(hash(record.path),record.sha256,'Changed v4 source');
const actualByFrame=new Map();for(const s of actual.samples){if(!actualByFrame.has(s.frame))actualByFrame.set(s.frame,[]);actualByFrame.get(s.frame).push(s);}
const assets={},shots=[],runs=[],mismatches=[];let checkedSamples=0, anyArtFrames=0, astraFrames=0,totalSubmissions=0,previous=null,currentRun=null;
for(const s of timeline.shots){
 const shot={id:s.id,start_frame:s.start_frame,end_frame:s.end_frame,song_start:s.start_s,song_end:s.end_s,upload_start:s.start_s+5,upload_end:s.end_s+5,assets:{},source_groups:[]};
 for(let f=s.start_frame;f<s.end_frame;f++){
  const t=f/60,duration=s.end_s-s.start_s,local=t-s.start_s,u=clamp(local/duration);ctx.reset();art.audit=[];k.setTime(t);
  const e={ctx,t,shot:s,u,local,duration,C,k,art,timeline,lyrics,sceneAudit:{},beat:(t-.260490639)/(60/130)};
  assert(renderEarlyV2(e)||renderMiddleV2(e)||renderLateV2(e),'Missing shot '+s.id);
  const all=art.audit.map(x=>x.name).sort(), unique=[...new Set(all)], astra=unique.filter(x=>!x.startsWith('guest'));
  if(unique.length)anyArtFrames++;if(astra.length)astraFrames++;totalSubmissions+=all.length;
  for(const name of unique){
   const rec=assets[name]??={name,path:meta[name].path,sha256:meta[name].sha256,frame_submissions:0,call_count:0,nonzero_alpha_submission_frames:0,shots:[]};
   rec.frame_submissions++;rec.call_count+=all.filter(n=>n===name).length;
   if(art.audit.some(a=>a.name===name&&(a.effectiveAlpha??1)>0))rec.nonzero_alpha_submission_frames++;
   if(!rec.shots.includes(s.id))rec.shots.push(s.id);
   shot.assets[name]=(shot.assets[name]||0)+1;
  }
  const key=unique.join('+');if(key!==previous){currentRun={start_frame:f,end_frame:f+1,assets:unique,shots:[s.id]};runs.push(currentRun);previous=key;}else{currentRun.end_frame=f+1;if(!currentRun.shots.includes(s.id))currentRun.shots.push(s.id)}
  for(const sample of actualByFrame.get(f)||[]){checkedSamples++;const expected=sample.art.map(a=>a.name).sort();if(JSON.stringify(all)!==JSON.stringify(expected))mismatches.push({frame:f,id:sample.id,expected,measured:all});}
 }
 shot.assets=Object.fromEntries(Object.entries(shot.assets).map(([name,frames])=>[name,{submission_frames:frames,submission_seconds:frames/60}]));shots.push(shot);
}
for(const r of Object.values(assets)){r.submission_seconds=r.frame_submissions/60;r.share_of_astra_source_frames=r.frame_submissions/astraFrames;r.is_guest=r.name.startsWith('guest');}
for(const r of runs){r.seconds=(r.end_frame-r.start_frame)/60;r.song_start=r.start_frame/60;r.song_end=r.end_frame/60;}
const sorted=Object.values(assets).sort((a,b)=>b.frame_submissions-a.frame_submissions),top=sorted.filter(x=>!x.is_guest).slice(0,3),topNames=new Set(top.map(x=>x.name));
const top3UnionFrames=runs.filter(r=>r.assets.some(a=>topNames.has(a))).reduce((n,r)=>n+r.end_frame-r.start_frame,0);
const report={version:1,date:'2026-11-05',mode:'source-function execution at all 13100 source frames using no-op canvas, not video pixel visibility',limitations:['No-op text width, clips, masks and occlusion are not pixels. Zero-area clips may submit a source.','R48 uses dummy raster alpha for control flow; no claim about actual alpha coverage. Its one midWait submission agrees with real-browser samples.','A reused source moved, cropped, recolored or masked remains the same artwork. Calls include simultaneous artworks; their durations are not additive film time.'],fps:60,total_frames:13100,body_seconds:13100/60,warning_seconds:5,source_hashes:Object.fromEntries(sourcePaths.map(p=>[p,hash(p)])),manifest_sha256:hash('assets/astra/v08/manifest.json'),actual_qa_sha256:hash('docs/validation/astra-v4-runtime.json'),crosscheck:{actual_browser_samples:actual.samples.length,compared_samples:checkedSamples,matching:checkedSamples-mismatches.length,mismatches},summary:{loaded_assets:Object.keys(meta).length,used_assets:sorted.length,used_astra_assets:sorted.filter(x=>!x.is_guest).length,used_guests:sorted.filter(x=>x.is_guest).length,any_art_submission_frames:anyArtFrames,astra_submission_frames:astraFrames,astra_submission_seconds:astraFrames/60,total_draw_submissions:totalSubmissions,top_three:top.map(x=>x.name),top_three_union_frames:top3UnionFrames,top_three_union_seconds:top3UnionFrames/60,top_three_union_share_of_astra_submission_frames:top3UnionFrames/astraFrames},assets:sorted,shots,runs};
fs.writeFileSync(path.join(DIR,'v4-reuse-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({summary:report.summary,crosscheck:report.crosscheck,top_assets:sorted.slice(0,10),longest_runs:runs.filter(r=>r.assets.length).sort((a,b)=>b.seconds-a.seconds).slice(0,12)},null,2));
if(mismatches.length)process.exitCode=1;
