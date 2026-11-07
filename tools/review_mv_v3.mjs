// Local production QA using the installed pipeline browser launcher.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.dirname(project),pipeline=path.join(root,'vocaloid-style-mv-pipeline');
const {launchBrowser,gpuArgs}=await import(pathToFileURL(path.join(pipeline,'_demo/tools/kit_env.mjs')));
const out=path.join(project,'exports/v3/review');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ttf':'font/ttf','.flac':'audio/flac','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
  let u=new URL(req.url,'http://localhost'),p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404);res.end();return;}
  const size=fs.statSync(p).size,range=req.headers.range?.match(/bytes=(\d*)-(\d*)/),type=mime[path.extname(p)]||'application/octet-stream';
  if(range){let start=Number(range[1]||0),end=Math.min(size-1,range[2]?Number(range[2]):size-1);res.writeHead(206,{'Content-Type':type,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${size}`,'Accept-Ranges':'bytes'});fs.createReadStream(p,{start,end}).pipe(res);}
  else{res.writeHead(200,{'Content-Type':type,'Content-Length':size,'Accept-Ranges':'bytes'});fs.createReadStream(p).pipe(res);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await launchBrowser({headless:true,args:[...gpuArgs(),'--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const url=`${origin}/Taiyoukei-Disco/production/v3/engine/index.html`;
try{
  await page.goto(url);const meta=await page.evaluate(()=>window.ready),info=await page.evaluate(()=>window.__filmInfo);
  if(info.missing.length||info.warnings.length)throw new Error(JSON.stringify({missing:info.missing,warnings:info.warnings}));
  const arg=process.argv.indexOf('--times');
  const times=arg>=0?process.argv[arg+1].split(',').map(Number):[0.25, 6, 12, 18.5, 25, 27.1, 28.5, 31.5, 34.5, 38.5, 41, 46.35, 47.2, 48.5, 50.5, 52.4, 55, 61, 63, 64.125, 67, 70, 72, 73, 74.5, 76.5, 78.5, 80.5, 83.5, 84.8, 85.2, 86.5, 88.5, 90.5, 93, 96.5, 97.6, 98.8, 100.5, 103.5, 106.8, 109.8, 112, 118, 125.5, 128, 131, 136, 139.5, 143, 148.3, 149, 150.2, 151.5, 153.5, 154.5, 156, 159.2, 161, 162, 167, 173, 180, 184, 187.2, 190.1, 193.5, 195.2, 196.2, 197.3, 199.5, 202.5];
  if(arg<0){times.push(30.233,30.267,36.5,39.833,39.867,76.8,87.6,102,105.5);times.sort((a,b)=>a-b);}
  const records=[];
  for(const t of times){let data=await page.evaluate(async t=>{await window.renderFrame(t);return {png:document.querySelector('#out').toDataURL('image/png').split(',')[1],state:window.frameInfo(t),features:window.__v2Features,signature:window.__signatureFrame,ml:{tracking:window.__trackingFrame,classic:window.__classicFrame,attention:window.__attentionFrame,rice:window.__riceFrame}}},t);let file=path.join(out,`t${t.toFixed(3).padStart(7,'0')}.png`);fs.writeFileSync(file,Buffer.from(data.png,'base64'));records.push({t,file,state:data.state,features:data.features,signature:data.signature,ml:data.ml});}
  const capture=async t=>page.evaluate(async t=>{await window.renderFrame(t);return document.querySelector('#out').toDataURL()},t);
  let first=await capture(64.125);await capture(192.4);let second=await capture(64.125);
  if(first!==second)throw new Error('Repeated frame is nondeterministic');
  const deterministicChecks=[];
  for(const t of [18,31.5,48.5,64.125,76.5,83.5,90.5,103.5,151.5,187.5,197.3,202.5]){const a=await capture(t);await capture(t>100?18.45:201.25);const b=await capture(t);if(a!==b)throw new Error('Nondeterministic frame '+t);deterministicChecks.push({time:t,equal:true});}
  const oldReview=JSON.parse(fs.readFileSync(path.join(project,'production/v1/qa/browser-review.json'),'utf8'));
  if(JSON.stringify(info.sections)!==JSON.stringify(oldReview.info.sections))throw new Error('Original story section times changed');
  const cues=JSON.parse(fs.readFileSync(path.join(project,'production/v1/timeline/lyrics-candidate.json'),'utf8')).entries;
  const subtitles=[];
  for(const cue of cues){const state=await page.evaluate(async t=>{await window.renderFrame(t);return window.__subtitleFrame},(cue.start+cue.end)/2);if(!state||state.id!==cue.id||state.ja!==cue.ja.replace(/\s+/g,' ').trim()||state.zh!==cue.zh||state.yJa>=state.yZh)throw new Error('Bilingual cue failed: '+cue.id);subtitles.push(state);}
  const palette=await page.evaluate(async()=>{await window.renderFrame(64.125);return Array.from(document.querySelector('#out').getContext('2d').getImageData(0,0,1,1).data)});
  if(palette.join(',')!=='255,100,82,255')throw new Error('Requested reference palette mismatch: '+palette);
  await page.goto(url+'?watch=1');await page.evaluate(()=>window.ready);
  const playback=await page.evaluate(async()=>{const a=document.querySelector('#audio');a.muted=true;await a.play();await new Promise(r=>setTimeout(r,700));const r={duration:a.duration,time:a.currentTime,paused:a.paused,error:a.error?.message||null,flacSupport:a.canPlayType('audio/flac')};a.pause();return r;});
  if(!playback.time||playback.error||Math.abs(playback.duration-203.2)>.01)throw new Error('FLAC browser playback failed: '+JSON.stringify(playback));
  fs.writeFileSync(path.join(out,'browser-review.json'),JSON.stringify({meta,info,errors,playback,subtitles,palette,story_sections_unchanged:true,determinism:{time:64.125,repeat_frame_equal:true,additional:deterministicChecks,sha256:crypto.createHash('sha256').update(first).digest('hex')},records},null,2));
  const py=`from PIL import Image,ImageDraw\nfrom pathlib import Path\nimport json,sys,math\nr=Path(sys.argv[1]); rec=json.loads((r/'browser-review.json').read_text(encoding='utf-8'))['records']\nfor off in range(0,len(rec),12):\n items=rec[off:off+12]; s=Image.new('RGB',(1280,math.ceil(len(items)/4)*204),(32,32,34));d=ImageDraw.Draw(s)\n for i,a in enumerate(items):\n  im=Image.open(a['file']).convert('RGB');im.thumbnail((320,180));x=(i%4)*320;y=(i//4)*204;s.paste(im,(x,y));d.text((x+5,y+184),str(a['t'])+'s | '+a['state']['section']['id'],fill='white')\n s.save(r/('sheet-%02d.jpg'%(off//12)),quality=92)\n`;
  execFileSync(path.join(pipeline,'.venv/Scripts/python.exe'),['-c',py,out],{stdio:'inherit',windowsHide:true});
  console.log(JSON.stringify({stills:records.length,missing:info.missing,warnings:info.warnings,errors,playback,repeat_frame_equal:true,out}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
