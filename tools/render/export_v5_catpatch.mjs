/** v5.1: replace only part 2 pictures; preserve original ALAC and all v5 inputs. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright-core';
import {compareCatRenderer} from './v5_catpatch_contract.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const WORK=path.join(ROOT,'exports/final-v5.1-cat'),CACHE=path.join(ROOT,'.cache/full-export-v5.1-cat/3840x2160');
const OUT=path.join(ROOT,'exports/astra-world-execute-me-final-v5.1-cat-warning-hires-4k60.mp4');
const FF=path.join(ROOT,'.cache/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const PY='C:/Users/auscar/miniconda3/python.exe',ENTRY='src/mv5cat/index.html';
const args=process.argv.slice(2),param=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const execute=args.includes('--execute'),qaPath=param('--qa',null);
const read=p=>JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));
const hash=async p=>{const h=createHash('sha256');for await(const b of fs.createReadStream(path.resolve(ROOT,p)))h.update(b);return h.digest('hex');};
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(WORK,{recursive:true});fs.mkdirSync(CACHE,{recursive:true});
const save=(name,data)=>fs.writeFileSync(path.join(WORK,name),JSON.stringify(data,null,2)+'\n');
function run(command,argv,label){return new Promise((resolve,reject)=>{save(label+'.command.json',{command,args:argv});const log=fs.createWriteStream(path.join(WORK,label+'.log'));let tail='';const p=spawn(command,argv,{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});const take=b=>{log.write(b);tail=(tail+b).slice(-8000);process.stdout.write(`[${label}] ${b}`);};p.stdout.on('data',take);p.stderr.on('data',take);p.on('error',reject);p.on('close',c=>log.end(()=>c?reject(Error(label+' '+c+' '+tail)):resolve()));});}
const original=read('exports/final-v5/render.json'),originalVerify=read('exports/final-v5/verification.json');
const report={version:'final-v5.1-cat',passed:false,phase:'preflight',started_at:new Date().toISOString(),output:OUT,original:original.output,original_sha256:original.output_sha256,width:3840,height:2160,fps:60,frames:13400,body_frames:13100,warning_frames:300,duration_seconds:13400/60,body:path.join(CACHE,'body-video-only.mp4'),audio:{...original.audio,production_decode_count:0,alac_encode_count:0,reused_verified_audio:true},new_1080p_outputs:0,audio_encode_count:0};
const started=Date.now();
async function unchanged(){for(const f of original.input_hashes)if(await hash(f.path)!==f.sha256)throw Error('Original v5 source changed: '+f.path);if(await hash(original.output)!==original.output_sha256)throw Error('Original v5 MP4 changed');for(const p of original.parts)if(await hash(p.file)!==p.sha256)throw Error('Original frozen part changed: '+p.file);}
async function compareCanvas(){
 const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.m4a':'audio/mp4'};
 const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(500);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const frames=[3300,4000,4916,5125,5700,6599],states={};
 try{browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  for(const variant of ['mv5','mv5cat']){const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${server.address().port}/src/${variant}/index.html?w=3840&h=2160&artPreview=1`);await page.evaluate(()=>window.sample.ready);states[variant]=[];
   for(const frame of frames){const value=await page.evaluate(async f=>{await window.sample.renderFrame(f/60);const c=window.sample.canvas;return {width:c.width,height:c.height,png:c.toDataURL('image/png').split(',')[1]};},frame);if(value.width!==3840||value.height!==2160)throw Error('Comparison canvas was not native 4K');states[variant].push({frame,png_sha256:sha(Buffer.from(value.png,'base64'))});}if(errors.length)throw Error(errors.join('\n'));await page.close();}
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
 const comparisons=states.mv5.map((a,i)=>({...a,patch_png_sha256:states.mv5cat[i].png_sha256,identical:a.png_sha256===states.mv5cat[i].png_sha256}));const result={passed:comparisons.every(x=>x.identical),scope:'Exact native 4K Canvas PNG SHA256 at six unaffected body frames within re-rendered part 2; production source and every unrelated manifest entry compared separately.',comparisons};save('unaffected-canvas-comparison.json',result);if(!result.passed)throw Error('An unaffected scene differs');return result;
}
try{
 if(!original.passed||!originalVerify.passed)throw Error('Original v5 was not verified');await unchanged();
 const oldManifest=read('assets/astra/v09/manifest.json'),man=read('assets/astra/v12-approved-cat/manifest.json');
 const names=Object.keys(oldManifest.assets),changed=names.filter(n=>JSON.stringify(oldManifest.assets[n])!==JSON.stringify(man.assets[n]));
 if(JSON.stringify(Object.keys(man.assets))!==JSON.stringify(names)||JSON.stringify(changed.sort())!==JSON.stringify(['A19_01','A19_02','A19_03']))throw Error('Patch must change exactly the three A19 manifest entries');
 for(const n of changed)if(man.assets[n].faceTreatment!=='shadow'||!man.assets[n].path.startsWith('/assets/astra/v12-approved-cat/'))throw Error('Expected approved-source shadow-face cat pose '+n);
 const files=fs.readdirSync(path.join(ROOT,'src/mv5')).filter(n=>/\.(js|html)$/.test(n));report.source_comparison=[];
 for(const name of files){const old=fs.readFileSync(path.join(ROOT,'src/mv5',name),'utf8'),current=fs.readFileSync(path.join(ROOT,'src/mv5cat',name),'utf8');report.source_comparison.push(compareCatRenderer(name,old,current));}
 report.lyric_phase_cuts={shot:'R30',body_source_frames:[4965,5051],full_video_frames:[5265,5351],numerical_tolerance_u:1e-10};
 report.changed_assets=changed;report.input_hashes=[];
 for(const p of [...files.map(n=>'src/mv5cat/'+n),'assets/astra/v12-approved-cat/manifest.json',...Object.values(man.assets).map(a=>a.path.slice(1))].sort())report.input_hashes.push({path:p,sha256:await hash(p)});
 report.fingerprint=sha(JSON.stringify(report.input_hashes));
 if(!qaPath)throw Error('A completed passing cat scene QA report is required via --qa');
 const qa=read(qaPath);
 if(!qa.passed||qa.width!==3840||qa.height!==2160||qa.fingerprint!==report.fingerprint)throw Error('Cat scene QA must pass at native 4K and match all current patch inputs');
 report.cat_qa={path:qaPath,sha256:await hash(qaPath),fingerprint:qa.fingerprint};
 report.unaffected_canvas=await compareCanvas();report.preflight_passed=true;save('render.json',report);
 console.log('[catpatch preflight] Original v5 preserved; only A19 source entries changed; 6 unaffected native 4K frames identical');
 if(!execute){console.log('Preflight only. Add --execute after inspecting the QA stills.');process.exit(0);}
 const replacement={index:2,first:3300,last:6600,file:path.join(CACHE,'part-2.mp4')};report.parts=original.parts.map(p=>p.index===2?replacement:{...p,reused_from_verified_v5:true});report.phase='rendering';save('render.json',report);
 const receiptFile=replacement.file+'.receipt.json';const receipt=fs.existsSync(receiptFile)?read(receiptFile):null;
 if(receipt?.fingerprint===report.fingerprint&&fs.existsSync(replacement.file)&&await hash(replacement.file)===receipt.sha256){replacement.sha256=receipt.sha256;replacement.reused_matching_patch=true;}else{
  await run(process.execPath,['tools/render/export_sample.mjs','--entry',ENTRY,'--width','3840','--height','2160','--fps','60','--start-frame','3300','--end-frame','6600','--video-only','true','--transport','png','--codec','h264_nvenc','--quality','19','--ffmpeg',FF,'--out',replacement.file],'part-2');
  replacement.render_report=read(replacement.file.replace(/\.mp4$/,'.render.json'));if(replacement.render_report.encoded_input_frames!==3300||replacement.render_report.entry!==ENTRY||!replacement.render_report.video_only)throw Error('Bad replacement part');replacement.sha256=await hash(replacement.file);save('part-2-receipt.json',{fingerprint:report.fingerprint,sha256:replacement.sha256});fs.writeFileSync(receiptFile,JSON.stringify({fingerprint:report.fingerprint,sha256:replacement.sha256},null,2));
 }
 await unchanged();for(const f of report.input_hashes)if(await hash(f.path)!==f.sha256)throw Error('Patch input changed while rendering: '+f.path);
 report.phase='packaging';save('render.json',report);
 const bodyList=path.join(CACHE,'body.ffconcat');fs.writeFileSync(bodyList,'ffconcat version 1.0\n'+report.parts.map(p=>`file '${p.file.replaceAll('\\','/')}'\nduration ${((p.last-p.first)/60).toFixed(9)}\n`).join(''));
 await run(FF,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','0','-auto_convert','0','-i',bodyList,'-map','0:v:0','-c:v','copy','-an','-frames:v','13100','-t','218.333333333','-video_track_timescale','60000',report.body],'concat-body');
 const prefix=path.join(CACHE,'purple-warning-300.mp4');await run(FF,['-hide_banner','-loglevel','warning','-y','-i',original.output,'-map','0:v:0','-c:v','copy','-an','-frames:v','300','-video_track_timescale','60000',prefix],'copy-warning');
 const finalList=path.join(CACHE,'final.ffconcat');fs.writeFileSync(finalList,`ffconcat version 1.0\nfile '${path.basename(prefix)}'\nduration 5.000000000\nfile '${path.basename(report.body)}'\nduration 218.333333333\n`);
 await run(FF,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','1','-auto_convert','0','-i',finalList,'-i',original.output,'-map','0:v:0','-map','1:a:0','-c','copy','-frames:v','13400','-t','223.333333333','-video_track_timescale','60000','-metadata','title=ASTRA - world.execute(me); - Final v5.1 cat ears','-metadata','comment=Native 4K60; three A19 cat-ear poses corrected; original v5 ALAC audio copied unchanged; no audio encoding','-movflags','+faststart',OUT],'mux-original-alac');
 report.output_sha256=await hash(OUT);report.output_bytes=fs.statSync(OUT).size;report.body_sha256=await hash(report.body);report.phase='verifying';save('render.json',report);
 await run(PY,['tools/render/verify_v5_catpatch.py'],'verify');if(!read('exports/final-v5.1-cat/verification.json').passed)throw Error('Final catpatch verification failed');await unchanged();for(const f of report.input_hashes)if(await hash(f.path)!==f.sha256)throw Error('Patch source changed during final verification');
 report.passed=true;report.phase='complete';report.finished_at=new Date().toISOString();report.elapsed_seconds=(Date.now()-started)/1000;save('render.json',report);console.log(JSON.stringify({passed:true,output:OUT,bytes:report.output_bytes,sha256:report.output_sha256},null,2));
}catch(error){report.phase='failed';report.error=error.stack;save('render.json',report);throw error;}
