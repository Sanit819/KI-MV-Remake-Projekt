/** Final delivery: native 4K60 pictures + existing bit-exact 192k/24bit ALAC.
 * No new 1080p file and no lossy audio encode. Prior versions are read-only.
 * Resume reuses only parts whose complete renderer/art fingerprint still matches.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const WORK=path.join(ROOT,'exports/final-v5'),CACHE=path.join(ROOT,'.cache/full-export-v5/3840x2160');
const OUT=path.join(ROOT,'exports/astra-world-execute-me-final-v5-warning-hires-4k60.mp4');
const BODY=path.join(CACHE,'body-video-only.mp4'),PREFIX=path.join(CACHE,'purple-warning-300.mp4');
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const PY='C:/Users/auscar/miniconda3/python.exe';
const read=p=>JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));
const hash=async f=>{const h=createHash('sha256');for await(const b of fs.createReadStream(f))h.update(b);return h.digest('hex');};
const parts=[[0,3300],[3300,6600],[6600,9900],[9900,13100]].map(([first,last],i)=>({index:i+1,first,last,file:path.join(CACHE,`part-${i+1}.mp4`)}));
if(process.argv.includes('--dry-run')){console.log(JSON.stringify({output:OUT,width:3840,height:2160,fps:60,frames:13400,body_frames:13100,warning_frames:300,audio:'ALAC 192000 Hz / 24 bit / stereo; stream-copy; no AAC',parts,verification:'complete decode, all packet PTS/payloads, native PCM identity and 8 music windows'},null,2));process.exit(0);}
fs.mkdirSync(WORK,{recursive:true});fs.mkdirSync(CACHE,{recursive:true});
const reportFile=path.join(WORK,'render.json');
const report={version:'final-v5',passed:false,phase:'preflight',started_at:new Date().toISOString(),width:3840,height:2160,fps:60,frames:13400,body_frames:13100,warning_frames:300,duration_seconds:13400/60,output:OUT,body:BODY,parts,encoding:{codec:'h264_nvenc',preset:'p6',cq:19,pixel_format:'yuv420p',color:'BT.709 limited',native_canvas:[3840,2160],transport:'png',concurrent_parts:2,audio_encode_count:0},new_1080p_outputs:0};
const save=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
function run(command,args,label,{quiet=false}={}){return new Promise((resolve,reject)=>{fs.writeFileSync(path.join(WORK,label+'.command.json'),JSON.stringify({command,args},null,2));const log=fs.createWriteStream(path.join(WORK,label+'.log'));const child=spawn(command,args,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});let tail='';const ondata=b=>{log.write(b);tail=(tail+b).slice(-8000);if(!quiet)process.stdout.write(`[${label}] ${b}`);};child.stdout.on('data',ondata);child.stderr.on('data',ondata);child.on('error',reject);child.on('close',code=>log.end(()=>code?reject(Error(`${label} exit ${code}: ${tail}`)):resolve()));});}
const started=Date.now();
try{
 const manifest=read('assets/astra/v09/manifest.json');if(manifest.new_pose_count!==52||manifest.missing.length||!manifest.shadow_complete||manifest.status!=='v5-complete-original-action-assets')throw Error('All 52 inspected corrected shadow-face poses are required before final export.');
 const qa=read('exports/qa-v5-final/qa-v5.json');if(!qa.passed||qa.width!==3840||qa.height!==2160)throw Error('Passing native 4K runtime QA required.');
 for(const p of ['docs/validation/astra-v5-neural-math.json','docs/validation/astra-v5-neural-runtime.json','docs/validation/astra-v5-middle-continuous.json','docs/validation/astra-v5-late-runtime.json','docs/validation/astra-v5-artwork-inventory.json','exports/final-v5/v5-reuse-audit.json'])if(!read(p).passed)throw Error('Required final validation has not passed: '+p);
 const reuse=read('exports/final-v5/v5-reuse-audit.json');if(reuse.actual_qa_sha256!==await hash(path.join(ROOT,'exports/qa-v5-final/qa-v5.json')))throw Error('Reuse report does not match current 4K QA.');
 const inputFiles=[...fs.readdirSync(path.join(ROOT,'src/mv5')).filter(n=>/\.(js|html)$/.test(n)).map(n=>'src/mv5/'+n),'src/full/vendor/trace.js','data/production-v5/timeline.json','data/production-v5/lyrics.en-zh.json','assets/astra/v09/manifest.json',...Object.values(manifest.assets).map(a=>a.path.slice(1))];
 report.input_hashes=[];for(const relative of [...new Set(inputFiles)].sort())report.input_hashes.push({path:relative,sha256:await hash(path.join(ROOT,relative))});
 for(const s of qa.source_sha256){const actual=report.input_hashes.find(x=>x.path===s.path);if(!actual||actual.sha256!==s.sha256)throw Error('Renderer changed after QA: '+s.path);}
 if(qa.input_hashes.manifest!==await hash(path.join(ROOT,'assets/astra/v09/manifest.json')))throw Error('Manifest changed after QA.');
 report.fingerprint=createHash('sha256').update(JSON.stringify(report.input_hashes)).digest('hex');
 const prior=read('exports/warning-v3-hires/render.json');if(!prior.passed)throw Error('Prior native audio not verified.');
 report.audio={...prior.audio,production_decode_count:0,alac_encode_count:0,reused_verified_audio:true};
 for(const [p,expected] of [[report.audio.source,report.audio.expected_sha256],[report.audio.reference,report.audio.reference_sha256],[report.audio.encoded_once,report.audio.encoded_file_sha256]])if(await hash(p)!==expected)throw Error('Prior audio changed: '+p);
 const previous=read('exports/warning-v4-hires/verification.json');if(!previous.passed)throw Error('V4 warning not verified.');
 const old=previous.items.find(x=>x.key==='4k60');if(!old||await hash(old.output)!==old.sha256)throw Error('Preserved V4 source changed.');
 report.prefix_source=old.output;report.prefix_source_sha256=old.sha256;report.phase='rendering';save();
 const renderPart=async p=>{
  const receiptFile=p.file+'.receipt.json';let receipt=fs.existsSync(receiptFile)?read(receiptFile):null;
  if(receipt?.fingerprint===report.fingerprint&&fs.existsSync(p.file)&&await hash(p.file)===receipt.sha256){p.reused_validated_part=true;p.sha256=receipt.sha256;console.log(`[part-${p.index}] reuse unchanged native part`);return;}
  await run(process.execPath,['tools/render/export_sample.mjs','--entry','src/mv5/index.html','--width','3840','--height','2160','--fps','60','--start-frame',String(p.first),'--end-frame',String(p.last),'--video-only','true','--transport','png','--codec','h264_nvenc','--quality','19','--ffmpeg',FF,'--out',p.file],`part-${p.index}`);
  const result=read(p.file.replace(/\.mp4$/,'.render.json'));
  if(result.entry!=='src/mv5/index.html'||!result.video_only||result.width!==3840||result.height!==2160||result.fps!==60||result.encoded_input_frames!==p.last-p.first||result.codec!=='h264_nvenc')throw Error('Invalid part report '+p.index);
  p.render_report=result;p.sha256=await hash(p.file);fs.writeFileSync(receiptFile,JSON.stringify({fingerprint:report.fingerprint,sha256:p.sha256,first:p.first,last:p.last},null,2));
 };
 // Keep two isolated browsers in flight on this 16 GiB host; never close the
 // user's apps to make room for an export. Every original is still loaded.
 let nextPart=0;const results=[];
 await Promise.all(Array.from({length:2},async()=>{while(nextPart<parts.length){const p=parts[nextPart++];try{await renderPart(p);results.push({status:'fulfilled'});}catch(reason){results.push({status:'rejected',reason});}}}));
 const failures=results.filter(r=>r.status==='rejected');if(failures.length)throw Error(failures.map(r=>r.reason.message).join('\n'));
 report.render_elapsed_seconds=(Date.now()-started)/1000;report.phase='packaging';save();
 const bodyList=path.join(CACHE,'body.ffconcat');fs.writeFileSync(bodyList,'ffconcat version 1.0\n'+parts.map(p=>`file '${path.basename(p.file)}'\nduration ${((p.last-p.first)/60).toFixed(9)}\n`).join(''));
 await run(FF,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',bodyList,'-map','0:v:0','-c:v','copy','-an','-frames:v','13100','-t','218.333333333','-video_track_timescale','60000',BODY],'concat-body');
 await run(FF,['-hide_banner','-loglevel','warning','-y','-i',old.output,'-map','0:v:0','-c:v','copy','-an','-frames:v','300','-video_track_timescale','60000',PREFIX],'extract-verified-warning');
 const finalList=path.join(CACHE,'final.ffconcat');fs.writeFileSync(finalList,`ffconcat version 1.0\nfile '${path.basename(PREFIX)}'\nduration 5.000000000\nfile '${path.basename(BODY)}'\nduration 218.333333333\n`);
 await run(FF,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',finalList,'-i',report.audio.encoded_once,'-map','0:v:0','-map','1:a:0','-c','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-metadata','title=ASTRA - world.execute(me); - Final','-metadata','comment=Native 4K60; 5s purple warning; original music; 6s quiet co-drawing coda; user FLAC preserved as 192kHz 24bit ALAC; no resampling or lossy audio encoding','-movflags','+faststart',OUT],'mux-hires');
 report.body_sha256=await hash(BODY);report.output_sha256=await hash(OUT);report.output_bytes=fs.statSync(OUT).size;report.phase='verifying';save();
 await run(PY,['tools/render/verify_final_v5.py'],'independent-verification');
 const verification=read('exports/final-v5/verification.json');if(!verification.passed)throw Error('Independent final verification failed.');
 for(const f of report.input_hashes)if(await hash(path.join(ROOT,f.path))!==f.sha256)throw Error('Source changed during export: '+f.path);
 report.passed=true;report.phase='complete';report.verification_report='exports/final-v5/verification.json';report.finished_at=new Date().toISOString();report.elapsed_seconds=(Date.now()-started)/1000;save();
 console.log(JSON.stringify({passed:true,output:OUT,bytes:report.output_bytes,sha256:report.output_sha256,frames:13400,fps:60,duration:13400/60,audio:'ALAC 192kHz / 24bit / stereo'},null,2));
}catch(error){report.phase='failed';report.error=error.stack;report.elapsed_seconds=(Date.now()-started)/1000;save();throw error;}
