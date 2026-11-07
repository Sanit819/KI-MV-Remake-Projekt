import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const SELF=fileURLToPath(import.meta.url),ROOT=fs.realpathSync(path.resolve(path.dirname(SELF),'..'));
const RENDER=path.join(ROOT,'tools','render_mv6.mjs'),BASE=path.join(ROOT,'exports','mv6');
const OUTDIR=path.join(BASE,'final4k'),PARTDIR=path.join(OUTDIR,'parts'),LOGDIR=path.join(OUTDIR,'logs');
const OUTPUT=path.join(OUTDIR,'body.mp4'),REPORT=path.join(OUTDIR,'body.render.json');
const W=3840,H=2160,FPS=60,TOTAL=13100,CHUNK=600;
const FF=process.env.FFMPEG_PATH||'D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe';
const FP=process.env.FFPROBE_PATH||path.join(path.dirname(FF),'ffprobe.exe');
const digest=value=>createHash('sha256').update(value).digest('hex');
const inside=(base,file)=>{const rel=path.relative(base,file);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
function safe(file){
  file=path.resolve(file);if(!inside(BASE,file))throw Error('Output must remain below exports/mv6');
  for(let p=file;p!==ROOT;p=path.dirname(p)){
    if(!inside(ROOT,p))throw Error('Output escaped workspace');
    try{fs.lstatSync(p);if(path.relative(p,fs.realpathSync(p))!=='')throw Error(`Redirected path: ${p}`);}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  return file;
}
function freshJson(file,data){safe(file);fs.writeFileSync(file,JSON.stringify(data,null,2),{flag:'wx'});}
async function fileHash(file){const h=createHash('sha256');for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
// Deliberately identical to the child renderer's owning-source fingerprint.
export function sourceFingerprint(){
  const hash=createHash('sha256');
  const visit=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=path.join(dir,ent.name);if(ent.isSymbolicLink())throw Error(`Source link: ${file}`);
    if(ent.isDirectory())visit(file);else if(ent.isFile()){hash.update(path.relative(ROOT,file).replaceAll('\\','/'));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}
  }};
  for(const dir of['src','data'])visit(path.join(ROOT,dir));hash.update(fs.readFileSync(RENDER));return hash.digest('hex');
}
export function buildPlan(transport='png'){return Array.from({length:4},(_,i)=>{
  const first=Math.floor(TOTAL*i/4),end=Math.floor(TOTAL*(i+1)/4),name=`p${i+1}`,file=path.join(PARTDIR,name+'.mp4');
  return{name,first,end,file,transport,report:file.replace(/\.mp4$/,'.render.json'),args:[RENDER,'--width',String(W),'--height',String(H),'--start',String(first),'--end',String(end),'--chunk',String(CHUNK),'--transport',transport,'--out',file,'--ffmpeg',FF,'--ffprobe',FP]};
});}
function accumulator(){return{shots:[],beatChanges:[],semanticChanges:[],missingShotFrames:0,missingSemanticFrames:0};}
function addFrame(summary,r){
  const raw=r.shot??r.audit?.shot??r.audit?.shotId??null;
  const shot=raw&&typeof raw==='object'?(raw.id??raw.key??raw.shotId??raw.name??raw):raw;
  const beat=r.beat??r.audit?.beat??null,semantic=r.semantic??r.audit?.semantic??r.audit?.effect3D??r.audit?.layers3D??null;
  const key=JSON.stringify(shot),last=summary.shots.at(-1);
  if(last&&last.key===key&&last.endFrame===r.frame)last.endFrame=r.frame+1;
  else summary.shots.push({key,shot,firstFrame:r.frame,endFrame:r.frame+1});
  if(shot===null)summary.missingShotFrames++;if(semantic===null)summary.missingSemanticFrames++;
  for(const [field,value,label] of[['beatChanges',beat,'beat'],['semanticChanges',semantic,'semantic']]){
    if(value!==null&&JSON.stringify(summary[field].at(-1)?.[label])!==JSON.stringify(value))summary[field].push({frame:r.frame,[label]:value});
  }
}
export function mergeSummaries(summaries){
  const result=accumulator();
  for(const s of summaries){
    for(const span of s.shots){const last=result.shots.at(-1);if(last&&last.key===span.key&&last.endFrame===span.firstFrame)last.endFrame=span.endFrame;else result.shots.push({...span});}
    for(const [field,label] of[['beatChanges','beat'],['semanticChanges','semantic']])for(const row of s[field]){
      if(JSON.stringify(result[field].at(-1)?.[label])!==JSON.stringify(row[label]))result[field].push(row);
    }
    result.missingShotFrames+=s.missingShotFrames;result.missingSemanticFrames+=s.missingSemanticFrames;
  }
  return result;
}
const sameInterval=(a,b)=>Array.isArray(a)&&a.length===2&&a[0]===b[0]&&a[1]===b[1];
async function validatePart(part,sourceHash){
  safe(part.file);safe(part.report);
  const r=JSON.parse(fs.readFileSync(part.report,'utf8')),c=r.config??{},interval=[part.first,part.end];
  if(c.sourceCodeAndDataSha256!==sourceHash||c.width!==W||c.height!==H||c.fps!==FPS||c.chunkFrames!==CHUNK||!sameInterval(c.interval,interval)||!sameInterval(r.interval,interval)||r.frames!==part.end-part.first||r.auditedFrames!==r.frames||r.width!==W||r.height!==H||r.fps!==FPS)throw Error(`${part.name}: incompatible or incomplete render report`);
  const expectedTransport=part.transport==='raw'?'uncompressed RGBA8, bottom-up, FFmpeg vflip':'lossless PNG';
  if(c.pixelTransport!==expectedTransport)throw Error(`${part.name}: expected ${part.transport} transport evidence`);
  if(r.fingerprint!==digest(JSON.stringify(c))||r.sha256!==await fileHash(part.file))throw Error(`${part.name}: final part fingerprint/hash mismatch`);
  let cursor=part.first;const summary=accumulator(),chunks=[];
  if(!Array.isArray(r.chunks)||!r.chunks.length)throw Error(`${part.name}: missing chunk evidence`);
  for(const ch of r.chunks){
    const chunkRoot=part.file.replace(/\.mp4$/,'.chunks');
    if(!inside(chunkRoot,path.resolve(ch.file))||!inside(chunkRoot,path.resolve(ch.report)))throw Error(`${part.name}: chunk path outside its owning folder`);
    safe(ch.file);safe(ch.report);
    const cr=JSON.parse(fs.readFileSync(ch.report,'utf8'));
    if(ch.first!==cursor||ch.end<=cursor||ch.end>part.end||cr.first!==ch.first||cr.end!==ch.end||cr.fingerprint!==r.fingerprint||cr.config?.sourceCodeAndDataSha256!==sourceHash||cr.sha256!==ch.sha256||ch.sha256!==await fileHash(ch.file))throw Error(`${part.name}: broken chunk chain or hash`);
    if(cr.frameAudit?.length!==ch.end-ch.first)throw Error(`${part.name}: missing per-frame audit`);
    for(const frame of cr.frameAudit){if(frame.frame!==cursor||!Number.isFinite(frame.t)||Math.abs(frame.t-cursor/FPS)>1e-7)throw Error(`${part.name}: frame gap/duplicate at ${cursor}`);addFrame(summary,frame);cursor++;}
    chunks.push({...ch,part:part.name});
  }
  if(cursor!==part.end||summary.missingShotFrames||summary.missingSemanticFrames)throw Error(`${part.name}: incomplete semantic/frame coverage`);
  return{...part,render:r,summary,chunks,verifiedFrames:cursor-part.first};
}
function run(exe,args){return new Promise((resolve,reject)=>{
  const p=spawn(exe,args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err=(err+b).slice(-20000));p.on('error',reject);p.on('close',code=>code===0?resolve(out):reject(Error(err||`${exe} exited ${code}`)));
});}
async function probeBody(file){
  const s=JSON.parse(await run(FP,['-v','error','-select_streams','v:0','-count_packets','-show_entries','stream=width,height,r_frame_rate,nb_frames,nb_read_packets,start_time,duration','-of','json',file])).streams?.[0];
  if(!s||s.width!==W||s.height!==H||s.r_frame_rate!=='60/1'||Number(s.nb_read_packets)!==TOTAL||Number(s.nb_frames)!==TOTAL||Math.abs(Number(s.start_time||0))>2e-6||Math.abs(Number(s.duration)-TOTAL/FPS)>2e-5)throw Error('Assembled body metadata/packet count mismatch');return s;
}

export async function main(argv=process.argv.slice(2)){
  if(argv.includes('--help')){console.log('node tools/render_mv6_parallel.mjs [--transport png|raw] [--jobs 1..4] [--dry-run]\nFour fixed parts; default 2 concurrent jobs and PNG, 3840x2160, 60fps, frames [0,13100).');return;}
  let transport='png',dryRun=false,jobs=2;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--dry-run')dryRun=true;
    else if(argv[i]==='--transport'&&['png','raw'].includes(argv[i+1]))transport=argv[++i];
    else if(argv[i]==='--jobs'&&/^[1-4]$/.test(argv[i+1]||''))jobs=Number(argv[++i]);
    else throw Error(`Unsupported option: ${argv[i]}`);
  }
  const plan=buildPlan(transport),sourceHash=sourceFingerprint(),selfHash=await fileHash(SELF),started=Date.now();
  if(dryRun){console.log(JSON.stringify({sourceHash,transport,jobs,output:OUTPUT,workers:plan.map(p=>({name:p.name,interval:[p.first,p.end],command:[process.execPath,...p.args]}))},null,2));return;}
  if(!fs.readFileSync(RENDER,'utf8').includes("'transport'"))throw Error('Child renderer does not yet expose --transport');
  safe(OUTPUT);safe(REPORT);
  // Never replace a final file lacking matching evidence, even after interruption.
  if(fs.existsSync(OUTPUT)||fs.existsSync(REPORT)){
    if(!fs.existsSync(OUTPUT)||!fs.existsSync(REPORT))throw Error('Existing final lacks its matching file/report; preserve it and resolve explicitly');
    const old=JSON.parse(fs.readFileSync(REPORT,'utf8'));
    if(old.config?.sourceCodeAndDataSha256!==sourceHash||old.config?.orchestratorSha256!==selfHash||old.config?.transport!==transport||!sameInterval(old.interval,[0,TOTAL])||old.frames!==TOTAL||old.auditedFrames!==TOTAL||old.sha256!==await fileHash(OUTPUT)||old.fingerprint!==digest(JSON.stringify(old.config)))throw Error('Existing final is not this verified complete render; refusing to overwrite');
    console.log(JSON.stringify({alreadyComplete:true,out:OUTPUT,frames:TOTAL,sha256:old.sha256}));return;
  }
  for(const dir of[OUTDIR,PARTDIR,LOGDIR]){safe(dir);fs.mkdirSync(dir,{recursive:true});}
  const validated=new Map(),pending=[];
  for(const part of plan){
    if(fs.existsSync(part.file)&&fs.existsSync(part.report)){validated.set(part.name,await validatePart(part,sourceHash));console.log(`[parallel] ${part.name} reused ${part.end-part.first} verified frames`);}
    else pending.push(part);
  }
  const children=new Set();let stopping=false,firstFailure=null;
  const stop=()=>{if(stopping)return;stopping=true;for(const child of children){
    if(!Number.isInteger(child.pid)||child.exitCode!==null)continue;
    if(process.platform==='win32')spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'}).on('error',()=>child.kill());else child.kill('SIGTERM');
  }};
  const interrupted=()=>{firstFailure??=Error('Parallel render interrupted');stop();process.exitCode=1;};process.once('SIGINT',interrupted);process.once('SIGTERM',interrupted);
  try{
    const runWorker=part=>new Promise((resolve,reject)=>{
      if(stopping){reject(Error('Cancelled before worker launch'));return;}
      if(sourceFingerprint()!==sourceHash){firstFailure??=Error('Source changed before worker launch');stop();reject(firstFailure);return;}
      const logfile=safe(path.join(LOGDIR,part.name+'.log')),log=fs.createWriteStream(logfile,{flags:'a'});
      log.write(`\n=== ${new Date().toISOString()} source ${sourceHash} interval ${part.first}..${part.end} ===\n`);
      const child=spawn(process.execPath,part.args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});children.add(child);
      console.log(`[parallel] ${part.name} started ${part.first}..${part.end} (${jobs} job limit)`);
      let buffer='',stderrTail='',lastBucket=0,settled=false;
      const fail=e=>{if(settled)return;settled=true;if(!stopping)firstFailure??=e;stop();children.delete(child);log.end(`\nERROR ${e.message}\n`);reject(e);};
      child.on('error',fail);log.on('error',fail);
      child.stdout.on('data',b=>{log.write(b);buffer+=b;let end;
        while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);const frame=line.match(/\[mv6\] frame (\d+)\//),resume=line.match(/\[mv6\] resumed (\d+)\.\.(\d+)/);
          if(frame){const done=Number(frame[1])-part.first,bucket=Math.floor(done/CHUNK);if(bucket>lastBucket){lastBucket=bucket;console.log(`[parallel] ${part.name} captured ${done}/${part.end-part.first} frames`);}}
          if(resume)console.log(`[parallel] ${part.name} resumed ${resume[1]}..${resume[2]}`);
        }
      });
      child.stderr.on('data',b=>{log.write(b);stderrTail=(stderrTail+b).slice(-16000);});
      child.on('close',code=>{if(settled)return;if(code!==0){fail(Error(`${part.name} exited ${code}; see ${logfile}${stderrTail?'\n'+stderrTail:''}`));return;}settled=true;children.delete(child);log.end();console.log(`[parallel] ${part.name} capture complete; validating evidence`);resolve(part);});
    });
    let next=0;
    await Promise.all(Array.from({length:Math.min(jobs,pending.length)},async()=>{
      while(!stopping){
        const part=pending[next++];if(!part)return;
        try{await runWorker(part);}catch(e){firstFailure??=e;stop();return;}
      }
    }));
    if(firstFailure)throw firstFailure;
    if(stopping)throw Error('Parallel render interrupted');
    if(sourceFingerprint()!==sourceHash)throw Error('Source changed during parallel render');
    for(const part of pending)validated.set(part.name,await validatePart(part,sourceHash));
  }finally{process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);}
  const parts=plan.map(p=>validated.get(p.name)),first=parts[0].render;
  const compatibility=r=>JSON.stringify({browser:r.browser,renderer:r.environment?.renderer,webgl:r.environment?.webgl,three:r.environment?.three,size:r.environment?.size,art:r.sourceArtworkResolution});
  if(parts.some(p=>compatibility(p.render)!==compatibility(first)))throw Error('Worker renderer/browser/artwork environments differ');
  const summary=mergeSummaries(parts.map(p=>p.summary)),frames=parts.reduce((sum,p)=>sum+p.verifiedFrames,0);
  if(frames!==TOTAL||summary.shots[0]?.firstFrame!==0||summary.shots.at(-1)?.endFrame!==TOTAL||summary.shots.some((s,i)=>i&&s.firstFrame!==summary.shots[i-1].endFrame))throw Error('Combined frame coverage is not contiguous');
  const config={entry:'/src/mv6/index.html',width:W,height:H,fps:FPS,totalBodyFrames:TOTAL,interval:[0,TOTAL],chunkFrames:CHUNK,
    transport,pixelTransport:first.config.pixelTransport,workers:4,maxConcurrentJobs:jobs,sourceCodeAndDataSha256:sourceHash,orchestratorSha256:selfHash,
    parts:parts.map(p=>({name:p.name,interval:[p.first,p.end],fingerprint:p.render.fingerprint,sha256:p.render.sha256}))};
  const fingerprint=digest(JSON.stringify(config)),listFile=safe(path.join(OUTDIR,'concat-parts.txt'));
  const list=plan.map(p=>`file 'parts/${p.name}.mp4'\nduration ${((p.end-p.first)/FPS).toFixed(9)}`).join('\n')+'\n';
  if(fs.existsSync(listFile)){if(fs.readFileSync(listFile,'utf8')!==list)throw Error('Unexpected existing concatenation list');}else fs.writeFileSync(listFile,list,{flag:'wx'});
  const temp=safe(path.join(OUTDIR,`body.assembling-${Date.now()}.mp4`));
  const command=[FF,'-v','error','-n','-f','concat','-safe','1','-i',listFile,'-map','0:v:0','-c:v','copy','-an','-video_track_timescale','60000','-movie_timescale','60000','-movflags','+faststart',temp];
  await run(FF,command.slice(1));const metadata=await probeBody(temp),hash=await fileHash(temp);
  if(sourceFingerprint()!==sourceHash)throw Error('Source changed before final assembly publication');
  const report={fingerprint,config,sourceHash,sourceCodeAndDataSha256:sourceHash,environment:first.environment,browser:first.browser,
    width:W,height:H,fps:FPS,frames:TOTAL,interval:[0,TOTAL],auditedFrames:TOTAL,elapsed:(Date.now()-started)/1000,sha256:hash,metadata,
    chunks:parts.flatMap(p=>p.chunks),parts:parts.map(p=>({name:p.name,file:p.file,report:p.report,interval:[p.first,p.end],fingerprint:p.render.fingerprint,sha256:p.render.sha256,verifiedFrames:p.verifiedFrames})),
    summary,sourceArtworkResolution:first.sourceArtworkResolution??first.environment?.sourceArtworkResolution??null,
    resolutionLimit:first.resolutionLimit,audio:'Silent body; package_mv6.py adds original 300-frame warning and complete original audio.',assemblyCommand:command,
    scope:'All 13100 globally numbered frame audits checked in original per-worker chunk reports; chunk/part hashes verified; no missing or duplicate frames. Stream-copy assembly packet count, dimensions, fps, duration and start checked. Full decode/PTS/audio validation belongs to package_mv6.py.'};
  const temporaryReport=safe(path.join(OUTDIR,`body.render.prepared-${Date.now()}.json`));freshJson(temporaryReport,report);
  // Hard-link publication is no-overwrite on Windows and preserves recoverable
  // prepared files if a concurrent writer or interruption occurs between links.
  fs.linkSync(temp,OUTPUT);fs.linkSync(temporaryReport,REPORT);
  fs.unlinkSync(temp);fs.unlinkSync(temporaryReport);
  console.log(JSON.stringify({out:OUTPUT,report:REPORT,frames:TOTAL,sha256:hash,elapsed:report.elapsed,sourceHash}));
}

if(process.argv[1]&&path.resolve(process.argv[1])===SELF)main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
