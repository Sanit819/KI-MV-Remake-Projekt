import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const ROOT=process.cwd(), OUT=path.join(ROOT,'exports/preview-v52-lighting');
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const PY='C:/Users/auscar/miniconda3/python.exe';
const AUDIO=path.join(ROOT,'exports/warning-v3-hires/user-flac-trimmed-padded.alac.m4a');
const segments=[{id:'01-opening',start:0,end:237,windows:[.25,1.5,2.5]},{id:'02-climax',start:9840,end:10260,windows:[.5,2.6,5.5]},{id:'03-release-reply',start:12090,end:12570,windows:[.4,1.8,3.7]}];
const run=(exe,args)=>new Promise((resolve,reject)=>{const p=spawn(exe,args,{cwd:ROOT,windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',c=>c===0?resolve():reject(Error(`${exe} exited ${c}`)));});
const summary={review_only:true,full_film_export:false,audio_source:path.relative(ROOT,AUDIO),audio_encoding_count:0,segments:[]};
for(const s of segments){
 const silent=path.join(OUT,`${s.id}-4k60-silent.mp4`),file=path.join(OUT,`${s.id}-4k60.mp4`),duration=(s.end-s.start)/60,start=s.start/60+5;
 if(fs.existsSync(file))throw Error('Refusing to overwrite existing review movie: '+file);
 await run(process.execPath,['exports/preview-v52-lighting/export-preview.mjs','--entry','src/mv52/index.html','--width','3840','--height','2160','--fps','60','--start-frame',String(s.start),'--end-frame',String(s.end),'--query','lighting=1','--video-only','true','--out',silent]);
 await run(FF,['-hide_banner','-loglevel','warning','-n','-i',silent,'-ss',String(start),'-i',AUDIO,'-map','0:v:0','-map','1:a:0','-c','copy','-t',String(duration),'-movflags','+faststart','-metadata',`comment=Review only; body ${s.start/60}-${s.end/60}; source music stream copied, not encoded`,file]);
 await run(PY,['tools/render/verify_full_mv.py',file,'--width','3840','--height','2160','--fps','60','--frames',String(s.end-s.start),'--source-start',String(start),'--audio',AUDIO,'--windows',...s.windows.map(String),'--window-length','.6','--min-correlation','.999','--out',path.join(OUT,`${s.id}-verify.json`)]);
 summary.segments.push({...s,body_start:s.start/60,body_end:s.end/60,duration_seconds:duration,file:path.relative(ROOT,file),audio_source_start:start,verified:true});
 fs.writeFileSync(path.join(OUT,'preview-manifest.json'),JSON.stringify(summary,null,2)+'\n');
}
console.log('Three review clips rendered and independently verified.');
