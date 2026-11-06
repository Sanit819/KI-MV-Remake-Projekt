/** Portable reproduction wrapper. Frozen src/mv52final and data are read-only.
 * No private exports, original song, Python, CUDA, or machine-specific path is required.
 * Pictures are reproducible content, not a promise of byte-identical historical MP4s.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash, randomBytes} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {chromium} from 'playwright-core';

const ROOT=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'));
const ENTRY='/src/mv52final/index.html',MANIFEST='data/production-v52final/manifest.json';
const WARNING='/assets/publishing/warning-v02/card-4k.png';
const FPS=60,BODY_FRAMES=13100,argv=process.argv.slice(2);
const booleanFlags=new Set(['check','serve','render','execute','with-warning','help']);
const valueFlags=new Set(['stills','out','width','height','fps','start-frame','end-frame','ffmpeg','browser','encoder','quality','port','audio','audio-offset']);
const options={};
for(let i=0;i<argv.length;i++){
 const key=argv[i].replace(/^--/,'');
 if(!argv[i].startsWith('--')||(!booleanFlags.has(key)&&!valueFlags.has(key)))throw Error('Unknown option: '+argv[i]);
 if(Object.hasOwn(options,key))throw Error('Repeated option: --'+key);
 if(booleanFlags.has(key))options[key]=true;
 else{if(i+1>=argv.length||argv[i+1].startsWith('--'))throw Error('Missing value for --'+key);options[key]=argv[++i];}
}
const usage=`ASTRA v5.2 archive reproduction (Node + playwright-core + optional FFmpeg)
  --check                      Check 79 manifest images, PNG dimensions and declared hashes
  --serve [--port 8769]         Loopback preview with silent playback clock
       [--audio FILE --audio-offset 0]  Optional own browser-playable audio; no copying
  --stills 0,4217,6480          Extract exact BODY frames to a new directory
  --render [--execute]          Plan, or explicitly render a silent BODY interval
       --start-frame 0 --end-frame 13100   End is exclusive; source fps is always 60
       --with-warning          Add the tracked 300-frame warning; start must be 0
  --out exports/archive-v52/... Outputs must be inside exports; existing files never overwritten
  --width 3840 --height 2160    Even 16:9 dimensions; 4K by default
  --browser PATH               Browser executable; otherwise Playwright's installed Chromium
  --ffmpeg PATH                FFmpeg executable; otherwise FFMPEG_PATH or ffmpeg on PATH
  --encoder libx264|h264_nvenc  CPU libx264 is default; no silent encoder substitution
  --quality 19                 CRF for x264 / CQ for NVENC, 0..51
No mode means help. --render without --execute never launches a full export.
See tools/archive/README.md for installation, time bases, audio and evidence limits.`;
const modes=['check','serve','stills','render'].filter(k=>Object.hasOwn(options,k));
if(options.help||!modes.length){console.log(usage);process.exit(0);}
if(modes.length!==1)throw Error('Choose exactly one mode: --check, --serve, --stills or --render');
const mode=modes[0];
if(options.execute&&mode!=='render')throw Error('--execute is only used with --render');
if(options['with-warning']&&mode!=='render')throw Error('--with-warning is only used with --render');
if((options.audio||options['audio-offset'])&&mode!=='serve')throw Error('--audio is preview-only; rendered MP4s are silent. See README for user-supplied audio muxing.');
const W=Number(options.width||3840),H=Number(options.height||2160);
if(![W,H].every(Number.isInteger)||W<=0||H<=0||W%2||H%2||W*9!==H*16||W>7680)throw Error('Use even positive 16:9 dimensions, at most 7680x4320');
if(Number(options.fps||60)!==60)throw Error('The frozen timeline uses exactly 60 fps; --fps must be 60');
const first=Number(options['start-frame']||0),last=Number(options['end-frame']||BODY_FRAMES);
if(![first,last].every(Number.isInteger)||first<0||last<=first||last>BODY_FRAMES)throw Error('Expected BODY frame interval 0 <= start < end <= 13100');
if(options['with-warning']&&first!==0)throw Error('--with-warning requires --start-frame 0');
const prefix=options['with-warning']?300:0,total=last-first+prefix;
const encoder=options.encoder||'libx264',quality=Number(options.quality||19);
if(!['libx264','h264_nvenc'].includes(encoder)||!Number.isFinite(quality)||quality<0||quality>51)throw Error('Invalid encoder or quality');
const FF=options.ffmpeg||process.env.FFMPEG_PATH||'ffmpeg';
const browserPath=options.browser||process.env.BROWSER_PATH||chromium.executablePath();
const shaFile=p=>{const hash=createHash('sha256');const fd=fs.openSync(p,'r'),block=Buffer.alloc(1024*1024);try{let n;while((n=fs.readSync(fd,block,0,block.length,null))>0)hash.update(block.subarray(0,n));}finally{fs.closeSync(fd);}return hash.digest('hex');};
const inside=(base,target)=>{const r=path.relative(base,target);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
const repoFile=relative=>{
 const file=path.resolve(ROOT,relative.replace(/^[/\\]+/,''));
 if(!inside(ROOT,file)||!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('Missing or unsafe archive input: '+relative);
 const real=fs.realpathSync(file);if(!inside(ROOT,real))throw Error('Input symlink escapes repository: '+relative);return real;
};
const readJSON=p=>JSON.parse(fs.readFileSync(repoFile(p),'utf8').replace(/^\uFEFF/,''));
const pngSize=file=>{const fd=fs.openSync(file,'r'),b=Buffer.alloc(24);try{if(fs.readSync(fd,b,0,24,0)!==24||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG header: '+file);return[b.readUInt32BE(16),b.readUInt32BE(20)];}finally{fs.closeSync(fd);}};
function check(){
 const manifest=readJSON(MANIFEST),timeline=readJSON('data/production-v5/timeline.json'),lyrics=readJSON('data/production-v5/lyrics.en-zh.json');
 const entries=Object.entries(manifest.assets||{}),images=[],errors=[];
 for(const [slot,a] of entries){try{
  if(typeof a.path!=='string'||!a.path.startsWith('/assets/'))throw Error('Asset path must be under /assets/');
  const file=repoFile(a.path),[width,height]=pngSize(file),actual=shaFile(file);
  if(width<=0||height<=0||width>16384||height>16384)throw Error('Invalid source dimensions');
  if(a.source_width&&a.source_width!==width||a.source_height&&a.source_height!==height)throw Error('Declared dimensions differ');
  if(a.sha256&&a.sha256!==actual)throw Error('Declared SHA256 differs');
  images.push({slot,path:a.path,width,height,sha256:actual,bytes:fs.statSync(file).size,declared_hash_checked:Boolean(a.sha256)});
 }catch(e){errors.push({slot,path:a.path,error:e.message});}}
 const dependencies=['src/full/vendor/trace.js','assets/astra/v07/interface-openai.svg','data/production-v52/audio-accents.json',WARNING,
  ...['index.html','main.js','art.js','kit.js','early.js','middle.js','late.js','neural.js','spatial-neural.js','lighting.js','extra-light.js'].map(n=>'src/mv52final/'+n)];
 for(const p of dependencies)try{repoFile(p);}catch(e){errors.push({path:p,error:e.message});}
 let warning4k=false;try{const [w,h]=pngSize(repoFile(WARNING));warning4k=w===3840&&h===2160;}catch(e){errors.push({path:WARNING,error:e.message});}
 const checks={manifest_79_slots:entries.length===79,all_images_valid:images.length===79&&errors.length===0,
  warning_card_4k:warning4k,
  timeline_86_shots:timeline.shots?.length===86&&timeline.shots[0].start_frame===0&&timeline.shots.at(-1).end_frame===BODY_FRAMES&&timeline.quiet_tail===6,
  timeline_contiguous:timeline.shots?.every((s,i)=>s.end_frame>s.start_frame&&(i===0||timeline.shots[i-1].end_frame===s.start_frame)),
  bilingual_128_cues:lyrics.lines?.length===128&&lyrics.lines.every(l=>l.text&&l.translation)};
 return{passed:Object.values(checks).every(Boolean),checks,images,errors,scope:'Local file/header/hash and timeline checks; no browser render or original-song requirement.'};
}
const inventory=check();
if(mode==='check'){console.log(JSON.stringify(inventory,null,2));process.exit(inventory.passed?0:1);}
if(!inventory.passed)throw Error('Archive input check failed: '+JSON.stringify(inventory.errors));

function outputPath(value){
 const base=path.join(ROOT,'exports'),target=path.resolve(ROOT,value);
 if(target===base||!inside(base,target))throw Error('Output must be a descendant of this repository exports/ directory');
 let ancestor=target;while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);
 const realBase=fs.existsSync(base)?fs.realpathSync(base):base;
 const realTarget=path.resolve(fs.realpathSync(ancestor),path.relative(ancestor,target));
 if(!inside(ROOT,realBase)||!inside(realBase,realTarget))throw Error('Output symlink escapes the exports directory');
 return target;
}
const frames=mode==='stills'?options.stills.split(',').map(s=>Number(s.trim())):[];
if(mode==='stills'&&(!options.stills.trim()||options.stills.split(',').some(s=>!s.trim())||!frames.length||frames.length>120||new Set(frames).size!==frames.length||frames.some(f=>!Number.isInteger(f)||f<0||f>=BODY_FRAMES)))throw Error('Provide 1..120 distinct BODY frame indices in [0,13100)');
const OUT=mode==='serve'?null:outputPath(options.out||(mode==='stills'?'exports/archive-v52/stills':`exports/archive-v52/${prefix?'warning-and-':''}body-${first}-${last}-${W}x${H}.mp4`));
const reportPath=mode==='render'?OUT.replace(/\.mp4$/i,'.render.json'):mode==='stills'?path.join(OUT,'index.json'):null;
if(mode==='render'&&!/\.mp4$/i.test(OUT))throw Error('Render --out must end in .mp4');
const plannedFiles=mode==='stills'?[reportPath,...frames.map(f=>path.join(OUT,`body-frame-${String(f).padStart(5,'0')}.png`))]:mode==='render'?[OUT,reportPath]:[];
if(plannedFiles.some(p=>fs.existsSync(p)))throw Error('An output already exists; choose a new --out. Nothing will be overwritten.');
const plan={mode,execute:mode==='render'?Boolean(options.execute):true,entry:ENTRY,width:W,height:H,fps:FPS,
 body_frame_interval:[first,last],warning_frames:prefix,video_frames:total,duration_seconds:total/FPS,output:OUT,
 encoder,quality,audio:'none; this renderer creates silent pictures',ffmpeg:FF,browser:browserPath};
if(mode==='render'&&!options.execute){console.log(JSON.stringify(plan,null,2));process.exit(0);}

const userAudio=options.audio?fs.realpathSync(path.resolve(options.audio)):null;
if(userAudio&&!fs.statSync(userAudio).isFile())throw Error('--audio must name a file');
const audioOffset=Number(options['audio-offset']||0);
if(!Number.isFinite(audioOffset)||audioOffset<0)throw Error('--audio-offset must be a nonnegative number of seconds');
const port=Number(options.port||0);if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid loopback port');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.wav':'audio/wav','.mp3':'audio/mpeg','.m4a':'audio/mp4','.mp4':'video/mp4','.flac':'audio/flac','.ogg':'audio/ogg'};
const allowed=['/src/mv52final/','/src/full/vendor/','/assets/','/data/production-v52final/','/data/production-v52/','/data/production-v5/'];
const legacyMedia=new Set(['/media/audio/mili-world-execute-original-bilibili.m4a','/exports/astra-world-execute-me-final-v5-playback-4k60.mp4']);
// A tiny in-memory silent WAV only satisfies frozen-page media preloads. It is
// not a song replacement or an output soundtrack; the preview has its own clock.
const silentWav=Buffer.alloc(44+8000*2);silentWav.write('RIFF');silentWav.writeUInt32LE(silentWav.length-8,4);silentWav.write('WAVEfmt ',8);silentWav.writeUInt32LE(16,16);silentWav.writeUInt16LE(1,20);silentWav.writeUInt16LE(1,22);silentWav.writeUInt32LE(8000,24);silentWav.writeUInt32LE(16000,28);silentWav.writeUInt16LE(2,32);silentWav.writeUInt16LE(16,34);silentWav.write('data',36);silentWav.writeUInt32LE(16000,40);
const token=randomBytes(24).toString('hex');
let server,browser,ff,ffDone,failure=null,received=0,writing=false,stopServe,cleaning=null,interrupted=false;
let ffLog='';const started=Date.now();
function serveFile(req,res,file){
 const size=fs.statSync(file).size,headers={'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416);res.end();return;}const a=Number(m[1]),b=m[2]?Math.min(Number(m[2]),size-1):size-1;if(a>b||a>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${a}-${b}/${size}`,'Content-Length':b-a+1});if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start:a,end:b}).pipe(res);return;}
 res.writeHead(200,{...headers,'Content-Length':size});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
}
const previewScript=`<script>addEventListener('load',async()=>{await window.sample.ready;const audio=document.querySelector('#audio'),button=document.querySelector('#play'),seek=document.querySelector('#seek'),label=document.querySelector('#time');let active=false,origin=0,start=0;audio.pause();audio.onended=null;audio.src=${JSON.stringify(userAudio?'/__archive_audio':'')};if(!${Boolean(userAudio)})audio.removeAttribute('src');const end=13100/60,offset=${audioOffset},hasAudio=${Boolean(userAudio)};function draw(t){t=Math.min(end-1/600,Math.max(0,t));window.sample.renderFrame(t);seek.value=t;label.textContent=t.toFixed(3)+' s';}function time(){return start+(performance.now()-origin)/1000;}button.onclick=async()=>{if(active){start=time();active=false;audio.pause();button.textContent='Play';return;}start=Number(seek.value);if(start>=end-1/60)start=0;if(hasAudio){audio.currentTime=start+offset;try{await audio.play();}catch(e){label.textContent='Audio cannot play: '+e.message;return;}}origin=performance.now();active=true;button.textContent='Pause';};seek.oninput=()=>{start=Number(seek.value);origin=performance.now();if(hasAudio)audio.currentTime=start+offset;draw(start);};function tick(){if(active){const t=time();draw(t);if(t>=end){active=false;audio.pause();button.textContent='Play';}}requestAnimationFrame(tick);}draw(0);tick();document.querySelector('#loading').textContent='Archive preview: BODY seconds; '+(hasAudio?'user-provided audio, check its alignment':'silent clock; no original music included');});</script>`;
async function startServer(){
 server=http.createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p==='.'||p==='..')){res.writeHead(403);res.end('Unsafe HTTP path');return;}
  if(req.method==='POST'&&pathname==='/__archive_frame'){
   if(mode!=='render'||req.headers['x-archive-token']!==token){res.writeHead(403);res.end();return;}
   if(!ff||failure||writing||Number(req.headers['x-frame-index'])!==received||received>=total)throw Error('Invalid or concurrent frame submission');
   writing=true;let bytes=0;const chunks=[];for await(const b of req){bytes+=b.length;if(bytes>W*H*4+2*1024*1024)throw Error('Frame exceeds bound');chunks.push(b);}
   const frame=Buffer.concat(chunks,bytes);if(bytes<24||!frame.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||frame.readUInt32BE(16)!==W||frame.readUInt32BE(20)!==H)throw Error('Invalid native PNG frame');
   await new Promise((resolve,reject)=>ff.stdin.write(frame,e=>e?reject(e):resolve()));received++;writing=false;res.writeHead(200);res.end('ok');
   if(received===1||received%60===0||received===total)console.log(`[archive render] ${received}/${total}`);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  if(legacyMedia.has(pathname)){res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':silentWav.length});res.end(req.method==='HEAD'?undefined:silentWav);return;}
  if(pathname==='/__archive_audio'&&userAudio){serveFile(req,res,userAudio);return;}
  if(!allowed.some(p=>pathname.startsWith(p))){res.writeHead(403);res.end('Outside archive HTTP allowlist');return;}
  const file=repoFile(pathname);
  const realRoute='/'+path.relative(ROOT,file).split(path.sep).join('/');
  if(!allowed.some(p=>realRoute.startsWith(p))){res.writeHead(403);res.end('Input symlink leaves HTTP allowlist');return;}
  if(pathname===ENTRY&&mode==='serve'){const html=fs.readFileSync(file,'utf8').replace('</body>',previewScript+'</body>');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:html);return;}
  serveFile(req,res,file);
 }catch(e){if(req.method==='POST'){failure=e;writing=false;}if(!res.headersSent)res.writeHead(400);res.end(e.message);}});
 server.requestTimeout=0;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return `http://127.0.0.1:${server.address().port}${ENTRY}?w=${W}&h=${H}&artPreview=1`;
}
async function cleanup(){
 if(cleaning)return cleaning;
 cleaning=(async()=>{if(ff&&ff.exitCode===null){ff.stdin.destroy();ff.kill();}if(browser)await browser.close().catch(()=>{});if(server){server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}})();return cleaning;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{interrupted=true;failure=new Error(signal);cleanup().finally(()=>{stopServe?.();process.exitCode=130;});});
function checkedCommand(args){const p=spawnSync(FF,args,{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});if(p.error||p.status!==0)throw Error(`FFmpeg failed: ${p.error?.message||p.stderr}`);return p;}
function saveNew(p,data){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data,{flag:'wx'});}
try{
 const url=await startServer();
 if(mode==='serve'){
  console.log(JSON.stringify({mode:'serve',url,audio:userAudio?'user-provided file':'silent playback',audio_offset:audioOffset,stop:'Ctrl+C',scope:'Loopback only. No upload or final-file changes.'},null,2));
  await new Promise(resolve=>{stopServe=resolve;});
 }else{
  if(!fs.existsSync(browserPath))throw Error('Browser missing. Run npx playwright-core install chromium, or provide --browser PATH.');
  browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
  page.on('pageerror',e=>{failure=e;});
  await page.goto(url,{waitUntil:'load',timeout:60000});await page.evaluate(()=>window.sample.ready);
  const canvas=await page.evaluate(()=>({width:window.sample.canvas.width,height:window.sample.canvas.height}));
  if(canvas.width!==W||canvas.height!==H)throw Error('Frozen renderer canvas dimensions differ');
  const environment={node:process.version,platform:process.platform,browser:await browser.version(),browser_executable:browserPath,fonts:'Frozen Windows system font families; see README. Different font/browser versions can change pixels.'};
  if(mode==='stills'){
   const records=[];
   for(const frame of frames){
    const snap=await page.evaluate(f=>{const s=window.sample;s.renderFrame(f/60);return{png:s.canvas.toDataURL('image/png').split(',')[1],shot:s.currentShot,art:s.artAudit};},frame);
    if(failure)throw failure;const file=path.join(OUT,`body-frame-${String(frame).padStart(5,'0')}.png`);saveNew(file,Buffer.from(snap.png,'base64'));
    records.push({file,body_frame:frame,body_seconds:frame/60,full_film_frame:frame+300,full_film_seconds:frame/60+5,shot:snap.shot,width:W,height:H,sha256:shaFile(file),art:snap.art});
   }
   saveNew(reportPath,JSON.stringify({passed:true,environment,records,scope:'Exact requested frozen-renderer BODY frames; no audio or historical-output dependencies; not encoded final-video evidence.'},null,2)+'\n');
   console.log(JSON.stringify({passed:true,stills:records.length,index:reportPath}));
  }else{
   const version=checkedCommand(['-version']).stdout.split(/\r?\n/)[0];
   fs.mkdirSync(path.dirname(OUT),{recursive:true});
   const codecArgs=encoder==='libx264'?['-preset','medium','-crf',String(quality),'-profile:v','high','-bf','2']:['-preset','p6','-tune','hq','-rc','vbr','-cq',String(quality),'-b:v','0','-profile:v','high','-bf','2'];
   const ffArgs=['-hide_banner','-loglevel','warning','-n','-f','image2pipe','-framerate','60','-vcodec','png','-i','pipe:0','-map','0:v:0','-an','-frames:v',String(total),'-vf','scale=out_color_matrix=bt709:out_range=limited,format=yuv420p','-c:v',encoder,...codecArgs,'-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-video_track_timescale','60000','-movflags','+faststart',OUT];
   ff=spawn(FF,ffArgs,{windowsHide:true,stdio:['pipe','ignore','pipe']});
   ff.stderr.on('data',b=>{ffLog=(ffLog+b.toString()).slice(-16000);});ff.stdin.on('error',e=>{failure=e;});
   ffDone=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(Error(`Encoder exited ${code}: ${ffLog}`)));});ffDone.catch(e=>{failure=e;});
   await page.evaluate(async({first,last,prefix,W,H,token,warning})=>{
    const s=window.sample;let warningBlob;
    if(prefix){const im=new Image();im.src=warning;await im.decode();const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(im,0,0,W,H);warningBlob=await new Promise(r=>c.toBlob(r,'image/png'));if(!warningBlob)throw Error('Warning PNG encoding failed');}
    for(let n=0;n<prefix+last-first;n++){
     let blob=warningBlob;
     if(n>=prefix){s.renderFrame((first+n-prefix)/60);blob=await new Promise((resolve,reject)=>s.canvas.toBlob(b=>b?resolve(b):reject(Error('Canvas PNG failed')),'image/png'));}
     const response=await fetch('/__archive_frame',{method:'POST',headers:{'x-archive-token':token,'x-frame-index':String(n)},body:blob});if(!response.ok)throw Error(await response.text());
    }
   },{first,last,prefix,W,H,token,warning:WARNING});
   if(failure)throw failure;if(received!==total)throw Error('Wrong received frame count');ff.stdin.end();await ffDone;
   const decoded=checkedCommand(['-hide_banner','-loglevel','error','-nostats','-i',OUT,'-map','0:v:0','-an','-fps_mode','passthrough','-progress','pipe:1','-f','null','-']);
   const counts=[...decoded.stdout.matchAll(/^frame=(\d+)\s*$/gm)].map(m=>Number(m[1]));
   const actual=counts.at(-1);if(actual!==total||decoded.stderr.trim())throw Error('Full output decode failed or frame count differs');
   const report={...plan,passed:true,environment:{...environment,ffmpeg:version},encoded_frames:received,decoded_frames:actual,bytes:fs.statSync(OUT).size,sha256:shaFile(OUT),elapsed_seconds:(Date.now()-started)/1000,command:[FF,...ffArgs],encoder_log:ffLog.trim(),source_manifest_sha256:shaFile(repoFile(MANIFEST)),scope:'Silent reproduction from frozen source. Every output frame decoded; input/output counts checked. Does not certify historical MP4 hash identity, native source audio, or continuous human visual review.'};
   saveNew(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,output:OUT,frames:total,sha256:report.sha256,report:reportPath}));
  }
 }
}catch(e){console.error('[archive] '+e.stack);process.exitCode=interrupted?130:1;}
finally{await cleanup();}
