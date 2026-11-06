// Independent review clips only. Default is a dry run; final map is required to render.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DATA=path.join(ROOT,'data/production-v52review'),OUT=path.join(ROOT,'exports/preview-v52-combination');
const plan=JSON.parse(fs.readFileSync(path.join(DATA,'clip-plan.json'),'utf8'));
const map=JSON.parse(fs.readFileSync(path.join(DATA,'candidate-map.json'),'utf8'));
const args=process.argv.slice(2),render=args.includes('--render'),clipIndex=args.indexOf('--clip');
const selected=clipIndex<0?null:args[clipIndex+1].split(',');
const clips=selected===null?plan.clips:plan.clips.filter(c=>selected.includes(c.id));
if(!clips.length)throw Error('Unknown clip');
console.log(JSON.stringify({mode:render?'render':'dry-run',final_map_confirmed:map.final_map_confirmed,entry:plan.entry,audio:'existing AAC packets copied; no audio encode',warning_included:false,clips},null,2));
if(!render)process.exit(0);
if(!map.final_map_confirmed||!plan.final_map_confirmed)throw Error('Final root candidate map is pending. Rebuild manifest after confirmation.');
if(clips.some(c=>(map.blocked_clip_ids||[]).includes(c.id)))throw Error('Selected clip is blocked: '+map.blocked_clip_reason);
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const PY='C:/Users/auscar/miniconda3/python.exe';
const audio=path.join(ROOT,plan.audio_source);
const run=(exe,a)=>new Promise((resolve,reject)=>{const p=spawn(exe,a,{cwd:ROOT,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(Error(`${exe} exited ${c}`)));});
const delivery={review_only:true,time_basis:plan.time_basis,warning_included:false,audio_encoding_count:0,clips:[]};
for(const c of clips){
 const stem=path.join(OUT,c.id),silent=stem+'-4k60-silent.mp4',file=stem+'-4k60-review-aac.mp4';
 if(fs.existsSync(silent)||fs.existsSync(file))throw Error('Refusing to overwrite existing review outputs for '+c.id);
 await run(process.execPath,['tools/render/export_mv52review.mjs','--width','3840','--height','2160','--fps','60','--start-frame',String(c.start_frame),'--end-frame',String(c.end_frame_exclusive),'--query','lighting=1','--video-only','true','--out',silent]);
 await run(FF,['-hide_banner','-loglevel','warning','-n','-i',silent,'-ss',String(c.audio_full_start),'-i',audio,'-map','0:v:0','-map','1:a:0','-c','copy','-t',String(c.duration),'-video_track_timescale','60000','-movflags','+faststart','-metadata',`comment=Independent artwork review; body=${c.body_start}-${c.body_end}; full_audio_start=${c.audio_full_start}; no warning; original AAC packets copied`,file]);
 delivery.clips.push({...c,file:path.relative(ROOT,file).replaceAll('\\','/'),verification_pending:true});
 fs.writeFileSync(path.join(OUT,'render-batch-last.json'),JSON.stringify(delivery,null,2)+'\n');
}
console.log('Selected clips rendered, not yet accepted. Run verify_mv52review.py for complete decode, packet/PTS and source-audio verification.');
