import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {chromium} from 'playwright-core';

const SELF=fileURLToPath(import.meta.url),ROOT=fs.realpathSync(path.resolve(path.dirname(SELF),'..'));
const BASE=path.join(ROOT,'exports','mv6'),FPS=60,TOTAL=13100,DURATION=TOTAL/FPS;
const argv=process.argv.slice(2),args={},allowedOptions=new Set(['width','height','start','end','out','stills','chunk','ffmpeg','ffprobe','browser','transport']);
for(let i=0;i<argv.length;i+=2){
 const key=argv[i].replace(/^--/,'');
 if(!argv[i].startsWith('--')||!allowedOptions.has(key)||argv[i+1]===undefined||argv[i+1].startsWith('--'))throw Error(`Invalid option ${argv[i]}`);
 args[key]=argv[i+1];
}
const W=Number(args.width||1920),H=Number(args.height||1080),first=Number(args.start||0),last=Number(args.end||TOTAL),CHUNK=Number(args.chunk||600);
const useRaw=args.transport==='raw';if(args.transport&&!['raw','png'].includes(args.transport))throw Error('Invalid pixel transport');
const times=args.stills===undefined?null:args.stills.split(',').map(x=>x.trim()===''?NaN:Number(x));
const OUT=path.resolve(ROOT,args.out||(times?'exports/mv6/stills':'exports/mv6/body.mp4'));
const FF=args.ffmpeg||process.env.FFMPEG_PATH||'D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe';
const FP=args.ffprobe||path.join(path.dirname(FF),'ffprobe.exe');
const BROWSER=args.browser||process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const within=(base,target,allowBase=false)=>{const rel=path.relative(base,target);return (allowBase||rel!=='')&&rel!=='..'&&!rel.startsWith(`..${path.sep}`)&&!path.isAbsolute(rel);};
function safeOutput(target){
 if(!within(BASE,target))throw Error('Write only beneath this worktree exports/mv6');
 for(let p=target;;p=path.dirname(p)){
  let exists=false;try{fs.lstatSync(p);exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(exists&&path.relative(p,fs.realpathSync(p))!=='')throw Error(`Redirected output ancestor: ${p}`);
  if(p===ROOT)break;if(!within(ROOT,p))throw Error('Output escaped the worktree');
 }
 return target;
}
function fresh(file){safeOutput(file);if(fs.existsSync(file))throw Error(`Output exists: ${file}`);return file;}
const sha=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function writeJson(file,value,replace=false){
 safeOutput(file);fs.mkdirSync(path.dirname(file),{recursive:true});
 if(!replace){fs.writeFileSync(fresh(file),JSON.stringify(value,null,2),{flag:'wx'});return;}
 const temp=fresh(file+`.tmp-${randomBytes(6).toString('hex')}`);
 fs.writeFileSync(temp,JSON.stringify(value,null,2),{flag:'wx'});safeOutput(file);fs.renameSync(temp,file);
}
function sourceFingerprint(){
 const hash=createHash('sha256');
 const visit=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const file=path.join(dir,ent.name);
  if(ent.isSymbolicLink())throw Error(`Source fingerprint cannot follow a link: ${file}`);
  if(ent.isDirectory())visit(file);else if(ent.isFile()){hash.update(path.relative(ROOT,file).replaceAll('\\','/'));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}
 }};
 for(const dir of ['src','data'])visit(path.join(ROOT,dir));
 hash.update(fs.readFileSync(SELF));
 return hash.digest('hex');
}
function run(exe,command){return new Promise((resolve,reject)=>{
 const proc=spawn(exe,command,{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
 proc.stdout.on('data',b=>stdout+=b);proc.stderr.on('data',b=>stderr=(stderr+b).slice(-16000));proc.on('error',reject);proc.on('close',code=>code===0?resolve(stdout):reject(Error(stderr||`${exe} exited ${code}`)));
});}
async function probe(file,frames,countPackets=true){
 const info=JSON.parse(await run(FP,['-v','error','-select_streams','v:0',...(countPackets?['-count_packets']:[]),'-show_entries','stream=width,height,r_frame_rate,nb_frames,nb_read_packets,start_time,duration','-of','json',file])).streams[0];
 if(!info||info.width!==W||info.height!==H||info.r_frame_rate!=='60/1'||Number(countPackets?info.nb_read_packets:info.nb_frames)!==frames||Math.abs(Number(info.start_time||0))>.000002||Math.abs(Number(info.duration)-frames/FPS)>.00002)throw Error(`Invalid encoded segment: ${file}: ${JSON.stringify(info)}`);
 return info;
}
function summarize(records){
 const shots=[],beats=[],semantics=[];let previousBeat,previousSemantic;
 for(const r of records){
  const audit=r.audit??{},rawShot=r.shot??audit.shot??audit.shotId??null;
  const shot=rawShot&&typeof rawShot==='object'?(rawShot.id??rawShot.key??rawShot.shotId??rawShot.name??rawShot):rawShot;
  const beat=r.beat??audit.beat??null,semantic=r.semantic??audit.semantic??audit.effect3D??audit.layers3D??null;
  const key=JSON.stringify(shot);let span=shots.at(-1);
  if(!span||span.key!==key){span={key,shot,firstFrame:r.frame,endFrame:r.frame+1};shots.push(span);}else span.endFrame=r.frame+1;
  const beatKey=JSON.stringify(beat),semanticKey=JSON.stringify(semantic);
  if(beatKey!==previousBeat&&beat!==null)beats.push({frame:r.frame,beat});
  if(semanticKey!==previousSemantic&&semantic!==null)semantics.push({frame:r.frame,semantic});
  previousBeat=beatKey;previousSemantic=semanticKey;
 }
 return {shots,beatChanges:beats,semanticChanges:semantics,missingShotFrames:records.filter(r=>r.shot==null&&r.audit?.shot==null&&r.audit?.shotId==null).length,missingSemanticFrames:records.filter(r=>r.semantic==null&&r.audit?.semantic==null&&r.audit?.effect3D==null&&r.audit?.layers3D==null).length};
}
safeOutput(OUT);
if(![W,H,first,last,CHUNK].every(Number.isInteger)||W<=0||H<=0||W%2||H%2||W*9!==H*16||first<0||last>TOTAL||last<=first||CHUNK<=0)throw Error('Invalid dimensions, interval or chunk size');
if(times?.some(t=>!Number.isFinite(t)||t<0||t>=DURATION))throw Error('Invalid still time');
if(!times&&!/\.mp4$/i.test(OUT))throw Error('Video output must end in .mp4');
const reportFile=times?path.join(OUT,'stills.json'):OUT.replace(/\.mp4$/i,'.render.json');
const sourceHash=sourceFingerprint(),config={entry:'/src/mv6/index.html',width:W,height:H,fps:FPS,totalBodyFrames:TOTAL,interval:[first,last],chunkFrames:CHUNK,readback:useRaw?'asynchronous PBO, three buffers, explicit Blob collection every eight frames':'Canvas PNG',pixelTransport:useRaw?'uncompressed RGBA8, bottom-up, FFmpeg vflip':'lossless PNG',sourceCodeAndDataSha256:sourceHash};
const fingerprint=createHash('sha256').update(JSON.stringify(config)).digest('hex');
const chunkDir=OUT.replace(/\.mp4$/i,'.chunks'),checkpoint=path.join(chunkDir,'checkpoint.json');
let priorCheckpoint=null;
if(!times&&fs.existsSync(checkpoint)){
 safeOutput(checkpoint);priorCheckpoint=JSON.parse(fs.readFileSync(checkpoint));if(priorCheckpoint.fingerprint!==fingerprint)throw Error('Checkpoint configuration or source changed; choose a new output name');
}
if(times){
 if(fs.existsSync(OUT)&&!fs.statSync(OUT).isDirectory())throw Error('Still output must be a directory');
 const names=times.map(t=>`t${t.toFixed(6).replace('.','_')}.png`);if(new Set(names).size!==names.length)throw Error('Duplicate still filenames');
 for(const n of names)fresh(path.join(OUT,n));fresh(reportFile);
}else if(fs.existsSync(OUT)||fs.existsSync(reportFile)){
 if(fs.existsSync(OUT)&&fs.existsSync(reportFile)){
  const old=JSON.parse(fs.readFileSync(reportFile));if(old.fingerprint===fingerprint&&old.sha256===sha(OUT)){console.log(JSON.stringify({alreadyComplete:true,out:OUT,frames:last-first}));process.exit(0);}
 }
 if(!priorCheckpoint)throw Error('Final output/report exists without matching checkpoint evidence; choose a new output name');
 // The render may have stopped during final concatenation or report writing.
 for(const orphan of [OUT,reportFile])if(fs.existsSync(orphan)){const ext=path.extname(orphan),moved=fresh(orphan.slice(0,-ext.length)+`.incomplete-${Date.now()}${ext}`);fs.renameSync(safeOutput(orphan),moved);}
}
const temp=path.join(BASE,'.browser-tmp');safeOutput(temp);fs.mkdirSync(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const token=randomBytes(18).toString('hex'),mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.css':'text/css','.woff2':'font/woff2'};
const resourceBases=['src','assets','data','node_modules'].map(p=>path.join(ROOT,p));
let encoder,encoderDone,log='',received=0,activeStart=first,browser,error=null;
const server=http.createServer(async(req,res)=>{try{
 const route=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(req.method==='POST'&&route==='/frame'){
  if(!encoder||req.headers['x-token']!==token||Number(req.headers['x-index'])!==received)throw Error('Invalid frame sequence');
  const receiveStart=performance.now(),chunks=[];let length=0;for await(const b of req){length+=b.length;if(length>W*H*5+1048576)throw Error('Oversized frame');chunks.push(b);}const b=Buffer.concat(chunks);
  if(useRaw){if(b.length!==W*H*4||req.headers['x-format']!=='rgba8-bottom-up')throw Error('Invalid raw RGBA frame or byte length');}else if(req.headers['x-format']!=='png'||b.length<24||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.readUInt32BE(16)!==W||b.readUInt32BE(20)!==H)throw Error('Invalid PNG or wrong frame size');
  const receivedAt=performance.now();await new Promise((resolve,reject)=>encoder.stdin.write(b,e=>e?reject(e):resolve()));received++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({receiveMs:receivedAt-receiveStart,pipeMs:performance.now()-receivedAt}));if(received%60===0)console.log(`[mv6] frame ${activeStart+received}/${last}`);return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 if(route==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const file=path.resolve(ROOT,'.'+route);
 if(!resourceBases.some(base=>within(base,file))||!fs.existsSync(file)||!fs.statSync(file).isFile()||!resourceBases.some(base=>within(base,fs.realpathSync(file)))){res.writeHead(404);res.end('Disallowed renderer resource');return;}
 res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');res.setHeader('Content-Length',fs.statSync(file).size);res.setHeader('Cache-Control','no-store');
 if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).on('error',e=>{error=e;res.destroy(e);}).pipe(res);
 }catch(e){if(req.method==='POST')error=e;if(!res.headersSent)res.writeHead(400);res.end(e.message);}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const started=Date.now(),completed=[];
try{
 browser=await chromium.launch({executablePath:BROWSER,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--use-angle=d3d11','--force-high-performance-gpu','--js-flags=--expose-gc']});
 const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});page.on('pageerror',e=>error=e);page.on('console',m=>{if(m.type()==='error')console.error('[browser]',m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/src/mv6/index.html?w=${W}&h=${H}`,{timeout:60000});
 const environment=await page.evaluate(async()=>{
  if(!window.vfx)throw Error('Missing window.vfx API');const ready=await window.vfx.ready;
  if(typeof window.vfx.renderFrame!=='function'||!window.vfx.canvas||!Number.isFinite(window.vfx.duration)||Math.abs(window.vfx.duration-13100/60)>1e-8)throw Error('Invalid full V6 renderer API');return ready??null;
 });
 const browserVersion=await browser.version();console.log(JSON.stringify({environment,browser:browserVersion,config}));if(error)throw error;
 if(times){
  safeOutput(OUT);fs.mkdirSync(OUT,{recursive:true});const records=[];
  for(const t of times){const result=await page.evaluate(async t=>{await window.vfx.renderFrame(t);return {png:window.vfx.canvas.toDataURL('image/png').split(',')[1],state:window.vfx.current??null};},t);const file=fresh(path.join(OUT,`t${t.toFixed(6).replace('.','_')}.png`));fs.writeFileSync(file,Buffer.from(result.png,'base64'),{flag:'wx'});records.push({t,file,state:result.state});if(error)throw error;}
  writeJson(reportFile,{environment,browser:browserVersion,config,fingerprint,records});console.log(JSON.stringify({stills:records.length,out:OUT}));
 }else{
  safeOutput(chunkDir);fs.mkdirSync(chunkDir,{recursive:true});
  for(let begin=first;begin<last;begin+=CHUNK){
   const end=Math.min(begin+CHUNK,last),stem=`f${String(begin).padStart(6,'0')}-${String(end).padStart(6,'0')}`,file=path.join(chunkDir,stem+'.mp4'),recordPath=path.join(chunkDir,stem+'.json');
   safeOutput(file);safeOutput(recordPath);
   if(fs.existsSync(file)&&fs.existsSync(recordPath)){
    const old=JSON.parse(fs.readFileSync(recordPath));if(old.fingerprint!==fingerprint||old.first!==begin||old.end!==end||old.sha256!==sha(file)||old.frameAudit?.length!==end-begin||old.frameAudit.some((r,i)=>r.frame!==begin+i))throw Error(`Chunk evidence mismatch: ${file}`);
    completed.push({file,report:recordPath,first:begin,end,sha256:old.sha256,reused:true});console.log(`[mv6] resumed ${begin}..${end}`);continue;
   }
   // Preserve an interrupted, unverified segment before retrying it.
   for(const orphan of [file,recordPath])if(fs.existsSync(orphan)){const ext=path.extname(orphan),moved=fresh(orphan.slice(0,-ext.length)+`.incomplete-${Date.now()}${ext}`);fs.renameSync(orphan,moved);}
   if(sourceFingerprint()!==sourceHash)throw Error('Renderer source/data changed during capture; stop before mixing versions');
   writeJson(checkpoint,{fingerprint,config,status:'rendering',activeInterval:[begin,end],completed,updatedAt:new Date().toISOString()},true);
   received=0;activeStart=begin;log='';
   const command=['-hide_banner','-loglevel','warning','-n',...(useRaw?['-f','rawvideo','-pixel_format','rgba','-video_size',`${W}x${H}`]:['-f','image2pipe','-vcodec','png']),'-framerate',String(FPS),'-i','pipe:0','-an','-frames:v',String(end-begin),'-vf',(useRaw?'vflip,':'')+'scale=out_color_matrix=bt709:out_range=limited,format=yuv420p','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-surfaces','24','-rc-lookahead','0','-cq','18','-b:v','0','-profile:v','high','-bf','2','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-video_track_timescale','60000','-movflags','+faststart',fresh(file)];
   encoder=spawn(FF,command,{windowsHide:true,stdio:['pipe','ignore','pipe']});encoder.stderr.on('data',b=>log=(log+b).slice(-16000));encoder.stdin.on('error',e=>error=e);
   encoderDone=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(Error(log||`Encoder exited ${code}`)));});encoderDone.catch(e=>error=e);
   const frameAudit=await page.evaluate(async({begin,end,token,useRaw})=>{
    const records=[],canvas=window.vfx.canvas,gl=canvas.getContext('webgl2'),rgba=new Uint8Array(canvas.width*canvas.height*4);if(!gl)throw Error('WebGL2 is required for lossless RGBA capture');if(useRaw&&typeof globalThis.gc!=='function')throw Error('Explicit staging-buffer collection is required');
    const buffers=useRaw?Array.from({length:3},()=>{const b=gl.createBuffer();gl.bindBuffer(gl.PIXEL_PACK_BUFFER,b);gl.bufferData(gl.PIXEL_PACK_BUFFER,rgba.byteLength,gl.STREAM_READ);return b;}):[],pending=[];gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);
    async function send(frame,payload,record,drawMs,readbackMs){
     const sent=performance.now(),response=await fetch('/frame',{method:'POST',headers:{'x-token':token,'x-index':String(frame-begin),'x-format':useRaw?'rgba8-bottom-up':'png'},body:payload});if(!response.ok)throw Error(await response.text());
     record.capturePerformance={drawMs,readbackMs,sendMs:performance.now()-sent,server:await response.json()};
    }
    async function drain(){
     const q=pending.shift(),readStart=performance.now();
     for(;;){const status=gl.clientWaitSync(q.sync,0,0);if(status===gl.WAIT_FAILED)throw Error('GPU readback fence failed');if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;await new Promise(r=>setTimeout(r,4));}
     gl.bindBuffer(gl.PIXEL_PACK_BUFFER,q.buffer);gl.getBufferSubData(gl.PIXEL_PACK_BUFFER,0,rgba);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.deleteSync(q.sync);if(gl.getError()!==gl.NO_ERROR)throw Error('Async RGBA readback failed');
     const payload=new Blob([rgba],{type:'application/octet-stream'});await send(q.frame,payload,q.record,q.drawMs,performance.now()-readStart);
    }
    try{for(let frame=begin;frame<end;frame++){
     const performanceStart=performance.now();await window.vfx.renderFrame(frame/60);const drawEnd=performance.now(),c=window.vfx.current??{};
     const state={frame,t:frame/60,shot:c.shot??c.shotId??null,beat:c.beat??null,semantic:c.semantic??c.effect3D??c.layers3D??null,audit:c.audit??null};
     const encoded=JSON.stringify(state);if(encoded.length>65536)throw Error('Frame audit must be a compact, serializable state');const record=JSON.parse(encoded);records.push(record);
     if(useRaw){const buffer=buffers[(frame-begin)%3];gl.bindBuffer(gl.PIXEL_PACK_BUFFER,buffer);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,0);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();pending.push({frame,record,buffer,sync,drawMs:drawEnd-performanceStart});if(pending.length===3){await drain();if((frame-begin)%8===0){globalThis.gc();await new Promise(r=>setTimeout(r,4));}}}
     else{const payload=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG encode failed')),'image/png'));await send(frame,payload,record,drawEnd-performanceStart,performance.now()-drawEnd);}
    }while(pending.length)await drain();if(useRaw)globalThis.gc();}finally{for(const q of pending)gl.deleteSync(q.sync);for(const b of buffers)gl.deleteBuffer(b);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);}
    return records;
   },{begin,end,token,useRaw});
   encoder.stdin.end();await encoderDone;encoder=null;if(error)throw error;if(received!==end-begin)throw Error('Incomplete chunk');
   const metadata=await probe(file,end-begin),hash=sha(file);
   writeJson(recordPath,{fingerprint,config,first:begin,end,sha256:hash,metadata,environment,frameAudit,summary:summarize(frameAudit),command:[FF,...command],encoderLog:log});
   completed.push({file,report:recordPath,first:begin,end,sha256:hash,reused:false});writeJson(checkpoint,{fingerprint,config,status:'rendering',completed,updatedAt:new Date().toISOString()},true);
  }
  if(sourceFingerprint()!==sourceHash)throw Error('Renderer source/data changed before assembly');
  const listFile=path.join(chunkDir,'concat.txt');safeOutput(listFile);
  const list=completed.map(c=>`file '${path.basename(c.file)}'`).join('\n')+'\n';
  if(fs.existsSync(listFile)){if(fs.readFileSync(listFile,'utf8')!==list)throw Error('Unexpected existing concat list');}else fs.writeFileSync(fresh(listFile),list,{flag:'wx'});
  const concatCommand=['-v','error','-n','-f','concat','-safe','1','-i',listFile,'-map','0:v:0','-c:v','copy','-an','-video_track_timescale','60000','-movflags','+faststart',fresh(OUT)];
  await run(FF,concatCommand);const metadata=await probe(OUT,last-first,false);
  const allAudit=completed.flatMap(c=>JSON.parse(fs.readFileSync(c.report)).frameAudit),summary=summarize(allAudit);
  const report={fingerprint,config,environment,browser:browserVersion,width:W,height:H,fps:FPS,frames:last-first,interval:[first,last],elapsed:(Date.now()-started)/1000,sha256:sha(OUT),metadata,chunks:completed,summary,auditedFrames:allAudit.length,sourceArtworkResolution:environment?.sourceArtworkResolution??environment?.artworkLimits??null,resolutionLimit:'Output resolution does not add detail to the original v5.2 raster character artwork. Native asset pixel dimensions and renderer 3D semantics are only certified when explicitly provided by the renderer audit.',audio:'silent body only; 300-frame warning and original complete audio are added by package_mv6.py',assemblyCommand:[FF,...concatCommand],scope:'Every body frame captured from the full V6 renderer; per-frame state is in chunk JSON. Code/data fingerprint prevents mixed-version resume. Chunk encoded packet counts checked without duplicate decoding; final PTS, complete decoding, audio and visual verification are separate.'};
  writeJson(reportFile,report);writeJson(checkpoint,{fingerprint,config,status:'complete',completed,out:OUT,sha256:report.sha256,updatedAt:new Date().toISOString()},true);console.log(JSON.stringify({out:OUT,frames:last-first,elapsed:report.elapsed,auditedFrames:allAudit.length}));
 }
}catch(failure){if(log)console.error('[encoder details]',log);throw failure;}finally{
 if(encoder&&encoder.exitCode===null)encoder.kill();if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
