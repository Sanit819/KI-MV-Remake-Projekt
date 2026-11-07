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
const out=path.join(project,'exports/v1/review');fs.mkdirSync(out,{recursive:true});
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
const url=`${origin}/Taiyoukei-Disco/production/v1/engine/index.html`;
try{
  await page.goto(url);const meta=await page.evaluate(()=>window.ready),info=await page.evaluate(()=>window.__filmInfo);
  if(info.missing.length||info.warnings.length)throw new Error(JSON.stringify({missing:info.missing,warnings:info.warnings}));
  const arg=process.argv.indexOf('--times');
  const times=arg>=0?process.argv[arg+1].split(',').map(Number):[.25,1.5,6,12,18,24,29,35,41,46,51,55,61,67,74,80,88,94,99,102,108,112,118,125,131,136,139.5,143,150,156,162,167,173,180,184,186,187.5,189,190.5,192,194,197,202.5];
  const records=[];
  for(const t of times){let data=await page.evaluate(async t=>{await window.renderFrame(t);return {png:document.querySelector('#out').toDataURL('image/png').split(',')[1],state:window.frameInfo(t)}},t);let file=path.join(out,`t${t.toFixed(3).padStart(7,'0')}.png`);fs.writeFileSync(file,Buffer.from(data.png,'base64'));records.push({t,file,state:data.state});}
  const capture=async t=>page.evaluate(async t=>{await window.renderFrame(t);return document.querySelector('#out').toDataURL()},t);
  let first=await capture(64.125);await capture(192.4);let second=await capture(64.125);
  if(first!==second)throw new Error('Repeated frame is nondeterministic');
  const cues=JSON.parse(fs.readFileSync(path.join(project,'production/v1/timeline/lyrics-candidate.json'),'utf8')).entries;
  const subtitles=[];
  for(const cue of cues){const state=await page.evaluate(async t=>{await window.renderFrame(t);return window.__subtitleFrame},(cue.start+cue.end)/2);if(!state||state.id!==cue.id||state.ja!==cue.ja.replace(/\s+/g,' ').trim()||state.zh!==cue.zh||state.yJa>=state.yZh)throw new Error('Bilingual cue failed: '+cue.id);subtitles.push(state);}
  const palette=await page.evaluate(async()=>{await window.renderFrame(64.125);return Array.from(document.querySelector('#out').getContext('2d').getImageData(0,0,1,1).data)});
  if(palette.join(',')!=='255,100,82,255')throw new Error('Requested reference palette mismatch: '+palette);
  await page.goto(url+'?watch=1');await page.evaluate(()=>window.ready);
  const playback=await page.evaluate(async()=>{const a=document.querySelector('#audio');a.muted=true;await a.play();await new Promise(r=>setTimeout(r,700));const r={duration:a.duration,time:a.currentTime,paused:a.paused,error:a.error?.message||null,flacSupport:a.canPlayType('audio/flac')};a.pause();return r;});
  if(!playback.time||playback.error||Math.abs(playback.duration-203.2)>.01)throw new Error('FLAC browser playback failed: '+JSON.stringify(playback));
  fs.writeFileSync(path.join(out,'browser-review.json'),JSON.stringify({meta,info,errors,playback,subtitles,palette,determinism:{time:64.125,repeat_frame_equal:true,sha256:crypto.createHash('sha256').update(first).digest('hex')},records},null,2));
  const py=`from PIL import Image,ImageDraw\nfrom pathlib import Path\nimport json,sys,math\nr=Path(sys.argv[1]); rec=json.loads((r/'browser-review.json').read_text(encoding='utf-8'))['records']\nfor off in range(0,len(rec),12):\n items=rec[off:off+12]; s=Image.new('RGB',(1280,math.ceil(len(items)/4)*204),(32,32,34));d=ImageDraw.Draw(s)\n for i,a in enumerate(items):\n  im=Image.open(a['file']).convert('RGB');im.thumbnail((320,180));x=(i%4)*320;y=(i//4)*204;s.paste(im,(x,y));d.text((x+5,y+184),str(a['t'])+'s | '+a['state']['section']['id'],fill='white')\n s.save(r/('sheet-%02d.jpg'%(off//12)),quality=92)\n`;
  execFileSync(path.join(pipeline,'.venv/Scripts/python.exe'),['-c',py,out],{stdio:'inherit',windowsHide:true});
  console.log(JSON.stringify({stills:records.length,missing:info.missing,warnings:info.warnings,errors,playback,repeat_frame_equal:true,out}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
