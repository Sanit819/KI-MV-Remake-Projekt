/** One narrowly scoped recovery: retain audited pixels while fixing MP4 timescale.
 * Default is read-only dry-run. --apply backs up every original JSON before
 * changing resume fingerprints and records the actual historical capture source.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const PARTS=path.join(ROOT,'exports/mv6/final4k/parts');
const MIGRATION=path.join(ROOT,'exports/mv6/final4k/mux-timescale-migration');
const OLD_SOURCE='fdeed27d6e540d70b507326150bee6972a8712654cfa89c9a88a792fe48c946a';
const OLD_RENDERER_SHA='ee6e63a2062e1e72b06b9c2cf8c3d55bbc8bf157acd11b88f6721cd347d2909e';
const TOKEN="'-movie_timescale','60000',";
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonHash=value=>hash(JSON.stringify(value));
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
async function fileHash(file){const h=createHash('sha256');for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
const inside=(base,file)=>{const r=path.relative(base,file);return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
function safe(file,base=path.join(ROOT,'exports/mv6/final4k')){
  file=path.resolve(file);if(!inside(base,file))throw Error(`Path outside recovery scope: ${file}`);
  for(let p=file;p!==ROOT;p=path.dirname(p)){
    try{fs.lstatSync(p);if(path.relative(p,fs.realpathSync(p))!=='')throw Error(`Redirected recovery path: ${p}`);}catch(e){if(e.code!=='ENOENT')throw e;}
  }
  return file;
}
function sourceFingerprint(rendererBytes){
  const h=createHash('sha256');
  const visit=dir=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=path.join(dir,ent.name);if(ent.isSymbolicLink())throw Error(`Source link: ${file}`);
    if(ent.isDirectory())visit(file);else if(ent.isFile()){h.update(path.relative(ROOT,file).replaceAll('\\','/'));h.update('\0');h.update(fs.readFileSync(file));h.update('\0');}
  }};
  for(const dir of['src','data'])visit(path.join(ROOT,dir));h.update(rendererBytes);return h.digest('hex');
}
function endings(text){return{crlf:(text.match(/\r\n/g)||[]).length,bareLf:(text.match(/(?<!\r)\n/g)||[]).length,loneCr:(text.match(/\r(?!\n)/g)||[]).length};}
function proveOnlyTimescale(before,after,count,label){
  const oldText=before.toString('utf8'),newText=after.toString('utf8');
  if(!Buffer.from(oldText).equals(before)||!Buffer.from(newText).equals(after))throw Error(`${label}: non-UTF8 source`);
  if(oldText.includes(TOKEN)||(newText.split(TOKEN).length-1)!==count)throw Error(`${label}: expected exactly ${count} new movie_timescale arguments`);
  const stripped=newText.split(TOKEN).join('');
  const byteIdentical=Buffer.from(stripped).equals(before);
  const newlineOnly=!byteIdentical&&stripped.replace(/\r\n/g,'\n')===oldText.replace(/\r\n/g,'\n');
  if(!byteIdentical&&!newlineOnly)throw Error(`${label}: changes exceed exact movie_timescale insertion and optional CRLF/LF conversion`);
  if(endings(oldText).loneCr||endings(newText).loneCr)throw Error(`${label}: unsupported lone CR`);
  return{label,beforeSha256:hash(before),afterSha256:hash(after),insertedLiteral:TOKEN,insertionCount:count,
    strippedByteIdentical:byteIdentical,onlyAdditionalChangeIsCRLFvsLF:newlineOnly,beforeLineEndings:endings(oldText),afterLineEndings:endings(newText)};
}
function collectReports(){
  const files=[];
  for(const name of['p1','p2','p3','p4']){
    const dir=path.join(PARTS,name+'.chunks');
    if(fs.existsSync(dir))for(const f of fs.readdirSync(dir).sort())if(/^f\d+-\d+\.json$/.test(f))files.push({file:path.join(dir,f),role:'captured-chunk',part:name});
    const report=path.join(PARTS,name+'.render.json');if(fs.existsSync(report))files.push({file:report,role:'completed-part',part:name});
  }
  // Resume checkpoints are replaced last, after all capture evidence aliases.
  for(const name of['p1','p2','p3','p4']){const file=path.join(PARTS,name+'.chunks/checkpoint.json');if(fs.existsSync(file))files.push({file,role:'resume-checkpoint',part:name});}
  return files;
}
async function main(){
  const argv=process.argv.slice(2);if(argv.some(a=>!['--apply','--dry-run'].includes(a))||argv.includes('--apply')&&argv.includes('--dry-run'))throw Error('Usage: node tools/migrate_mv6_mux_timescale.mjs [--dry-run | --apply]');
  const apply=argv.includes('--apply');
  const oldPath=safe(path.join(MIGRATION,'render_mv6.before.mjs')),oldParallelPath=safe(path.join(MIGRATION,'render_mv6_parallel.before.mjs'));
  const rendererPath=path.join(ROOT,'tools/render_mv6.mjs'),parallelPath=path.join(ROOT,'tools/render_mv6_parallel.mjs');
  const old=fs.readFileSync(oldPath),current=fs.readFileSync(rendererPath),oldParallel=fs.readFileSync(oldParallelPath),parallel=fs.readFileSync(parallelPath);
  if(hash(old)!==OLD_RENDERER_SHA)throw Error('Historical renderer backup does not match the captured renderer SHA');
  const proof=[proveOnlyTimescale(old,current,2,'capture renderer'),proveOnlyTimescale(oldParallel,parallel,1,'parallel assembly')];
  const reconstructedOldSource=sourceFingerprint(old),newSource=sourceFingerprint(current);
  if(reconstructedOldSource!==OLD_SOURCE)throw Error('Current src/data are not the exact captured src/data; migration forbidden');
  if(newSource===OLD_SOURCE)throw Error('No timescale migration to perform');
  const completion=safe(path.join(MIGRATION,'migration-complete.json'));
  if(fs.existsSync(completion)){
    const done=readJson(completion);if(done.oldSourceHash!==OLD_SOURCE||done.newSourceHash!==newSource)throw Error('Conflicting migration completion');
    for(const entry of done.entries){if(await fileHash(safe(entry.file))!==entry.newReportSha256||await fileHash(safe(entry.originalBackup))!==entry.originalReportSha256)throw Error('Completed migration evidence was changed');}
    console.log(JSON.stringify({alreadyApplied:true,completion,oldSourceHash:OLD_SOURCE,newSourceHash:newSource}));return;
  }
  const planFile=safe(path.join(MIGRATION,'migration-plan.json'));
  if(fs.existsSync(planFile))throw Error('An incomplete staged migration exists; inspect its immutable plan and backups before explicit recovery');
  const now=new Date().toISOString(),targets=collectReports(),entries=[],media=new Map(),chunkCoverage=[];
  if(!targets.length)throw Error('No old metadata found');
  for(const target of targets){
    safe(target.file);const bytes=fs.readFileSync(target.file),r=JSON.parse(bytes.toString('utf8'));
    if(r.config?.sourceCodeAndDataSha256!==OLD_SOURCE||r.fingerprint!==jsonHash(r.config)||r.captureProvenance)throw Error(`Unexpected source/fingerprint/provenance: ${target.file}`);
    if(r.config.width!==3840||r.config.height!==2160||r.config.fps!==60||r.config.chunkFrames!==600||r.config.pixelTransport!=='uncompressed RGBA8, bottom-up, FFmpeg vflip')throw Error('Unexpected captured configuration');
    if(target.role==='captured-chunk'){
      if(!Number.isInteger(r.first)||!Number.isInteger(r.end)||r.frameAudit?.length!==r.end-r.first||r.frameAudit.some((a,i)=>a.frame!==r.first+i||!Number.isFinite(a.t)||Math.abs(a.t-a.frame/60)>1e-7))throw Error(`Missing original frame audit: ${target.file}`);
      chunkCoverage.push({part:target.part,first:r.first,end:r.end,frames:r.frameAudit.length});
      media.set(safe(target.file.replace(/\.json$/,'.mp4')),r.sha256);
    }
    if(target.role==='completed-part'){
      if(r.auditedFrames!==r.frames||r.frames!==r.interval[1]-r.interval[0])throw Error('Incomplete completed-part evidence');
      media.set(safe(target.file.replace(/\.render\.json$/,'.mp4')),r.sha256);
    }
    const originalBackup=safe(path.join(MIGRATION,'original-metadata',path.relative(PARTS,target.file)));
    if(fs.existsSync(originalBackup))throw Error(`Original backup already exists: ${originalBackup}`);
    const config={...r.config,sourceCodeAndDataSha256:newSource},fingerprint=jsonHash(config);
    const captureProvenance={schema:1,role:target.role,migration:'MP4 movie_timescale-only resume compatibility',migratedAt:now,
      oldConfig:r.config,oldFingerprint:r.fingerprint,originalSourceHash:OLD_SOURCE,capturedRendererSha256:hash(old),
      originalReportSha256:hash(bytes),originalReportBackup:originalBackup,
      acceptedResumeConfig:config,acceptedResumeFingerprint:fingerprint,acceptedResumeSourceHash:newSource,acceptedRendererSha256:hash(current),
      compatibilityProof:path.join(MIGRATION,'migration-plan.json'),originalFrameAuditUnchanged:true,encodedMediaUnchanged:true,
      explanation:'The top-level config/fingerprint are a checked resume-compatibility alias. Historical frames were captured with oldConfig and capturedRendererSha256; they are not claimed to have been rerendered by the patched tool.'};
    const migrated={...r,config,fingerprint,captureProvenance};
    if(jsonHash(r.frameAudit??null)!==jsonHash(migrated.frameAudit??null)||r.sha256!==migrated.sha256)throw Error('Migration attempted to alter frame audits/media hash');
    const newBytes=Buffer.from(JSON.stringify(migrated,null,2));
    entries.push({...target,originalBackup,originalReportSha256:hash(bytes),newReportSha256:hash(newBytes),oldFingerprint:r.fingerprint,newFingerprint:fingerprint,bytes,newBytes});
  }
  for(const [file,expected] of media){if(typeof expected!=='string'||await fileHash(file)!==expected)throw Error(`Captured video hash mismatch: ${file}`);}
  for(const part of['p1','p2','p3','p4']){
    const rows=chunkCoverage.filter(r=>r.part===part).sort((a,b)=>a.first-b.first);for(let i=1;i<rows.length;i++)if(rows[i].first!==rows[i-1].end)throw Error(`Noncontiguous audited chunks in ${part}`);
  }
  const preservedFrames=chunkCoverage.reduce((sum,row)=>sum+row.frames,0);
  if(preservedFrames!==6275)throw Error(`Expected exactly the 6275 already audited frames; found ${preservedFrames}`);
  const orphanFiles=[];
  for(const name of['p1','p2','p3','p4']){
    const dir=path.join(PARTS,name+'.chunks');if(!fs.existsSync(dir))continue;
    for(const f of fs.readdirSync(dir))if(/^f\d+-\d+\.mp4$/.test(f)&&!fs.existsSync(path.join(dir,f.replace(/\.mp4$/,'.json'))))orphanFiles.push({file:path.join(dir,f),bytes:fs.statSync(path.join(dir,f)).size,action:'Untouched and excluded. Child renderer preserves as incomplete before recapture; no frame audit is invented.'});
  }
  const publicEntries=entries.map(({bytes,newBytes,...entry})=>entry);
  const manifest={schema:1,createdAt:now,oldRendererBackup:oldPath,oldParallelBackup:oldParallelPath,oldSourceHash:OLD_SOURCE,reconstructedOldSourceHash:reconstructedOldSource,newSourceHash:newSource,
    proof,preservedFrames,chunkCoverage,encodedFiles:[...media].map(([file,sha256])=>({file,sha256})),entries:publicEntries,orphanFiles,
    allowedChange:'Exactly two capture/part-output and one assembly-output MP4 movie_timescale=60000 arguments, optionally CRLF/LF source line endings; no src/data/pixel/filter/rate changes.'};
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',oldSourceHash:OLD_SOURCE,newSourceHash:newSource,proof,preservedFrames,metadataFiles:entries.length,verifiedMediaFiles:media.size,orphanFiles,plannedManifest:planFile},null,2));
  if(!apply)return;
  if(sourceFingerprint(fs.readFileSync(rendererPath))!==newSource||hash(fs.readFileSync(parallelPath))!==hash(parallel))throw Error('Sources changed during migration preparation');
  // Every byte-for-byte original is saved before replacing any current report.
  for(const entry of entries){fs.mkdirSync(path.dirname(entry.originalBackup),{recursive:true});fs.writeFileSync(entry.originalBackup,entry.bytes,{flag:'wx'});}
  fs.writeFileSync(planFile,JSON.stringify(manifest,null,2),{flag:'wx'});
  for(const entry of entries){
    if(await fileHash(entry.file)!==entry.originalReportSha256)throw Error(`Metadata changed before replacement: ${entry.file}`);
    const temp=safe(entry.file+'.mux-migration-new');fs.writeFileSync(temp,entry.newBytes,{flag:'wx'});fs.renameSync(temp,entry.file);
    if(await fileHash(entry.file)!==entry.newReportSha256)throw Error(`Post-write metadata hash mismatch: ${entry.file}`);
  }
  for(const [file,expected] of media)if(await fileHash(file)!==expected)throw Error(`Video changed during metadata migration: ${file}`);
  if(sourceFingerprint(fs.readFileSync(rendererPath))!==newSource)throw Error('Source changed during metadata migration');
  fs.writeFileSync(completion,JSON.stringify({...manifest,completedAt:new Date().toISOString(),status:'complete'},null,2),{flag:'wx'});
  console.log(JSON.stringify({applied:true,completion,preservedFrames,metadataFiles:entries.length,encodedMediaUnchanged:true}));
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
