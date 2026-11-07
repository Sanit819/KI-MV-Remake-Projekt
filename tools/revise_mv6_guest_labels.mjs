/** Assemble three already-rendered, explicitly sourced revisions. No renderer starts.
 * Default: dry-run. --apply creates a new body and mixed-source audit manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const SELF=fileURLToPath(import.meta.url),ROOT=fs.realpathSync(path.resolve(path.dirname(SELF),'..'));
const BASE=path.join(ROOT,'exports/mv6/final4k'),OUT=path.join(ROOT,'exports/mv6/final4k-anonymous');
const BODY=path.join(OUT,'body.mp4'),REPORT=path.join(OUT,'body.render.json');
const FF=process.env.FFMPEG_PATH||'D:/myskills/updream/vocaloid-style-mv-pipeline/_tools/ffmpeg/bin/ffmpeg.exe';
const FP=process.env.FFPROBE_PATH||path.join(path.dirname(FF),'ffprobe.exe');
const TOTAL=13100,FPS=60,W=3840,H=2160;
const BASE_SHA='c057b0912483727f69484c9d3802d0e3d7ea4419c92936c34b70abcdfb28351e';
const BASE_SOURCE='059be3a8159f8b295244daae1d2bf62a826dd569f58e68f1c5322f7b36e54c18';
const LABELS_SOURCE='285e88587307eaf4dcf0d91174b442ff8511973f16dbd6c5fd640298522ad8d1';
const ADDED_MODULE='src/mv6/perception-overlay.js';
const PATCH_INTERVALS=[[2896,3117],[3754,3920],[9529,9690]],PATCH_FRAMES=548;
const digest=b=>createHash('sha256').update(b).digest('hex');
const jsonHash=x=>digest(JSON.stringify(x));
const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const inDir=(base,file)=>{const r=path.relative(base,path.resolve(file));return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
function safe(file,write=false){
  file=path.resolve(file);if(!inDir(write?OUT:path.join(ROOT,'exports/mv6'),file))throw Error(`Outside permitted artifact scope: ${file}`);
  for(let p=file;p!==ROOT;p=path.dirname(p))try{fs.lstatSync(p);if(path.relative(p,fs.realpathSync(p))!=='')throw Error(`Redirected artifact: ${p}`);}catch(e){if(e.code!=='ENOENT')throw e;}
  return file;
}
async function sha(file){const h=createHash('sha256');for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
function sourceFingerprint(overrides=new Map(),excluded=new Set()){
  const h=createHash('sha256');
  const visit=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=path.join(dir,ent.name);if(ent.isSymbolicLink())throw Error(`Source link: ${file}`);
    if(ent.isDirectory())visit(file);else if(ent.isFile()){const rel=path.relative(ROOT,file).replaceAll('\\','/');if(excluded.has(rel))continue;h.update(rel);h.update('\0');h.update(overrides.get(rel)??fs.readFileSync(file));h.update('\0');}
  }};for(const dir of['src','data'])visit(path.join(ROOT,dir));h.update(fs.readFileSync(path.join(ROOT,'tools/render_mv6.mjs')));return h.digest('hex');
}
function sourceProof(){
  const definitions=[
    {path:'src/mv52final/early.js',backup:'mv52final-early.before.js',labelsBackup:'labels-only-early.js',removed:"text(e,names[i],0,270,25,C.paper,{font:'mono',align:'center'});",shots:['R19']},
    {path:'src/mv6/main.js',backup:'mv6-main.before.js',labelsBackup:'labels-only-main.js',removed:"text(GUESTS[n],280,681,28,paper,'Consolas','center');",shots:['R64','R65','R66','R67','R68','R69']}
  ];const overrides=new Map(),labelsOverrides=new Map(),files=[];
  for(const d of definitions){
    const backup=safe(path.join(OUT,'source-before',d.backup)),labelsBackup=safe(path.join(OUT,'source-before',d.labelsBackup)),before=fs.readFileSync(backup),after=fs.readFileSync(labelsBackup);
    const old=before.toString('utf8'),next=after.toString('utf8');
    if(old.split(d.removed).length!==2||next.includes(d.removed))throw Error(`${d.path}: expected one exact guest-label draw removal`);
    const expected=old.replace(d.removed,''),exact=Buffer.from(expected).equals(after);
    const lineEndingsOnly=!exact&&expected.replace(/\r\n/g,'\n')===next.replace(/\r\n/g,'\n');
    if(!exact&&!lineEndingsOnly)throw Error(`${d.path}: changes exceed the authorized draw removal`);
    overrides.set(d.path,before);labelsOverrides.set(d.path,after);files.push({...d,backup,labelsBackup,beforeSha256:digest(before),afterSha256:digest(after),exactBytesAfterDeletion:exact,additionalChangeOnlyCRLFvsLF:lineEndingsOnly});
  }
  const excluded=new Set([ADDED_MODULE]),oldSource=sourceFingerprint(overrides,excluded),labelsSource=sourceFingerprint(labelsOverrides,excluded),postEditSource=sourceFingerprint();
  if(oldSource!==BASE_SOURCE)throw Error('Reconstructed old src/data/renderer hash differs from the approved base');
  if(labelsSource!==LABELS_SOURCE)throw Error('Reconstructed labels-only source differs from the untouched counts capture');
  const shots=readJson(path.join(ROOT,'data/production-v5/timeline.json')).shots;
  const s=id=>shots.find(s=>s.id===id);
  if(s('R14').start_frame!==2896||s('R14').end_frame!==3117||s('R19').start_frame!==3754||s('R19').end_frame!==3920||s('R64').start_frame!==9529||s('R69').end_frame!==9690)throw Error('Timeline patch boundaries changed');
  const approvalFile=safe(path.join(OUT,'source-before/final-scope-approval.json'));
  const common={files,reconstructedBaseSourceCodeAndDataSha256:oldSource,labelsOnlySourceCodeAndDataSha256:labelsSource,postEditSourceCodeAndDataSha256:postEditSource,
    excludedOnlyWhenReconstructingHistoricalSources:[ADDED_MODULE],rendererSha256:digest(fs.readFileSync(path.join(ROOT,'tools/render_mv6.mjs')))};
  if(!fs.existsSync(approvalFile))return{...common,ready:false,pendingSourceApproval:approvalFile};
  const approvalBytes=fs.readFileSync(approvalFile),approval=JSON.parse(approvalBytes.toString('utf8'));
  if(approval.schema!==1||approval.labelsOnlySourceHash!==LABELS_SOURCE||approval.finalSourceHash!==postEditSource||JSON.stringify(approval.affectedIntervals)!==JSON.stringify(PATCH_INTERVALS))throw Error('Final-scope approval has unexpected hashes/intervals');
  if(approval.files?.length!==2||new Set(approval.files.map(f=>f.path)).size!==2||approval.files.some(f=>!labelsOverrides.has(f.path)))throw Error('Only early.js and main.js may be modified in the final approved revision');
  const finalChanges=[];
  for(const f of approval.files){
    const before=labelsOverrides.get(f.path),after=fs.readFileSync(path.join(ROOT,f.path));
    if(f.beforeSha256!==digest(before)||f.afterSha256!==digest(after)||!f.replacements?.length)throw Error(`Approved file hash/replacements mismatch: ${f.path}`);
    let expected=before.toString('utf8');
    for(const change of f.replacements){
      if(typeof change.before!=='string'||!change.before||typeof change.after!=='string'||expected.split(change.before).length!==2)throw Error(`Approved replacement is not unique: ${f.path}`);
      expected=expected.replace(change.before,change.after);
    }
    const exact=Buffer.from(expected).equals(after),newlineOnly=!exact&&f.allowCRLFNormalization===true&&expected.replace(/\r\n/g,'\n')===after.toString('utf8').replace(/\r\n/g,'\n');
    if(!exact&&!newlineOnly)throw Error(`Actual edit exceeds approved literal replacements: ${f.path}`);
    finalChanges.push({...f,exactBytesAfterReplacements:exact,additionalChangeOnlyCRLFvsLF:newlineOnly});
  }
  if(approval.addedFiles?.length!==1||approval.addedFiles[0].path!==ADDED_MODULE||digest(fs.readFileSync(path.join(ROOT,ADDED_MODULE)))!==approval.addedFiles[0].sha256)throw Error('Only the approved perception-overlay module may be added');
  return{...common,ready:true,finalScopeApproval:{file:approvalFile,sha256:digest(approvalBytes),finalChanges,addedFiles:approval.addedFiles},
    revisionStages:[{from:BASE_SOURCE,to:LABELS_SOURCE,action:'Remove six guest names; original two exact draw deletions proved'},
      {from:LABELS_SOURCE,to:postEditSource,action:'Approved R19 equal visible portrait height and R14 perception overlay only'}],
    scope:'Three historical capture sources remain distinct. Final additions are limited to the approved literal edits in early.js/main.js and the one new perception-overlay module; all other src/data bytes reconstruct both historical hashes.'};
}
const definitions=()=>({
  base:{media:path.join(BASE,'body.mp4'),renderReport:path.join(BASE,'body.render.json'),interval:[0,TOTAL]},
  vision:{media:path.join(OUT,'patches/vision.mp4'),renderReport:path.join(OUT,'patches/vision.render.json'),interval:[2896,3117]},
  intro:{media:path.join(OUT,'patches/intro-sized.mp4'),renderReport:path.join(OUT,'patches/intro-sized.render.json'),interval:[3754,3920]},
  counts:{media:path.join(OUT,'patches/counts.mp4'),renderReport:path.join(OUT,'patches/counts.render.json'),interval:[9529,9690]}
});
function summaryAccumulator(){return{shots:[],beatChanges:[],semanticChanges:[],missingShotFrames:0,missingSemanticFrames:0};}
function addFrame(summary,r){
  const raw=r.shot??r.audit?.shot??r.audit?.shotId??null,shot=raw&&typeof raw==='object'?(raw.id??raw.key??raw.shotId??raw.name??raw):raw;
  const semantic=r.semantic??r.audit?.semantic??r.audit?.effect3D??r.audit?.layers3D??null,beat=r.beat??r.audit?.beat??null,key=JSON.stringify(shot),last=summary.shots.at(-1);
  if(last&&last.key===key&&last.endFrame===r.frame)last.endFrame=r.frame+1;else summary.shots.push({key,shot,firstFrame:r.frame,endFrame:r.frame+1});
  if(shot===null)summary.missingShotFrames++;if(semantic===null)summary.missingSemanticFrames++;
  for(const [field,label,value] of[['beatChanges','beat',beat],['semanticChanges','semantic',semantic]])if(value!==null&&JSON.stringify(summary[field].at(-1)?.[label])!==JSON.stringify(value))summary[field].push({frame:r.frame,[label]:value});
}
async function validateSource(id,def,expectedSource){
  safe(def.media);safe(def.renderReport);const r=readJson(def.renderReport),c=r.config??{};
  if(c.sourceCodeAndDataSha256!==expectedSource||r.fingerprint!==jsonHash(c)||r.width!==W||r.height!==H||r.fps!==FPS||JSON.stringify(r.interval)!==JSON.stringify(def.interval)||r.frames!==def.interval[1]-def.interval[0]||r.auditedFrames!==r.frames)throw Error(`${id}: incompatible complete render report`);
  const mediaSha256=await sha(def.media);if(mediaSha256!==r.sha256||id==='base'&&mediaSha256!==BASE_SHA)throw Error(`${id}: body/patch SHA mismatch`);
  const refs=[],fingerprints=new Set(),allowed=new Set(r.parts?.map(p=>p.fingerprint)||[r.fingerprint]);let cursor=def.interval[0];
  if(!r.chunks?.length)throw Error(`${id}: missing source chunks`);
  for(const ch of r.chunks){
    safe(ch.report);safe(ch.file);const cr=readJson(ch.report);
    if(ch.first!==cursor||cr.first!==ch.first||cr.end!==ch.end||cr.end<=cr.first||cr.end>def.interval[1]||cr.config?.sourceCodeAndDataSha256!==expectedSource||cr.fingerprint!==jsonHash(cr.config)||!allowed.has(cr.fingerprint)||cr.sha256!==ch.sha256)throw Error(`${id}: chunk provenance/continuity mismatch`);
    if(cr.frameAudit?.length!==cr.end-cr.first||cr.frameAudit.some((f,i)=>f.frame!==cr.first+i||!Number.isFinite(f.t)||Math.abs(f.t-f.frame/FPS)>1e-7))throw Error(`${id}: incomplete original per-frame audit`);
    if(await sha(ch.file)!==ch.sha256)throw Error(`${id}: chunk media changed`);
    refs.push({...ch,originalInterval:[cr.first,cr.end],captureSource:id,captureFingerprint:cr.fingerprint,sourceCodeAndDataSha256:expectedSource,reportSha256:await sha(ch.report)});
    fingerprints.add(cr.fingerprint);cursor=cr.end;
  }
  if(cursor!==def.interval[1])throw Error(`${id}: source interval incomplete`);
  return{record:{...def,id,renderReportSha256:await sha(def.renderReport),sourceCodeAndDataSha256:expectedSource,renderFingerprint:r.fingerprint,
    mediaSha256,chunkFingerprints:[...fingerprints]},render:r,refs};
}
function run(exe,args,logfile=null){return new Promise((resolve,reject)=>{
  const p=spawn(exe,args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});let out='',err='';
  const log=logfile?fs.createWriteStream(safe(logfile,true),{flags:'a'}):null;
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>{err=(err+b).slice(-24000);log?.write(b);});
  p.on('error',e=>{log?.end();reject(e);});p.on('close',code=>{log?.end();code===0?resolve(out):reject(Error(err||`${exe} exited ${code}`));});
});}
async function validateOutput(file){
  const result=JSON.parse(await run(FP,['-v','error','-select_streams','v:0','-show_packets','-show_streams','-show_entries','packet=pts,duration:stream=width,height,r_frame_rate,nb_frames,time_base,start_pts,start_time,duration','-of','json',file]));
  const s=result.streams?.[0],packets=result.packets??[],sorted=packets.map(p=>Number(p.pts)).sort((a,b)=>a-b);
  if(!s||s.width!==W||s.height!==H||s.r_frame_rate!=='60/1'||s.time_base!=='1/60000'||Number(s.nb_frames)!==TOTAL||Number(s.start_pts)!==0||Math.abs(Number(s.duration)-TOTAL/FPS)>2e-6||packets.length!==TOTAL||sorted.some((p,i)=>p!==i*1000)||packets.some(p=>Number(p.duration)!==1000))throw Error('Assembled body has wrong frame count/dimensions/timing');
  return{metadata:s,packetPTS:{packets:TOTAL,timeBase:'1/60000',firstPTS:0,lastPTS:(TOTAL-1)*1000,step:1000,allPresentationTimestampsExact:true},scope:'All encoded packet PTS and durations checked. Full decode/audio verification remains in package_mv6.py.'};
}
async function main(){
  const argv=process.argv.slice(2);if(argv.some(a=>!['--apply','--dry-run'].includes(a))||argv.includes('--apply')&&argv.includes('--dry-run'))throw Error('Usage: node tools/revise_mv6_guest_labels.mjs [--dry-run | --apply]');
  const apply=argv.includes('--apply'),proof=sourceProof(),defs=definitions(),missing=Object.entries(defs).flatMap(([id,d])=>[d.media,d.renderReport].filter(f=>!fs.existsSync(f)).map(file=>({id,file})));
  if(!proof.ready||missing.length){console.log(JSON.stringify({mode:'dry-run',ready:false,sourceProof:proof,pendingArtifacts:missing},null,2));if(apply)throw Error('Approved source proof, complete base and all three patches are required; this tool never starts a renderer');return;}
  const sources={};for(const [id,def] of Object.entries(defs))sources[id]=await validateSource(id,def,id==='base'?BASE_SOURCE:id==='counts'?LABELS_SOURCE:proof.postEditSourceCodeAndDataSha256);
  const segments=[{first:0,end:2896,captureSource:'base'},{first:2896,end:3117,captureSource:'vision'},{first:3117,end:3754,captureSource:'base'},{first:3754,end:3920,captureSource:'intro'},
    {first:3920,end:9529,captureSource:'base'},{first:9529,end:9690,captureSource:'counts'},{first:9690,end:TOTAL,captureSource:'base'}].map((s,i)=>({...s,id:`segment-${i+1}`,sourceFrameInterval:[s.first,s.end]}));
  const summary=summaryAccumulator(),chunks=[];let cursor=0;
  for(const segment of segments)for(const ref of sources[segment.captureSource].refs){
    const first=Math.max(segment.first,ref.first),end=Math.min(segment.end,ref.end);if(first>=end)continue;
    if(first!==cursor)throw Error('Mixed audit has a gap or overlap');const cr=readJson(ref.report);
    for(const frame of cr.frameAudit)if(frame.frame>=first&&frame.frame<end){if(frame.frame!==cursor)throw Error('Selected audit is discontinuous');addFrame(summary,frame);cursor++;}
    chunks.push({...ref,first,end,selection:'global-frame-half-open',segment:segment.id});
  }
  if(cursor!==TOTAL||summary.missingShotFrames||summary.missingSemanticFrames||summary.shots.length!==86)throw Error('Full mixed-source story audit is incomplete');
  const captureSources=Object.fromEntries(Object.entries(sources).map(([id,s])=>[id,s.record]));
  const config={entry:'/src/mv6/index.html',width:W,height:H,fps:FPS,totalBodyFrames:TOTAL,interval:[0,TOTAL],
    postEditSourceCodeAndDataSha256:proof.postEditSourceCodeAndDataSha256,sourceHashScope:'post-edit source only; captured origins are explicitly listed in captureSources and chunks',
    assembly:'seven exact frame slices, one new NVENC p6 cq14 encode',orchestratorSha256:await sha(SELF),
    captureSources:Object.fromEntries(Object.entries(captureSources).map(([id,s])=>[id,{renderFingerprint:s.renderFingerprint,renderReportSha256:s.renderReportSha256,mediaSha256:s.mediaSha256,sourceCodeAndDataSha256:s.sourceCodeAndDataSha256}])),segments};
  const fingerprint=jsonHash(config);
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',ready:true,output:BODY,frames:TOTAL,rerenderedFrames:PATCH_FRAMES,retainedBaseFrameSources:TOTAL-PATCH_FRAMES,fingerprint,sourceProof:proof,segments,chunkReferences:chunks.length},null,2));
  if(!apply)return;
  safe(BODY,true);safe(REPORT,true);
  if(fs.existsSync(BODY)||fs.existsSync(REPORT)){
    if(!fs.existsSync(BODY)||!fs.existsSync(REPORT))throw Error('Existing output is incomplete; preserve it and resolve explicitly');
    const old=readJson(REPORT);if(old.fingerprint===fingerprint&&old.sha256===await sha(BODY)){console.log(JSON.stringify({alreadyComplete:true,out:BODY}));return;}throw Error('Refusing to overwrite a different existing final');
  }
  const inputArgs=[],filters=[],inputPlan=[];
  for(let i=0;i<segments.length;i++){
    const segment=segments[i],origin=captureSources[segment.captureSource],localFirst=segment.first-origin.interval[0],seekSeconds=Math.floor(localFirst/FPS),trimFirst=localFirst-seekSeconds*FPS,count=segment.end-segment.first;
    if(seekSeconds)inputArgs.push('-ss',String(seekSeconds),'-accurate_seek');inputArgs.push('-i',origin.media);
    filters.push(`[${i}:v]trim=start_frame=${trimFirst}:end_frame=${trimFirst+count},settb=1/60000,setpts=N*1000[s${i}]`);
    inputPlan.push({...segment,inputSeekSeconds:seekSeconds,postSeekTrimFrames:[trimFirst,trimFirst+count],input:origin.media});
  }
  filters.push(segments.map((_,i)=>`[s${i}]`).join('')+`concat=n=${segments.length}:v=1:a=0,settb=1/60000,setpts=N*1000[video]`);
  const temporary=safe(path.join(OUT,`body.assembling-${Date.now()}.mp4`),true);
  const command=['-hide_banner','-loglevel','warning','-n',...inputArgs,'-filter_complex',filters.join(';'),'-map','[video]','-an','-frames:v',String(TOTAL),'-r','60','-fps_mode','cfr',
    '-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-surfaces','24','-rc-lookahead','0','-cq','14','-b:v','0','-profile:v','high','-bf','2','-pix_fmt','yuv420p',
    '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-video_track_timescale','60000','-movie_timescale','60000','-movflags','+faststart',temporary];
  if(sourceFingerprint()!==proof.postEditSourceCodeAndDataSha256)throw Error('Sources changed before assembly');
  console.log('[anonymous] assembling 7 exact frame ranges; original body remains untouched');
  await run(FF,command,path.join(OUT,'assembly.log'));
  const validation=await validateOutput(temporary),outputSha=await sha(temporary);
  if(sourceFingerprint()!==proof.postEditSourceCodeAndDataSha256)throw Error('Sources changed during assembly');
  for(const source of Object.values(captureSources))if(await sha(source.media)!==source.mediaSha256||await sha(source.renderReport)!==source.renderReportSha256)throw Error('Source artifact changed during assembly');
  const base=sources.base.render,report={schema:'mv6-patched-render-v1',mixedCaptureSources:true,fingerprint,config,
    width:W,height:H,fps:FPS,frames:TOTAL,interval:[0,TOTAL],auditedFrames:TOTAL,sha256:outputSha,metadata:validation.metadata,
    environment:base.environment,browser:base.browser,sourceArtworkResolution:base.sourceArtworkResolution??base.environment?.sourceArtworkResolution??null,
    captureSources,segments,auditSources:segments.map(s=>({...s,role:s.captureSource==='base'?'base':'patch',...captureSources[s.captureSource],first:s.first,end:s.end})),chunks,summary,
    sourceProof:proof,revision:{changes:['Six guest AI names removed; ASTRA remains','R19 guest portraits use equal visible artwork height','R14 gains approved perception-failure overlay'],rerenderedIntervals:PATCH_INTERVALS,rerenderedFrames:PATCH_FRAMES,
      retainedBaseFrameSources:TOTAL-PATCH_FRAMES,baseMediaSha256:BASE_SHA,originalAuditsModified:false,
      pixelProvenance:'Unchanged intervals use decoded frames from the completed base body; patched intervals use decoded new render frames. All pass through one additional lossy cq14 NVENC encode, so unchanged intervals are not claimed pixel-identical.'},
    assemblyCommand:[FF,...command],assemblyInputs:inputPlan,validation,resolutionLimit:base.resolutionLimit,
    audio:'Silent body only; package_mv6.py adds original warning and complete original audio.',
    scope:'Original source reports and complete per-frame audits are immutable. Each final-frame selection references its real source whitelist, original chunk interval, report hash and capture fingerprint.'};
  const prepared=safe(path.join(OUT,`body.render.prepared-${Date.now()}.json`),true);fs.writeFileSync(prepared,JSON.stringify(report,null,2),{flag:'wx'});
  fs.copyFileSync(temporary,BODY,fs.constants.COPYFILE_EXCL);fs.copyFileSync(prepared,REPORT,fs.constants.COPYFILE_EXCL);fs.unlinkSync(temporary);fs.unlinkSync(prepared);
  console.log(JSON.stringify({out:BODY,report:REPORT,frames:TOTAL,rerenderedFrames:PATCH_FRAMES,sha256:outputSha,fingerprint}));
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
