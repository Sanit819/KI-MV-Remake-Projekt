import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),argv=process.argv.slice(2),args={};
for(let i=0;i<argv.length;i+=2)args[argv[i].replace(/^--/,'')]=argv[i+1];
const W=Number(args.width||1920),H=Number(args.height||1080),FPS=60,first=Number(args.start||0),last=Number(args.end||1560),OUT=path.resolve(ROOT,args.out||'exports/vfx-lab-v1/silent.mp4');
const FF=args.ffmpeg||process.env.FFMPEG_PATH||'D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe';
const BROWSER=args.browser||process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const within=(base,target)=>{const rel=path.relative(base,target);return rel&&!rel.startsWith('..')&&!path.isAbsolute(rel)};
if(!within(path.join(ROOT,'exports'),OUT))throw Error('Write outputs only inside this worktree exports');
if(![W,H,first,last].every(Number.isInteger)||W<=0||W*9!==H*16||first<0||last>1560||last<=first)throw Error('Invalid dimensions or frame interval');
const times=args.stills?args.stills.split(',').map(Number):null;
if(!times&&!/\.mp4$/i.test(OUT))throw Error('Video output must end in .mp4');
if(times?.some(x=>!Number.isFinite(x)||x<0||x>=26))throw Error('Invalid still time');
if(!times&&fs.existsSync(OUT))throw Error('Output exists; choose a new name');
const token=randomBytes(18).toString('hex'),mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const temp=path.join(ROOT,'.cache','browser-tmp');fs.mkdirSync(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
let encoder,encoderDone,log='',received=0,browser,error=null;
const server=http.createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(req.method==='POST'&&route==='/frame'){
  if(req.headers['x-token']!==token||Number(req.headers['x-index'])!==received)throw Error('Invalid frame sequence');
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const buffer=Buffer.concat(chunks);
  if(buffer.readUInt32BE(16)!==W||buffer.readUInt32BE(20)!==H)throw Error('Wrong frame size');
  await new Promise((resolve,reject)=>encoder.stdin.write(buffer,e=>e?reject(e):resolve()));received++;res.end('ok');if(received%60===0)console.log(`[vfx] ${received}/${last-first}`);return;
 }
 if(!['GET','HEAD'].includes(req.method))throw Error('Method not allowed');
 if(route==='/favicon.ico'){res.writeHead(204);res.end();return;}
 if(!['/src/','/assets/','/data/','/node_modules/'].some(p=>route.startsWith(p)))throw Error('Outside renderer resources');
 const file=path.resolve(ROOT,'.'+route);if(!within(ROOT,file)||!fs.existsSync(file)||!within(ROOT,fs.realpathSync(file)))throw Error('Missing or unsafe resource');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 }catch(e){error=e;res.writeHead(400);res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const started=Date.now();
try{
 browser=await chromium.launch({executablePath:BROWSER,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});page.on('pageerror',e=>error=e);page.on('console',m=>{if(m.type()==='error')console.error('[browser]',m.text())});
 await page.goto(`http://127.0.0.1:${server.address().port}/src/vfxlab/index.html?w=${W}&h=${H}`,{timeout:60000});
 const environment=await page.evaluate(()=>window.vfx.ready);console.log(JSON.stringify({environment,browser:await browser.version()}));
 if(error)throw error;
 if(times){fs.mkdirSync(OUT,{recursive:true});const records=[];for(const t of times){const result=await page.evaluate(t=>{window.vfx.renderFrame(t);return {png:window.vfx.canvas.toDataURL('image/png').split(',')[1],state:window.vfx.current}},t);const file=path.join(OUT,`t${t.toFixed(3).replace('.','_')}.png`);fs.writeFileSync(file,Buffer.from(result.png,'base64'));records.push({t,file,state:result.state});}fs.writeFileSync(path.join(OUT,'stills.json'),JSON.stringify({environment,records},null,2));console.log(JSON.stringify({stills:records.length,out:OUT}));}
 else{
  fs.mkdirSync(path.dirname(OUT),{recursive:true});const encargs=['-hide_banner','-loglevel','warning','-n','-f','image2pipe','-framerate',String(FPS),'-vcodec','png','-i','pipe:0','-an','-frames:v',String(last-first),'-vf','scale=out_color_matrix=bt709:out_range=limited,format=yuv420p','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq','18','-b:v','0','-profile:v','high','-bf','2','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-video_track_timescale','60000','-movflags','+faststart',OUT];
  encoder=spawn(FF,encargs,{windowsHide:true,stdio:['pipe','ignore','pipe']});encoder.stderr.on('data',b=>log=(log+b.toString()).slice(-16000));encoder.stdin.on('error',e=>error=e);encoderDone=new Promise((r,j)=>{encoder.on('error',j);encoder.on('close',c=>c===0?r():j(Error(log)))});encoderDone.catch(e=>error=e);
  await page.evaluate(async({first,last,token})=>{for(let f=first;f<last;f++){window.vfx.renderFrame(f/60);const blob=await new Promise((r,j)=>window.vfx.canvas.toBlob(b=>b?r(b):j(Error('PNG encode failed')),'image/png'));const res=await fetch('/frame',{method:'POST',headers:{'x-token':token,'x-index':String(f-first)},body:blob});if(!res.ok)throw Error(await res.text());}},{first,last,token});
  encoder.stdin.end();await encoderDone;if(error)throw error;
  const report={environment,browser:await browser.version(),width:W,height:H,fps:FPS,frames:received,interval:[first,last],elapsed:(Date.now()-started)/1000,sha256:createHash('sha256').update(fs.readFileSync(OUT)).digest('hex'),encoderLog:log,command:[FF,...encargs],audio:'silent',scope:'Deterministic rendered frames. Validation and encoded-frame visual review are separate.'};fs.writeFileSync(OUT.replace(/\.mp4$/,'.render.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out:OUT,frames:received,elapsed:report.elapsed}));
 }
}finally{if(encoder&&encoder.exitCode===null)encoder.kill();if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
