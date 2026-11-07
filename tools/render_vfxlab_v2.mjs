import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const ROOT=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const BASE=path.join(ROOT,'exports','vfx-lab-v2');
const SOURCE=path.resolve(ROOT,'../KI-MV-Remake-Projekt/exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4');
const argv=process.argv.slice(2),args={};
const options=new Set(['width','height','start','end','out','stills','ffmpeg','browser']);
for(let i=0;i<argv.length;i+=2){
 const key=argv[i].replace(/^--/,'');
 if(!argv[i].startsWith('--')||!options.has(key)||argv[i+1]===undefined||argv[i+1].startsWith('--'))throw Error(`Invalid option ${argv[i]}`);
 args[key]=argv[i+1];
}
const W=Number(args.width||1920),H=Number(args.height||1080),FPS=60,DURATION=10;
const first=Number(args.start||0),last=Number(args.end||600);
const times=args.stills===undefined?null:args.stills.split(',').map(x=>x.trim()===''?NaN:Number(x));
const OUT=path.resolve(ROOT,args.out||(times?'exports/vfx-lab-v2/stills':'exports/vfx-lab-v2/silent.mp4'));
const FF=args.ffmpeg||process.env.FFMPEG_PATH||'D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe';
const BROWSER=args.browser||process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const within=(base,target,allowBase=false)=>{const rel=path.relative(base,target);return (allowBase||rel!=='')&&rel!=='..'&&!rel.startsWith(`..${path.sep}`)&&!path.isAbsolute(rel);};
function safeOutput(target){
 if(!within(BASE,target))throw Error('Write outputs only beneath this worktree exports/vfx-lab-v2');
 // Check existing ancestors too: a junction/symlink must not redirect any output.
 for(let p=target;;p=path.dirname(p)){
  let exists=false;try{fs.lstatSync(p);exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(exists&&path.relative(p,fs.realpathSync(p))!=='')throw Error(`Redirected output ancestor: ${p}`);
  if(p===ROOT)break;
  if(!within(ROOT,p))throw Error('Output escaped the worktree');
 }
 return target;
}
function freshFile(file){safeOutput(file);if(fs.existsSync(file))throw Error(`Output exists; choose a new name: ${file}`);}
safeOutput(OUT);
if(![W,H,first,last].every(Number.isInteger)||W<=0||H<=0||W%2||H%2||W*9!==H*16||first<0||last>600||last<=first)throw Error('Invalid dimensions or frame interval');
if(times?.some(t=>!Number.isFinite(t)||t<0||t>=DURATION))throw Error('Invalid still time');
const reportFile=times?path.join(OUT,'stills.json'):OUT.replace(/\.mp4$/i,'.render.json');
if(times){
 if(fs.existsSync(OUT)&&!fs.statSync(OUT).isDirectory())throw Error('Still output must be a directory');
 const names=times.map(t=>`t${t.toFixed(6).replace('.','_')}.png`);
 if(new Set(names).size!==names.length)throw Error('Duplicate still filenames');
 for(const name of names)freshFile(path.join(OUT,name));
}else{
 if(!/\.mp4$/i.test(OUT))throw Error('Video output must end in .mp4');
 freshFile(OUT);
}
freshFile(reportFile);
const token=randomBytes(18).toString('hex');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.css':'text/css','.woff2':'font/woff2','.mp4':'video/mp4'};
const allowed=['src','assets','data','node_modules'].map(p=>path.join(ROOT,p));
let encoder,encoderDone,log='',received=0,browser,error=null;
function serveFile(req,res,file){
 const size=fs.statSync(file).size;
 res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');
 res.setHeader('Accept-Ranges','bytes');
 res.setHeader('Cache-Control','no-store');
 let start=0,end=size-1,status=200;
 if(req.headers.range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  const invalid=()=>{res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();};
  if(!m||(!m[1]&&!m[2]))return invalid();
  if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return invalid();start=Math.max(0,size-suffix);}
  else{start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return invalid();
  status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);
 }
 res.setHeader('Content-Length',Math.max(0,end-start+1));res.writeHead(status);
 if(req.method==='HEAD'||size===0){res.end();return;}
 fs.createReadStream(file,{start,end}).on('error',e=>{error=e;res.destroy(e);}).pipe(res);
}
const server=http.createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(req.method==='POST'&&route==='/frame'){
  if(!encoder||req.headers['x-token']!==token||Number(req.headers['x-index'])!==received)throw Error('Invalid frame sequence');
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>W*H*5+1048576)throw Error('Oversized frame');chunks.push(chunk);}
  const buffer=Buffer.concat(chunks);
  if(buffer.length<24||!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||buffer.readUInt32BE(16)!==W||buffer.readUInt32BE(20)!==H)throw Error('Invalid PNG or wrong frame size');
  await new Promise((resolve,reject)=>encoder.stdin.write(buffer,e=>e?reject(e):resolve()));
  received++;res.end('ok');if(received%60===0)console.log(`[vfx-v2] ${received}/${last-first}`);return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(route==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(route==='/source-v52.mp4'){
  if(!fs.existsSync(SOURCE)||path.relative(SOURCE,fs.realpathSync(SOURCE))!=='')throw Error('Missing or redirected source movie');
  serveFile(req,res,SOURCE);return;
 }
 const file=path.resolve(ROOT,'.'+route);
 if(!allowed.some(base=>within(base,file))||!fs.existsSync(file)||!fs.statSync(file).isFile()||!allowed.some(base=>within(base,fs.realpathSync(file)))){
  res.writeHead(404);res.end('Missing or disallowed renderer resource');return;
 }
 serveFile(req,res,file);
 }catch(e){if(req.method==='POST')error=e;if(!res.headersSent)res.writeHead(400);res.end(e.message);}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const started=Date.now();
try{
 browser=await chromium.launch({executablePath:BROWSER,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--use-angle=d3d11','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 page.on('pageerror',e=>error=e);page.on('console',m=>{if(m.type()==='error')console.error('[browser]',m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/src/vfxlab-v2/index.html?w=${W}&h=${H}`,{timeout:60000});
 const environment=await page.evaluate(async()=>{
  if(!window.vfx)throw Error('Missing window.vfx API');
  const ready=await window.vfx.ready;
  if(window.vfx.duration!==10||typeof window.vfx.renderFrame!=='function'||!window.vfx.canvas)throw Error('Invalid v2 renderer API');
  return ready??null;
 });
 const browserVersion=await browser.version();console.log(JSON.stringify({environment,browser:browserVersion}));if(error)throw error;
 if(times){
  safeOutput(OUT);fs.mkdirSync(OUT,{recursive:true});const records=[];
  for(const t of times){
   const result=await page.evaluate(async t=>{await window.vfx.renderFrame(t);return {png:window.vfx.canvas.toDataURL('image/png').split(',')[1],state:window.vfx.current??null};},t);
   const file=path.join(OUT,`t${t.toFixed(6).replace('.','_')}.png`);freshFile(file);fs.writeFileSync(file,Buffer.from(result.png,'base64'),{flag:'wx'});records.push({t,file,state:result.state});
   if(error)throw error;
  }
  freshFile(reportFile);fs.writeFileSync(reportFile,JSON.stringify({environment,browser:browserVersion,records},null,2),{flag:'wx'});console.log(JSON.stringify({stills:records.length,out:OUT}));
 }else{
  fs.mkdirSync(path.dirname(OUT),{recursive:true});freshFile(OUT);
  const encargs=['-hide_banner','-loglevel','warning','-n','-f','image2pipe','-framerate',String(FPS),'-vcodec','png','-i','pipe:0','-an','-frames:v',String(last-first),'-vf','scale=out_color_matrix=bt709:out_range=limited,format=yuv420p','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq','18','-b:v','0','-profile:v','high','-bf','2','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-video_track_timescale','60000','-movflags','+faststart',OUT];
  encoder=spawn(FF,encargs,{windowsHide:true,stdio:['pipe','ignore','pipe']});encoder.stderr.on('data',b=>log=(log+b.toString()).slice(-16000));encoder.stdin.on('error',e=>error=e);
  encoderDone=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',c=>c===0?resolve():reject(Error(log||`Encoder exited ${c}`)));});encoderDone.catch(e=>error=e);
  const frameAudit=await page.evaluate(async({first,last,token})=>{
   const records=[];
   for(let f=first;f<last;f++){
    await window.vfx.renderFrame(f/60);
    const current=window.vfx.current??{};
    records.push({frame:f,t:f/60,audit:current.audit??null,sourceFrame:current.sourceFrame??null,mode:current.mode??null});
    const blob=await new Promise((resolve,reject)=>window.vfx.canvas.toBlob(b=>b?resolve(b):reject(Error('PNG encode failed')),'image/png'));
    const res=await fetch('/frame',{method:'POST',headers:{'x-token':token,'x-index':String(f-first)},body:blob});if(!res.ok)throw Error(await res.text());
   }
   return records;
  },{first,last,token});
  encoder.stdin.end();await encoderDone;if(error)throw error;if(received!==last-first)throw Error('Incomplete frame sequence');
  const report={environment,browser:browserVersion,width:W,height:H,fps:FPS,frames:received,interval:[first,last],elapsed:(Date.now()-started)/1000,sha256:createHash('sha256').update(fs.readFileSync(OUT)).digest('hex'),encoderLog:log,command:[FF,...encargs],audio:'silent',frameAudit,scope:'Awaited renderer frames. DOM source seek audit is recorded when supplied; frame-perfect source seeking is not assumed. Encoded-frame visual/audio review is separate.'};
  freshFile(reportFile);fs.writeFileSync(reportFile,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out:OUT,frames:received,elapsed:report.elapsed}));
 }
}finally{
 if(encoder&&encoder.exitCode===null)encoder.kill();if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
