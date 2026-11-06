/** Native 4K60 v5.2 final export. Prior versions and existing final files are immutable.
 * Proven Canvas -> PNG -> h264_nvenc p6/cq19, two isolated workers, four body parts.
 * Prefix pictures and the entire 192k/24bit ALAC track are copied from verified v5.1.
 * Default is a dry run. --execute requires current native runtime QA.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const WORK=path.join(ROOT,'exports/final-v5.2');
const CACHE=path.join(ROOT,'.cache/full-export-v52/3840x2160');
const OUT=path.join(ROOT,'exports/astra-world-execute-me-final-v5.2-lighting-artwork-hires-4k60.mp4');
const ORIGINAL=path.join(ROOT,'exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4');
const ORIGINAL_SHA='19f4a76abfc61c1990d056d018e164ec61e93d147af1436f244cfa57261b7407';
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const PY='C:/Users/auscar/miniconda3/python.exe';
const ENTRY='src/mv52final/index.html';
const MANIFEST='data/production-v52final/manifest.json';
const PROTECTED='docs/production-v52/feedback-round2/protected-baseline.json';
const args=process.argv.slice(2);
const param=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const QA=param('--qa','exports/qa-v52-final/runtime.json');
const execute=args.includes('--execute');
const intervals=[[0,3300],[3300,6600],[6600,9900],[9900,13100]];
const read=p=>JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const hash=async p=>{const h=createHash('sha256');for await(const chunk of fs.createReadStream(path.resolve(ROOT,p)))h.update(chunk);return h.digest('hex');};
const sha=s=>createHash('sha256').update(s).digest('hex');
const info={mode:execute?'execute':'dry-run',entry:ENTRY,manifest:MANIFEST,output:OUT,work:WORK,cache:CACHE,width:3840,height:2160,fps:60,frames:13400,body_frames:13100,warning_frames:300,duration_seconds:13400/60,parts:intervals.map(([first,last],i)=>({index:i+1,first,last})),encoding:{codec:'h264_nvenc',preset:'p6',cq:19,transport:'png',concurrent_parts:2,pixel_format:'yuv420p',color:'BT.709 limited'},audio:'Entire original v5.1 ALAC stream copied; 192000Hz / 24bit / stereo; zero new encodes',runtime_gate:QA,verifier:'tools/render/verify_final_v52.py'};
if(!execute){console.log(JSON.stringify(info,null,2));process.exit(0);}
fs.mkdirSync(WORK,{recursive:true});fs.mkdirSync(CACHE,{recursive:true});
const reportFile=path.join(WORK,'render.json');
const prior=fs.existsSync(reportFile)?read(reportFile):null;
const report={...info,version:'final-v5.2',passed:false,phase:'preflight',started_at:new Date().toISOString(),original:ORIGINAL,original_sha256:ORIGINAL_SHA,prefix_source:ORIGINAL,prefix_source_sha256:ORIGINAL_SHA,audio_encode_count:0,new_1080p_outputs:0,protected_baseline:{path:PROTECTED}};
const started=Date.now();
const save=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
const saveNamed=(name,data)=>fs.writeFileSync(path.join(WORK,name),JSON.stringify(data,null,2)+'\n');
function run(command,argv,label){return new Promise((resolve,reject)=>{saveNamed(label+'.command.json',{command,args:argv});const log=fs.createWriteStream(path.join(WORK,label+'.log'));let tail='';const child=spawn(command,argv,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});const take=b=>{log.write(b);tail=(tail+b).slice(-8000);process.stdout.write(`[${label}] ${b}`);};child.stdout.on('data',take);child.stderr.on('data',take);child.on('error',e=>{log.end();reject(e);});child.on('close',code=>log.end(()=>code===0?resolve():reject(Error(label+' exit '+code+': '+tail))));});}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
async function checkProtected(){const items=read(PROTECTED);if(items.length!==23)throw Error('Expected 23 protected baseline files');for(const item of items){const p=path.join(ROOT,item.path);if(!fs.existsSync(p)||fs.statSync(p).size!==item.bytes||await hash(p)!==item.sha256)throw Error('Protected file changed: '+item.path);}if(await hash(ORIGINAL)!==ORIGINAL_SHA)throw Error('Verified v5.1 source changed');return items.length;}
async function checkInputs(){for(const item of report.input_hashes)if(await hash(item.path)!==item.sha256)throw Error('Input changed during export: '+item.path);}
function preserveIncomplete(file){if(!fs.existsSync(file))return;const absolute=path.resolve(file);if(!absolute.startsWith(CACHE+path.sep))throw Error('Refusing to move outside v5.2 owned cache');const archived=absolute+'.incomplete-'+Date.now();fs.renameSync(absolute,archived);console.log('[cache] preserved '+rel(archived));}

try{
 for(const p of [FF,PY,ORIGINAL,path.join(ROOT,ENTRY),path.join(ROOT,MANIFEST),path.join(ROOT,QA)])if(!fs.existsSync(p))throw Error('Required input missing: '+p);
 report.protected_baseline.sha256=await hash(PROTECTED);
 report.protected_count=await checkProtected();
 const manifest=read(MANIFEST);
 const files=new Set([
  ...walk(path.join(ROOT,'src/mv52final')).filter(p=>/\.(?:js|html|css)$/.test(p)).map(rel),
  ...walk(path.join(ROOT,'data/production-v52final')).filter(p=>/\.json$/.test(p)).map(rel),
  'data/production-v5/timeline.json','data/production-v5/lyrics.en-zh.json',
  'data/production-v52/audio-accents.json','src/full/vendor/trace.js','assets/astra/v07/interface-openai.svg',
  'media/audio/mili-world-execute-original-bilibili.m4a','exports/astra-world-execute-me-final-v5-playback-4k60.mp4',
  'tools/render/export_final_v52.mjs','tools/render/export_v52_frames.mjs',
  rel(ORIGINAL),PROTECTED
 ]);
 for(const asset of Object.values(manifest.assets||{})){if(!asset.path)throw Error('Manifest asset has no path');const p=path.resolve(ROOT,asset.path.replace(/^[/\\]+/,''));if(!p.startsWith(ROOT+path.sep))throw Error('Asset path escapes repository');files.add(rel(p));}
 // Include local JS/CSS/HTML module dependencies if the final renderer imports any sibling source.
 const queue=[...files].filter(p=>/\.(?:js|html|css)$/.test(p));
 for(let i=0;i<queue.length;i++){const source=queue[i],text=fs.readFileSync(path.join(ROOT,source),'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*|src=|href=)["']([^"']+)["']/g)){const spec=match[1].split('?')[0];if(!spec.startsWith('.'))continue;const p=path.resolve(path.dirname(path.join(ROOT,source)),spec);if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())continue;const r=rel(p);if(!files.has(r)){files.add(r);if(/\.(?:js|html|css)$/.test(r))queue.push(r);}}}
 report.input_hashes=[];for(const p of [...files].sort())report.input_hashes.push({path:p,sha256:await hash(p)});
 report.fingerprint=sha(JSON.stringify(report.input_hashes));
 const qa=read(QA);
 if(!qa.passed||qa.width!==3840||qa.height!==2160)throw Error('Passing native 4K runtime QA is required');
 const checked=Array.isArray(qa.input_hashes)?qa.input_hashes:Array.isArray(qa.source_sha256)?qa.source_sha256:[];
 if(!checked.length)throw Error('Runtime QA must include input_hashes of the actual inspected source/assets');
 for(const item of checked){const p=item.path.replace(/^[/\\]+/,'').replaceAll('\\','/');const current=report.input_hashes.find(x=>x.path===p);if(!current||current.sha256!==item.sha256)throw Error('Runtime QA input is stale or absent from export fingerprint: '+item.path);}
 report.runtime_qa={path:QA,sha256:await hash(QA),fingerprint:qa.fingerprint,verified_input_count:checked.length};
 const old=read('exports/final-v5.1-cat/render.json');
 report.audio={...old.audio,stream_copy_source:ORIGINAL,stream_copy_source_sha256:ORIGINAL_SHA,production_decode_count:0,alac_encode_count:0,reused_verified_audio:true,lossy_audio_encoding:false,resampling:false,time_stretch:false};
 const runCache=path.join(CACHE,report.fingerprint.slice(0,16));fs.mkdirSync(runCache,{recursive:true});
 report.body=path.join(runCache,'body-video-only.mp4');
 report.prefix=path.join(runCache,'purple-warning-300.mp4');
 report.parts=intervals.map(([first,last],i)=>({index:i+1,first,last,file:path.join(runCache,`part-${i+1}.mp4`)}));
 report.preflight_passed=true;
 if(fs.existsSync(OUT)){
  if(prior?.fingerprint!==report.fingerprint||!prior.output_sha256||await hash(OUT)!==prior.output_sha256)throw Error('Final v5.2 already exists and does not match this exact export; refusing overwrite');
  report.parts=prior.parts;report.body=prior.body;report.body_sha256=prior.body_sha256;report.output_sha256=prior.output_sha256;report.output_bytes=fs.statSync(OUT).size;report.phase='verifying-existing';report.resumed_existing_output=true;save();
 }else{
  report.phase='rendering';save();
  const renderPart=async part=>{
   const receiptFile=part.file+'.receipt.json',receipt=fs.existsSync(receiptFile)?read(receiptFile):null;
   const partReportFile=part.file.replace(/\.mp4$/,'.render.json');
   if(receipt?.fingerprint===report.fingerprint&&receipt.first===part.first&&receipt.last===part.last&&fs.existsSync(part.file)&&await hash(part.file)===receipt.sha256&&fs.existsSync(partReportFile)){
    part.sha256=receipt.sha256;part.render_report=read(partReportFile);part.reused_matching_part=true;
   }else{
    preserveIncomplete(part.file);preserveIncomplete(partReportFile);preserveIncomplete(receiptFile);
    await run(process.execPath,['tools/render/export_v52_frames.mjs','--execute','--start-frame',String(part.first),'--end-frame',String(part.last),'--transport','png','--codec','h264_nvenc','--quality','19','--out',part.file],`part-${part.index}`);
    part.render_report=read(partReportFile);part.sha256=await hash(part.file);
   }
   const r=part.render_report;
   if(r.entry!==ENTRY||r.width!==3840||r.height!==2160||r.fps!==60||r.source_start_frame!==part.first||r.source_end_frame_exclusive!==part.last||r.encoded_input_frames!==part.last-part.first||!r.video_only||r.codec!=='h264_nvenc'||r.transport!=='png')throw Error('Invalid native part receipt '+part.index);
   fs.writeFileSync(receiptFile,JSON.stringify({fingerprint:report.fingerprint,sha256:part.sha256,first:part.first,last:part.last},null,2)+'\n');save();
  };
  let next=0;const failures=[];
  await Promise.all(Array.from({length:2},async()=>{while(next<report.parts.length){const part=report.parts[next++];try{await renderPart(part);}catch(e){failures.push(e);break;}}}));
  if(failures.length)throw Error(failures.map(e=>e.message).join('\n'));
  report.render_elapsed_seconds=(Date.now()-started)/1000;
  await checkInputs();await checkProtected();report.phase='packaging';save();
  const bodyList=path.join(runCache,'body.ffconcat');fs.writeFileSync(bodyList,'ffconcat version 1.0\n'+report.parts.map(p=>`file '${path.basename(p.file)}'\nduration ${((p.last-p.first)/60).toFixed(9)}\n`).join(''));
  await run(FF,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',bodyList,'-map','0:v:0','-c:v','copy','-an','-frames:v','13100','-t','218.333333333','-video_track_timescale','60000',report.body],'concat-body');
  await run(FF,['-hide_banner','-loglevel','warning','-y','-i',ORIGINAL,'-map','0:v:0','-c:v','copy','-an','-frames:v','300','-video_track_timescale','60000',report.prefix],'extract-verified-warning');
  const finalList=path.join(runCache,'final.ffconcat');fs.writeFileSync(finalList,`ffconcat version 1.0\nfile '${path.basename(report.prefix)}'\nduration 5.000000000\nfile '${path.basename(report.body)}'\nduration 218.333333333\n`);
  const staging=path.join(runCache,'final-staging.mp4');
  await run(FF,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',finalList,'-i',ORIGINAL,'-map','0:v:0','-map','1:a:0','-c','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-metadata','title=ASTRA - world.execute(me); - Final v5.2','-metadata','comment=Native 4K60; approved artwork and lighting; existing 5s purple warning; unchanged full original 192kHz 24bit ALAC; 6s quiet coda; zero audio encoding','-movflags','+faststart',staging],'mux-hires');
  if(fs.existsSync(OUT))throw Error('Final v5.2 appeared during rendering; refusing overwrite');
  // Exclusive copy prevents a race from overwriting a final file; staging remains a recovery source.
  fs.copyFileSync(staging,OUT,fs.constants.COPYFILE_EXCL);
  report.body_sha256=await hash(report.body);report.output_sha256=await hash(OUT);report.output_bytes=fs.statSync(OUT).size;report.phase='verifying';save();
 }
 await run(PY,['tools/render/verify_final_v52.py'],'independent-verification');
 const verification=read('exports/final-v5.2/verification.json');if(!verification.passed)throw Error('Independent final verification failed');
 await checkInputs();await checkProtected();
 report.passed=true;report.phase='complete';report.verification_report='exports/final-v5.2/verification.json';report.finished_at=new Date().toISOString();report.elapsed_seconds=(Date.now()-started)/1000;save();
 console.log(JSON.stringify({passed:true,output:OUT,bytes:report.output_bytes,sha256:report.output_sha256,frames:13400,fps:60,duration:13400/60,audio:'ALAC 192kHz / 24bit / stereo; unchanged packet stream'},null,2));
}catch(error){report.phase='failed';report.error=error.stack;report.elapsed_seconds=(Date.now()-started)/1000;save();throw error;}
