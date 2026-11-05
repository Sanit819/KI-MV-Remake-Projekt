/** Decode selected final MP4 frames at native 4K for human inspection. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'exports/final-v5/encoded-stills');fs.mkdirSync(out,{recursive:true});
const ff=path.join(root,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const video=path.join(root,'exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4');
const frames=[0,299,300,2407,9848,9988,12552,12936,13110,13399];
for(const frame of frames){const file=path.join(out,`frame-${String(frame).padStart(5,'0')}.png`);const r=spawnSync(ff,['-hide_banner','-loglevel','error','-y','-ss',(frame/60).toFixed(9),'-i',video,'-map','0:v:0','-frames:v','1','-fps_mode','passthrough',file],{cwd:root,windowsHide:true,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);console.log(path.relative(root,file));}
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({source:video,scope:'Ten selected native 4K decoded MP4 frames; not all-frame visual review.',frames:frames.map(f=>({frame:f,output_seconds:f/60,file:`frame-${String(f).padStart(5,'0')}.png`}))},null,2)+'\n');
