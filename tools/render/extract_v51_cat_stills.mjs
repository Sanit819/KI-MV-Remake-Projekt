/** Decode modified scenes from the delivered MP4, at native resolution. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const video=path.join(root,'exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4');
const out=path.join(root,'exports/final-v5.1-cat/encoded-stills');
const ff=path.join(root,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
fs.mkdirSync(out,{recursive:true});
const frames=[5190,5235,5307,5379,5412,5427];
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rows=[];
for(const frame of frames){
 const file=path.join(out,`frame-${frame}.png`);
 const r=spawnSync(ff,['-hide_banner','-loglevel','error','-y','-ss',(frame/60).toFixed(2),'-i',video,'-map','0:v:0','-frames:v','1','-fps_mode','passthrough',file],{cwd:root,windowsHide:true,encoding:'utf8'});
 if(r.status!==0)throw Error(r.stderr);
 rows.push({full_video_frame:frame,full_video_seconds:frame/60,body_frame:frame-300,file:path.relative(out,file),sha256:sha(file)});
 console.log(path.relative(root,file));
}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({source:video,source_sha256:sha(video),scope:'Six selected native-resolution frames decoded from the final MP4, before/during/after the changed scenes. This is visual sampling, not a frame-by-frame human review of the complete video.',frames:rows},null,2)+'\n');
